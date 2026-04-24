"""
inferencia.py

Inferencia en vivo con camara. Reconoce senias estaticas y dinamicas usando
el Transformer entrenado por entrenar.py.

Pipeline por frame:
    1. OpenCV captura + flip selfie.
    2. MediaPipe extrae landmarks + world_landmarks.
    3. Se construye el vector de features estaticos (190) y se guarda en un
       buffer circular de hasta MAX_SEQ_LEN frames.
    4. Cuando el modelo se ejecuta se derivan velocidades y aceleraciones
       sobre el buffer, se concatena a [T, 442], se padea, y se pasa al modelo.

Maquina de estados:
    IDLE        -> esperando que aparezca mano.
    DETECTANDO  -> hay mano, se acumulan frames y cada INFER_CADA_FRAMES
                   se corre el modelo con Test-Time Augmentation.
    COMMIT      -> se muestra la prediccion ganadora durante
                   MS_MOSTRAR_COMMIT ms antes de volver a IDLE.

Transiciones:
    IDLE -> DETECTANDO: hand_present y cooldown pasado.
    DETECTANDO -> COMMIT: movimiento promedio cae por MS_QUIETUD_FIN_SENIA
                  y la prediccion es estable (misma clase en las ultimas
                  VENTANA_SMOOTHING pasadas) y conf >= UMBRAL_CONF.
    DETECTANDO -> IDLE: mano desaparecida por mucho tiempo sin prediccion
                  estable.
    COMMIT -> IDLE: cuando expira MS_MOSTRAR_COMMIT.

Controles:
    ESC   salir
    R     resetear buffer y estado (util si se queda atascado)
"""
from __future__ import annotations

import sys
import time
import json
from collections import deque, Counter
from pathlib import Path

import cv2
import numpy as np
import torch

from comun import (
    MAX_SEQ_LEN, FEAT_DYNAMIC_PER_FRAME,
    UMBRAL_MOVIMIENTO,
    PATH_MODELO, PATH_LABEL_MAP, PATH_FEATURE_META,
    crear_hands, extraer_manos, movimiento_global,
    features_frame, solo_coords_del_frame,
    velocidades, aceleraciones,
    ahora_ms,
)
from entrenar import SignTransformer


# ============================================================================
# CONFIG
# ============================================================================

ANCHO_CAM = 1280
ALTO_CAM = 720
VENTANA = "SignAI - Inferencia"

COLOR_VERDE = (0, 220, 0)
COLOR_ROJO = (0, 40, 220)
COLOR_AMARILLO = (0, 220, 220)
COLOR_BLANCO = (240, 240, 240)
COLOR_NEGRO = (20, 20, 20)
COLOR_CIAN = (255, 220, 0)

UMBRAL_CONF = 0.70           # probabilidad minima para commit
VENTANA_SMOOTHING = 3        # predicciones consecutivas para considerar "estable"
N_TTA = 4                    # pasadas de test-time augmentation (1a sin ruido)
NOISE_TTA = 0.005            # std del ruido para TTA
MIN_FRAMES_INFER = 10        # minimo de frames en buffer para inferir
INFER_CADA_FRAMES = 3        # correr modelo cada N frames para live feedback
MS_QUIETUD_FIN_SENIA = 400   # ms de quietud para considerar fin de senia
MS_COOLDOWN = 300            # bloqueo tras commit antes de reengar
MS_MOSTRAR_COMMIT = 2000     # tiempo que se muestra el resultado
HAND_GONE_MS_RESET = 1500    # si no hay mano por este tiempo se resetea

IDLE = "IDLE"
DETECTANDO = "DETECTANDO"
COMMIT = "COMMIT"


# ============================================================================
# INPUT
# ============================================================================

def pedir_num_manos():
    while True:
        raw = input("Numero de manos para inferencia (1 o 2): ").strip()
        if raw in ("1", "2"):
            return int(raw)
        print("Debe ser 1 o 2.")


# ============================================================================
# CARGA DE MODELO
# ============================================================================

def cargar_modelo(device):
    if not PATH_MODELO.exists():
        print(f"ERROR: no se encontro {PATH_MODELO}. Corre antes entrenar.py")
        sys.exit(1)
    if not PATH_LABEL_MAP.exists():
        print(f"ERROR: no se encontro {PATH_LABEL_MAP}")
        sys.exit(1)
    if not PATH_FEATURE_META.exists():
        print(f"ERROR: no se encontro {PATH_FEATURE_META}")
        sys.exit(1)

    with open(PATH_LABEL_MAP, "r", encoding="utf-8") as f:
        label_map = json.load(f)
    clases = label_map["classes"]

    with open(PATH_FEATURE_META, "r", encoding="utf-8") as f:
        meta = json.load(f)

    model = SignTransformer(
        input_dim=meta["input_dim"],
        num_classes=meta["num_classes"],
        d_model=meta["d_model"],
        nhead=meta["n_heads"],
        num_layers=meta["n_layers"],
        dim_ff=meta["dim_ff"],
        dropout=meta["dropout"],
        max_len=meta["max_seq_len"],
    ).to(device)

    state = torch.load(PATH_MODELO, map_location=device)
    model.load_state_dict(state)
    model.eval()
    return model, clases, meta


# ============================================================================
# CONSTRUCCION DE TENSOR PARA EL MODELO
# ============================================================================

def construir_tensor(buffer_frames_static):
    """
    buffer_frames_static: list/deque de vectores [190] (features estaticos por frame).
    Devuelve (X [MAX_SEQ_LEN, 442], mask [MAX_SEQ_LEN]).
    """
    T_real = len(buffer_frames_static)
    if T_real == 0:
        return None, None

    estaticos = np.stack(buffer_frames_static, axis=0)             # [T, 190]
    coords = np.stack(
        [solo_coords_del_frame(f) for f in buffer_frames_static], axis=0
    )                                                               # [T, 126]
    vel = velocidades(coords)
    acc = aceleraciones(vel)
    X = np.concatenate([estaticos, vel, acc], axis=1).astype(np.float32)  # [T, 442]

    if X.shape[0] < MAX_SEQ_LEN:
        pad = np.zeros((MAX_SEQ_LEN - X.shape[0], X.shape[1]), dtype=np.float32)
        X = np.concatenate([X, pad], axis=0)
        m = np.concatenate([
            np.ones(T_real, dtype=np.float32),
            np.zeros(MAX_SEQ_LEN - T_real, dtype=np.float32),
        ])
    elif X.shape[0] > MAX_SEQ_LEN:
        idx = np.linspace(0, X.shape[0] - 1, num=MAX_SEQ_LEN).round().astype(int)
        X = X[idx]
        m = np.ones(MAX_SEQ_LEN, dtype=np.float32)
    else:
        m = np.ones(MAX_SEQ_LEN, dtype=np.float32)

    return X, m


# ============================================================================
# INFERENCIA CON TTA
# ============================================================================

@torch.no_grad()
def inferir_tta(model, X, mask, device, n_tta=N_TTA, noise_std=NOISE_TTA):
    X_t = torch.from_numpy(X).unsqueeze(0).to(device)       # [1, T, F]
    M_t = torch.from_numpy(mask).unsqueeze(0).to(device)    # [1, T]

    logits = model(X_t, M_t)
    probs = torch.softmax(logits, dim=1)

    for _ in range(max(0, n_tta - 1)):
        noise = torch.randn_like(X_t) * noise_std
        noise = noise * M_t.unsqueeze(-1)
        logits_aug = model(X_t + noise, M_t)
        probs = probs + torch.softmax(logits_aug, dim=1)

    probs = probs / max(1, n_tta)
    conf, pred = torch.max(probs, dim=1)
    return int(pred.item()), float(conf.item()), probs[0].cpu().numpy()


# ============================================================================
# DIBUJADO
# ============================================================================

CONEXIONES = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (17, 18), (18, 19), (19, 20), (0, 17),
]


def dibujar_landmarks(frame, manos):
    h, w, _ = frame.shape
    for lado in ("Right", "Left"):
        if manos.get(lado) is None:
            continue
        pts = manos[lado]["image"]
        color = (0, 255, 0) if lado == "Right" else (255, 80, 80)
        for i, j in CONEXIONES:
            a = (int(pts[i][0] * w), int(pts[i][1] * h))
            b = (int(pts[j][0] * w), int(pts[j][1] * h))
            cv2.line(frame, a, b, color, 2)
        for p in pts:
            cv2.circle(frame, (int(p[0] * w), int(p[1] * h)), 3, color, -1)


def dibujar_hud(frame, estado, pred_txt, conf, num_manos, buffer_len, fps, top3):
    h, w, _ = frame.shape

    # Franja superior
    cv2.rectangle(frame, (0, 0), (w, 70), COLOR_NEGRO, -1)
    color_estado = {IDLE: COLOR_BLANCO,
                    DETECTANDO: COLOR_AMARILLO,
                    COMMIT: COLOR_VERDE}.get(estado, COLOR_BLANCO)
    cv2.putText(frame, f"Estado: {estado}", (20, 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.85, color_estado, 2)
    cv2.putText(frame, f"Manos: {num_manos}   Buffer: {buffer_len}/{MAX_SEQ_LEN}",
                (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_BLANCO, 1)
    cv2.putText(frame, f"{fps:5.1f} FPS", (w - 150, 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, COLOR_BLANCO, 1)

    # Prediccion en vivo (parte derecha)
    if estado == DETECTANDO and pred_txt:
        cv2.putText(frame, f"> {pred_txt}  ({conf*100:.0f}%)",
                    (w - 400, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    COLOR_CIAN, 2)

    # Top-3 en esquina
    if top3 is not None:
        y = 110
        for (nombre, p) in top3:
            cv2.putText(frame, f"{nombre:12s} {p*100:5.1f}%", (20, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_BLANCO, 1)
            y += 22

    # Franja inferior
    cv2.rectangle(frame, (0, h - 40), (w, h), COLOR_NEGRO, -1)
    cv2.putText(frame, "[ESC] Salir   [R] Resetear",
                (20, h - 13), cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_BLANCO, 1)


def dibujar_commit_grande(frame, texto, conf):
    h, w, _ = frame.shape

    overlay = frame.copy()
    cv2.rectangle(overlay, (0, h // 2 - 120), (w, h // 2 + 120), COLOR_NEGRO, -1)
    cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)

    (tw, th), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, 3.5, 6)
    x = (w - tw) // 2
    y = h // 2 + th // 2
    cv2.putText(frame, texto, (x, y),
                cv2.FONT_HERSHEY_SIMPLEX, 3.5, COLOR_VERDE, 6, cv2.LINE_AA)

    barra_w = 400
    barra_h = 18
    bx = (w - barra_w) // 2
    by = h // 2 + 90
    cv2.rectangle(frame, (bx, by), (bx + barra_w, by + barra_h), COLOR_BLANCO, 1)
    relleno = int(barra_w * conf)
    cv2.rectangle(frame, (bx, by), (bx + relleno, by + barra_h), COLOR_VERDE, -1)
    cv2.putText(frame, f"Confianza {conf*100:.1f}%",
                (bx, by + barra_h + 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_BLANCO, 1)


# ============================================================================
# UTILIDADES DE ESTADO
# ============================================================================

def prediccion_estable(pred_history, ventana=VENTANA_SMOOTHING, tolerancia=1):
    """True si las ultimas N predicciones coinciden (permite hasta `tolerancia` distintas)."""
    if len(pred_history) < ventana:
        return False, None, 0.0
    ultimos = list(pred_history)[-ventana:]
    preds = [p for p, _ in ultimos]
    confs = [c for _, c in ultimos]
    cnt = Counter(preds)
    pred_moda, veces = cnt.most_common(1)[0]
    if veces >= ventana - tolerancia:
        conf_media = float(np.mean([c for p, c in ultimos if p == pred_moda]))
        return True, pred_moda, conf_media
    return False, pred_moda, float(np.mean(confs))


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 64)
    print("SignAI - Inferencia en vivo")
    print("=" * 64)

    num_manos = pedir_num_manos()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Dispositivo: {device}")

    model, clases, meta = cargar_modelo(device)
    print(f"Clases ({len(clases)}): {clases}")
    print(f"Arquitectura: d_model={meta['d_model']} layers={meta['n_layers']} heads={meta['n_heads']}")

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, ANCHO_CAM)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, ALTO_CAM)
    if not cap.isOpened():
        print("ERROR: no se pudo abrir la camara.")
        sys.exit(1)

    cv2.namedWindow(VENTANA, cv2.WINDOW_NORMAL)
    hands = crear_hands(num_manos=num_manos, modo_estatico=False)

    # Buffers y estado
    buffer_static = deque(maxlen=MAX_SEQ_LEN)
    pred_history = deque(maxlen=VENTANA_SMOOTHING + 2)
    movement_recent = deque(maxlen=15)

    estado = IDLE
    frame_count = 0
    pts_prev = None
    quietud_inicio_ms = None
    cooldown_until_ms = 0
    commit_until_ms = 0
    texto_commit = ""
    conf_commit = 0.0
    sin_mano_desde_ms = None

    live_pred_txt = ""
    live_pred_conf = 0.0
    live_top3 = None

    # FPS
    fps_ventana = deque(maxlen=30)
    t_inicio_frame = time.time()

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("ERROR: fallo al leer frame.")
                break

            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)
            manos = extraer_manos(results)

            dibujar_landmarks(frame, manos)

            # Features del frame
            r_pts = manos["Right"]["world"] if manos.get("Right") else None
            l_pts = manos["Left"]["world"] if manos.get("Left") else None
            hand_present = (r_pts is not None) or (l_pts is not None)

            feat = features_frame(r_pts, l_pts)

            # Movimiento vs frame anterior
            pts_act = {"Right": r_pts, "Left": l_pts}
            if pts_prev is not None:
                mov = movimiento_global(pts_prev, pts_act)
            else:
                mov = 0.0
            movement_recent.append(mov)
            pts_prev = pts_act

            ahora = ahora_ms()
            frame_count += 1

            # ========== MAQUINA DE ESTADOS ==========
            if estado == IDLE:
                if hand_present and ahora > cooldown_until_ms:
                    estado = DETECTANDO
                    buffer_static.clear()
                    buffer_static.append(feat)
                    pred_history.clear()
                    quietud_inicio_ms = None
                    sin_mano_desde_ms = None
                    live_pred_txt = ""
                    live_pred_conf = 0.0
                    live_top3 = None

            elif estado == DETECTANDO:
                buffer_static.append(feat)

                # Mano ausente?
                if not hand_present:
                    if sin_mano_desde_ms is None:
                        sin_mano_desde_ms = ahora
                    if ahora - sin_mano_desde_ms > HAND_GONE_MS_RESET:
                        # Se perdio la mano mucho tiempo -> reset
                        estado = IDLE
                        buffer_static.clear()
                        pred_history.clear()
                        live_pred_txt = ""
                        live_top3 = None
                else:
                    sin_mano_desde_ms = None

                # Ejecutar modelo cada N frames (live feedback)
                if (frame_count % INFER_CADA_FRAMES == 0
                        and len(buffer_static) >= MIN_FRAMES_INFER):
                    X, mask = construir_tensor(list(buffer_static))
                    pred_idx, conf, probs = inferir_tta(model, X, mask, device)
                    pred_name = clases[pred_idx]
                    pred_history.append((pred_idx, conf))
                    live_pred_txt = pred_name
                    live_pred_conf = conf
                    # Top-3
                    top_idx = np.argsort(-probs)[:3]
                    live_top3 = [(clases[i], float(probs[i])) for i in top_idx]

                # Detectar fin de senia por quietud
                recent_mov = (sum(movement_recent) / len(movement_recent)
                              if movement_recent else 0.0)
                if recent_mov < UMBRAL_MOVIMIENTO:
                    if quietud_inicio_ms is None:
                        quietud_inicio_ms = ahora
                    ms_quieto = ahora - quietud_inicio_ms
                    if (ms_quieto >= MS_QUIETUD_FIN_SENIA
                            and len(buffer_static) >= MIN_FRAMES_INFER):
                        # Intento de commit. Una inferencia final para asegurar.
                        X, mask = construir_tensor(list(buffer_static))
                        pred_idx, conf, probs = inferir_tta(model, X, mask, device)
                        pred_history.append((pred_idx, conf))

                        estable, pred_fin, conf_fin = prediccion_estable(pred_history)
                        if estable and conf_fin >= UMBRAL_CONF:
                            texto_commit = clases[pred_fin]
                            conf_commit = conf_fin
                            commit_until_ms = ahora + MS_MOSTRAR_COMMIT
                            cooldown_until_ms = ahora + MS_COOLDOWN
                            estado = COMMIT
                            buffer_static.clear()
                            pred_history.clear()
                            quietud_inicio_ms = None
                            print(f"-> {texto_commit}  ({conf_commit*100:.1f}%)")
                        else:
                            # No se puede commit con confianza -> reset a IDLE
                            estado = IDLE
                            buffer_static.clear()
                            pred_history.clear()
                            quietud_inicio_ms = None
                            live_pred_txt = ""
                            live_top3 = None
                else:
                    quietud_inicio_ms = None

            elif estado == COMMIT:
                if ahora > commit_until_ms:
                    estado = IDLE
                    texto_commit = ""
                    conf_commit = 0.0

            # ========== RENDERING ==========
            fps_ventana.append(1.0 / max(time.time() - t_inicio_frame, 1e-6))
            fps = sum(fps_ventana) / len(fps_ventana)
            t_inicio_frame = time.time()

            dibujar_hud(frame, estado,
                        live_pred_txt, live_pred_conf,
                        num_manos, len(buffer_static), fps,
                        live_top3)
            if estado == COMMIT:
                dibujar_commit_grande(frame, texto_commit, conf_commit)

            cv2.imshow(VENTANA, frame)

            key = cv2.waitKey(1) & 0xFF
            if key == 27:
                break
            elif key == ord('r') or key == ord('R'):
                estado = IDLE
                buffer_static.clear()
                pred_history.clear()
                quietud_inicio_ms = None
                cooldown_until_ms = 0
                commit_until_ms = 0
                sin_mano_desde_ms = None
                live_pred_txt = ""
                live_pred_conf = 0.0
                live_top3 = None

    finally:
        try:
            hands.close()
        except Exception:
            pass
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
