"""
entrenar.py

Entrena el SignAI Transformer sobre el dataset unificado
(dataset_normalizado/data.npz).

Arquitectura:
    InputProjection: Linear(442 -> 256)
    PositionalEncoding (senos/cosenos, max_len=80)
    TransformerEncoder: 6 capas, d_model=256, nhead=8, dim_ff=1024,
        dropout=0.15, activation=gelu, norm_first=True (pre-LN estable)
    AttentionPool (atencion aprendida sobre el tiempo, respeta mask)
    Linear(256 -> num_clases)

Training:
    - Split por session_id (80/20) para que la val_acc sea honesta.
    - WeightedRandomSampler con pesos por clase (balance automatico).
    - CrossEntropyLoss con label_smoothing=0.1.
    - AdamW (lr=1e-4, weight_decay=0.01).
    - Warmup lineal 5 epocas + CosineAnnealingLR hasta el final.
    - Gradient clipping (max_norm=1.0).
    - Mixed Precision (torch.cuda.amp) en GPU.
    - torch.compile si esta disponible.
    - Best-checkpoint por val_loss (no val_acc).
    - Early stopping con paciencia configurable.
    - Hard negative mining: cada K epocas las clases con accuracy mas baja
      reciben peso extra en el sampler.
    - Aug pipeline por batch: ruido gaussiano, escala, frame dropout,
      time warping uniforme.

Salidas:
    modelos/signai_transformer.pth    (state_dict del mejor modelo)
    modelos/label_map.json            (lista de clases)
    modelos/feature_meta.json         (hiperparametros para inferencia)
"""
from __future__ import annotations

import sys
import json
import math
import time
import random
from pathlib import Path
from collections import Counter

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler

from comun import (
    DIR_NORMALIZADO, DIR_MODELOS, MAX_SEQ_LEN,
    FEAT_DYNAMIC_PER_FRAME,
    PATH_MODELO, PATH_LABEL_MAP, PATH_FEATURE_META,
)


# ============================================================================
# HIPERPARAMETROS
# ============================================================================

SEED = 42

BATCH_SIZE = 64
EPOCHS = 120
PATIENCE = 20

LR_BASE = 1e-4
LR_MIN = 1e-6
WARMUP_EPOCHS = 5
WEIGHT_DECAY = 0.01
GRAD_CLIP = 1.0
LABEL_SMOOTHING = 0.1

# Transformer
D_MODEL = 256
N_HEADS = 8
N_LAYERS = 6
DIM_FF = 1024
DROPOUT = 0.15

# Hard negative mining
HN_CADA_EPOCAS = 10
HN_UMBRAL_ACC = 0.85        # si val_acc_por_clase < umbral -> peso *= HN_FACTOR
HN_FACTOR = 1.3
HN_PESO_MAX = 5.0

# Augmentations (solo en training)
AUG_NOISE_STD = 0.01
AUG_SCALE_MIN = 0.95
AUG_SCALE_MAX = 1.05
AUG_FRAME_DROPOUT_P = 0.1
AUG_FRAME_DROPOUT_MAX = 0.15   # fraccion maxima de frames a tirar
AUG_TIME_WARP_P = 0.3
AUG_TIME_WARP_MIN = 0.9
AUG_TIME_WARP_MAX = 1.1

VAL_RATIO_SESIONES = 0.20


# ============================================================================
# UTILIDADES DE SEMILLA
# ============================================================================

def fijar_semillas(seed: int = SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


# ============================================================================
# DATASET
# ============================================================================

class SignDataset(Dataset):
    """
    Dataset sobre numpy arrays ya normalizados. Aplica aug solo si train=True.
    """

    def __init__(self, X, mask, y, train=False):
        self.X = X                  # np.float32 [N, T, F]
        self.mask = mask            # np.float32 [N, T]
        self.y = y                  # np.int64 [N]
        self.train = train

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        x = self.X[idx].copy()
        m = self.mask[idx].copy()
        if self.train:
            x, m = self._augmentar(x, m)
        return (
            torch.from_numpy(x).float(),
            torch.from_numpy(m).float(),
            int(self.y[idx]),
        )

    # -- augmentations --
    def _augmentar(self, x: np.ndarray, m: np.ndarray):
        T, F = x.shape

        # 1. Time warping (antes que otros para trabajar sobre la longitud nueva)
        if random.random() < AUG_TIME_WARP_P:
            x, m = self._time_warp(x, m)
            T = x.shape[0]

        # 2. Frame dropout sobre frames validos
        if random.random() < AUG_FRAME_DROPOUT_P:
            validos = np.where(m > 0.5)[0]
            if len(validos) > 4:
                n_drop = max(1, int(len(validos) * random.uniform(0.02, AUG_FRAME_DROPOUT_MAX)))
                idx_drop = np.random.choice(validos, size=n_drop, replace=False)
                x[idx_drop] = 0.0
                # se mantiene mask=1 (el modelo atiende al zero, aprende a ignorar)

        # 3. Escala uniforme
        scale = random.uniform(AUG_SCALE_MIN, AUG_SCALE_MAX)
        x *= scale

        # 4. Ruido gaussiano solo en frames validos
        ruido = np.random.randn(*x.shape).astype(np.float32) * AUG_NOISE_STD
        ruido *= m[:, None]   # no ruidar padding
        x = x + ruido

        return x, m

    def _time_warp(self, x: np.ndarray, m: np.ndarray):
        """Estira o comprime la parte valida y re-padea a MAX_SEQ_LEN."""
        T, F = x.shape
        validos = int(m.sum())
        if validos < 4:
            return x, m
        factor = random.uniform(AUG_TIME_WARP_MIN, AUG_TIME_WARP_MAX)
        nueva = max(4, min(T, int(round(validos * factor))))
        parte = x[:validos]     # [validos, F]
        # Interp lineal a tamano "nueva"
        ejeX = np.linspace(0, validos - 1, num=nueva)
        idx_lo = np.floor(ejeX).astype(int)
        idx_hi = np.clip(idx_lo + 1, 0, validos - 1)
        t = (ejeX - idx_lo)[:, None].astype(np.float32)
        warped = parte[idx_lo] * (1 - t) + parte[idx_hi] * t

        x_new = np.zeros_like(x)
        m_new = np.zeros_like(m)
        x_new[:nueva] = warped
        m_new[:nueva] = 1.0
        return x_new, m_new


# ============================================================================
# SPLIT POR SESSION_ID
# ============================================================================

def split_por_sesion(sessions: np.ndarray, y: np.ndarray, val_ratio: float):
    """
    Asigna sesiones completas a train o val, intentando equilibrar clases.
    Orden:
      1. Agrupar indices por sesion.
      2. Orden aleatorio de sesiones (con seed).
      3. Ir mandando sesiones a val hasta cubrir aproximadamente val_ratio.
    """
    rng = np.random.RandomState(SEED)
    idx_por_ses: dict[str, list[int]] = {}
    for i, s in enumerate(sessions):
        idx_por_ses.setdefault(s, []).append(i)

    sesiones = list(idx_por_ses.keys())
    rng.shuffle(sesiones)

    total = len(sessions)
    meta_val = int(round(total * val_ratio))
    val_idx = []
    train_idx = []

    for s in sesiones:
        ids = idx_por_ses[s]
        if len(val_idx) < meta_val:
            val_idx.extend(ids)
        else:
            train_idx.extend(ids)

    # Fallback: si por casualidad alguna clase se quedo fuera de train/val,
    # pasamos una muestra prestada.
    train_idx = np.array(train_idx, dtype=int)
    val_idx = np.array(val_idx, dtype=int)
    clases_train = set(y[train_idx].tolist()) if len(train_idx) else set()
    clases_val = set(y[val_idx].tolist()) if len(val_idx) else set()
    clases = set(y.tolist())
    for c in clases:
        if c not in clases_train and c in clases_val:
            # prestar una de val a train
            cands = np.where(y[val_idx] == c)[0]
            if len(cands) > 1:
                move = val_idx[cands[0]]
                val_idx = np.delete(val_idx, cands[0])
                train_idx = np.append(train_idx, move)
        if c not in clases_val and c in clases_train:
            cands = np.where(y[train_idx] == c)[0]
            if len(cands) > 1:
                move = train_idx[cands[0]]
                train_idx = np.delete(train_idx, cands[0])
                val_idx = np.append(val_idx, move)

    return train_idx.tolist(), val_idx.tolist()


# ============================================================================
# MODELO
# ============================================================================

class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(0, max_len, dtype=torch.float32).unsqueeze(1)
        div = torch.exp(
            torch.arange(0, d_model, 2, dtype=torch.float32)
            * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("pe", pe, persistent=False)

    def forward(self, x):
        return x + self.pe[: x.size(1)].unsqueeze(0)


class AttentionPool(nn.Module):
    """Pooling temporal con atencion aprendida, respeta mask (1=valido)."""

    def __init__(self, d_model: int):
        super().__init__()
        self.q = nn.Parameter(torch.randn(d_model) * 0.02)
        self.proj = nn.Linear(d_model, d_model)

    def forward(self, x, mask):
        # x: [B, T, d], mask: [B, T]
        scores = torch.matmul(self.proj(x), self.q)          # [B, T]
        scores = scores.masked_fill(mask < 0.5, -1e9)
        w = torch.softmax(scores, dim=1)                      # [B, T]
        pooled = torch.bmm(w.unsqueeze(1), x).squeeze(1)      # [B, d]
        return pooled


class SignTransformer(nn.Module):
    def __init__(
        self,
        input_dim: int,
        num_classes: int,
        d_model: int = D_MODEL,
        nhead: int = N_HEADS,
        num_layers: int = N_LAYERS,
        dim_ff: int = DIM_FF,
        dropout: float = DROPOUT,
        max_len: int = MAX_SEQ_LEN,
    ):
        super().__init__()
        self.input_proj = nn.Linear(input_dim, d_model)
        self.input_norm = nn.LayerNorm(d_model)
        self.pos = PositionalEncoding(d_model, max_len)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=nhead, dim_feedforward=dim_ff,
            dropout=dropout, batch_first=True, activation="gelu",
            norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.pool = AttentionPool(d_model)
        self.head_dropout = nn.Dropout(dropout)
        self.head = nn.Linear(d_model, num_classes)

    def forward(self, x, mask):
        # x: [B, T, F], mask: [B, T] (1 valido, 0 pad)
        x = self.input_proj(x)
        x = self.input_norm(x)
        x = self.pos(x)
        kpm = mask < 0.5
        x = self.encoder(x, src_key_padding_mask=kpm)
        pooled = self.pool(x, mask)
        pooled = self.head_dropout(pooled)
        return self.head(pooled)


# ============================================================================
# SCHEDULER (warmup + cosine)
# ============================================================================

def crear_scheduler(optimizer, total_epochs, warmup_epochs, lr_base, lr_min):
    def lr_lambda(epoch):
        if epoch < warmup_epochs:
            return float(epoch + 1) / float(max(1, warmup_epochs))
        progreso = (epoch - warmup_epochs) / max(1, (total_epochs - warmup_epochs))
        cos = 0.5 * (1 + math.cos(math.pi * progreso))
        lr = lr_min + (lr_base - lr_min) * cos
        return lr / lr_base
    return torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)


# ============================================================================
# METRICAS
# ============================================================================

def accuracy_por_clase(y_true, y_pred, num_classes):
    """Devuelve array [num_classes] con accuracy por clase (nan si sin muestras)."""
    acc = np.full(num_classes, np.nan, dtype=np.float32)
    for c in range(num_classes):
        mask = y_true == c
        n = mask.sum()
        if n > 0:
            acc[c] = (y_pred[mask] == c).sum() / n
    return acc


# ============================================================================
# TRAIN / EVAL
# ============================================================================

def entrenar_epoca(model, loader, optimizer, criterion, scaler, device, use_amp):
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0
    for xb, mb, yb in loader:
        xb = xb.to(device, non_blocking=True)
        mb = mb.to(device, non_blocking=True)
        yb = yb.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)

        if use_amp:
            with torch.cuda.amp.autocast(dtype=torch.float16):
                logits = model(xb, mb)
                loss = criterion(logits, yb)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), GRAD_CLIP)
            scaler.step(optimizer)
            scaler.update()
        else:
            logits = model(xb, mb)
            loss = criterion(logits, yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), GRAD_CLIP)
            optimizer.step()

        total_loss += loss.item() * xb.size(0)
        correct += (logits.argmax(dim=1) == yb).sum().item()
        total += xb.size(0)

    return total_loss / max(1, total), correct / max(1, total)


@torch.no_grad()
def evaluar(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0
    y_true_all = []
    y_pred_all = []
    for xb, mb, yb in loader:
        xb = xb.to(device, non_blocking=True)
        mb = mb.to(device, non_blocking=True)
        yb = yb.to(device, non_blocking=True)
        logits = model(xb, mb)
        loss = criterion(logits, yb)
        preds = logits.argmax(dim=1)
        total_loss += loss.item() * xb.size(0)
        correct += (preds == yb).sum().item()
        total += xb.size(0)
        y_true_all.append(yb.cpu().numpy())
        y_pred_all.append(preds.cpu().numpy())
    y_true = np.concatenate(y_true_all) if y_true_all else np.array([])
    y_pred = np.concatenate(y_pred_all) if y_pred_all else np.array([])
    return total_loss / max(1, total), correct / max(1, total), y_true, y_pred


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 64)
    print("SignAI - Entrenamiento del Transformer")
    print("=" * 64)

    fijar_semillas(SEED)

    path_npz = DIR_NORMALIZADO / "data.npz"
    if not path_npz.exists():
        print(f"ERROR: no se encontro {path_npz}. Corre antes normalizar.py")
        sys.exit(1)

    print(f"Cargando {path_npz}...")
    data = np.load(path_npz, allow_pickle=True)
    X = data["X"]                   # [N, T, F]
    mask = data["mask"]             # [N, T]
    y = data["y"].astype(np.int64)  # [N]
    sessions = data["sessions"]
    clases = data["clases"].tolist()
    num_classes = len(clases)

    print(f"Muestras: {X.shape[0]}   Clases: {num_classes}   T={X.shape[1]}   F={X.shape[2]}")
    if X.shape[2] != FEAT_DYNAMIC_PER_FRAME:
        print(f"ADVERTENCIA: F esperada {FEAT_DYNAMIC_PER_FRAME}, tengo {X.shape[2]}")

    # Split por sesion
    train_idx, val_idx = split_por_sesion(sessions, y, VAL_RATIO_SESIONES)
    print(f"Split por sesion:  train={len(train_idx)}   val={len(val_idx)}")

    X_tr = X[train_idx]; m_tr = mask[train_idx]; y_tr = y[train_idx]
    X_va = X[val_idx];   m_va = mask[val_idx];   y_va = y[val_idx]

    cuenta_tr = Counter(y_tr.tolist())
    print("Distribucion train por clase:", dict(Counter(y_tr.tolist())))

    train_ds = SignDataset(X_tr, m_tr, y_tr, train=True)
    val_ds = SignDataset(X_va, m_va, y_va, train=False)

    # Pesos por clase para balance (hard negative mining los ajusta despues)
    pesos_clase = np.ones(num_classes, dtype=np.float64)
    freq = np.array([max(1, cuenta_tr.get(c, 1)) for c in range(num_classes)],
                    dtype=np.float64)
    inv_freq = 1.0 / freq
    inv_freq = inv_freq / inv_freq.mean()   # normalizar alrededor de 1
    pesos_clase *= inv_freq

    def construir_sampler(pesos_por_clase):
        pesos_muestra = np.array([pesos_por_clase[c] for c in y_tr], dtype=np.float64)
        return WeightedRandomSampler(
            weights=pesos_muestra, num_samples=len(y_tr), replacement=True
        )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    use_amp = device.type == "cuda"
    print(f"Dispositivo: {device}   AMP: {use_amp}")

    pin = (device.type == "cuda")
    train_loader = DataLoader(
        train_ds, batch_size=BATCH_SIZE,
        sampler=construir_sampler(pesos_clase),
        num_workers=0 if sys.platform == "win32" else 4,
        pin_memory=pin, persistent_workers=False,
    )
    val_loader = DataLoader(
        val_ds, batch_size=BATCH_SIZE, shuffle=False,
        num_workers=0 if sys.platform == "win32" else 4,
        pin_memory=pin,
    )

    model = SignTransformer(
        input_dim=X.shape[2], num_classes=num_classes,
    ).to(device)

    # torch.compile si esta disponible
    try:
        if hasattr(torch, "compile") and device.type == "cuda":
            model = torch.compile(model, mode="default")
            print("torch.compile activado")
    except Exception as e:
        print(f"torch.compile no disponible: {e}")

    total_params = sum(p.numel() for p in model.parameters())
    print(f"Parametros: {total_params/1e6:.2f}M")

    criterion = nn.CrossEntropyLoss(label_smoothing=LABEL_SMOOTHING)
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=LR_BASE, weight_decay=WEIGHT_DECAY
    )
    scheduler = crear_scheduler(optimizer, EPOCHS, WARMUP_EPOCHS, LR_BASE, LR_MIN)
    scaler = torch.cuda.amp.GradScaler(enabled=use_amp)

    DIR_MODELOS.mkdir(parents=True, exist_ok=True)

    best_val_loss = float("inf")
    best_val_acc = 0.0
    epocas_sin_mejora = 0

    t0 = time.time()
    for epoca in range(1, EPOCHS + 1):
        tr_loss, tr_acc = entrenar_epoca(
            model, train_loader, optimizer, criterion, scaler, device, use_amp
        )
        va_loss, va_acc, y_true, y_pred = evaluar(
            model, val_loader, criterion, device
        )
        scheduler.step()

        lr_actual = optimizer.param_groups[0]["lr"]
        print(
            f"Ep {epoca:03d}/{EPOCHS}  "
            f"lr={lr_actual:.1e}  "
            f"tr_loss={tr_loss:.4f}  tr_acc={tr_acc*100:5.1f}%  "
            f"va_loss={va_loss:.4f}  va_acc={va_acc*100:5.1f}%"
        )

        mejoro = False
        if va_loss < best_val_loss:
            best_val_loss = va_loss
            best_val_acc = va_acc
            mejoro = True
            epocas_sin_mejora = 0
            # Guardar
            state = (model._orig_mod.state_dict()
                     if hasattr(model, "_orig_mod")
                     else model.state_dict())
            torch.save(state, PATH_MODELO)
            with open(PATH_LABEL_MAP, "w", encoding="utf-8") as f:
                json.dump({"classes": clases}, f, indent=2, ensure_ascii=False)
            with open(PATH_FEATURE_META, "w", encoding="utf-8") as f:
                json.dump({
                    "input_dim": int(X.shape[2]),
                    "num_classes": int(num_classes),
                    "d_model": D_MODEL,
                    "n_heads": N_HEADS,
                    "n_layers": N_LAYERS,
                    "dim_ff": DIM_FF,
                    "dropout": DROPOUT,
                    "max_seq_len": MAX_SEQ_LEN,
                    "best_val_loss": float(va_loss),
                    "best_val_acc": float(va_acc),
                    "epoca": int(epoca),
                }, f, indent=2, ensure_ascii=False)
        else:
            epocas_sin_mejora += 1

        # Hard negative mining periodico
        if epoca % HN_CADA_EPOCAS == 0 and y_true.size > 0:
            accs = accuracy_por_clase(y_true, y_pred, num_classes)
            cambios = []
            for c in range(num_classes):
                if not np.isnan(accs[c]) and accs[c] < HN_UMBRAL_ACC:
                    nuevo = min(pesos_clase[c] * HN_FACTOR, HN_PESO_MAX)
                    if abs(nuevo - pesos_clase[c]) > 1e-6:
                        cambios.append((clases[c], accs[c], pesos_clase[c], nuevo))
                        pesos_clase[c] = nuevo
            if cambios:
                print(f"  [HN] upweight {len(cambios)} clase(s):")
                for nom, acc, w_old, w_new in cambios[:5]:
                    print(f"       {nom}: acc={acc*100:.1f}%  peso {w_old:.2f}->{w_new:.2f}")
                # reconstruir sampler
                train_loader = DataLoader(
                    train_ds, batch_size=BATCH_SIZE,
                    sampler=construir_sampler(pesos_clase),
                    num_workers=0 if sys.platform == "win32" else 4,
                    pin_memory=pin,
                )

        # Early stopping
        if epocas_sin_mejora >= PATIENCE:
            print(f"Early stopping (sin mejora en {PATIENCE} epocas)")
            break

        sufijo = " [BEST]" if mejoro else ""
        if mejoro:
            print(f"  -> guardado en {PATH_MODELO}{sufijo}")

    dur = time.time() - t0
    print(f"\nFin. Mejor val_loss={best_val_loss:.4f}  val_acc={best_val_acc*100:.2f}%")
    print(f"Tiempo total: {dur/60:.1f} min")
    print(f"Modelo: {PATH_MODELO}")
    print(f"Label map: {PATH_LABEL_MAP}")
    print(f"Meta: {PATH_FEATURE_META}")


if __name__ == "__main__":
    main()
