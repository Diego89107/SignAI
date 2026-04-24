"""
normalizar.py

Lee los JSONs crudos de dataset_estatico/ y dataset_dinamico/ y produce
un dataset unificado en dataset_normalizado/data.npz listo para entrenar.

Por cada muestra:
    1. Por cada frame se construye el vector [190] de features estaticos
       (63 coords + 9 dist + 3 inter-tips + 15 angulos + 3 normal + hand_type
       + hand_present, por 2 manos), usando world_landmarks cuando estan
       disponibles, con escala = dist(wrist, MIDDLE_MCP).
    2. Se derivan velocidades y aceleraciones de las 63 coords por mano
       entre frames consecutivos (T, 126 cada una).
    3. Se concatena: [T, 190 + 126 + 126] = [T, 442].
    4. Se padea o trunca a MAX_SEQ_LEN.

Se preserva session_id para que el split train/val sea honesto (por sesion,
no por frame individual).

Uso:
    python normalizar.py
"""
from __future__ import annotations

import sys
import json
from pathlib import Path
from collections import Counter, defaultdict

import numpy as np

from comun import (
    DIR_ESTATICO, DIR_DINAMICO, DIR_NORMALIZADO,
    MAX_SEQ_LEN,
    FEAT_STATIC_PER_FRAME, FEAT_DYNAMIC_PER_FRAME,
    FEAT_COORDS, FEAT_PER_HAND,
    features_frame, solo_coords_del_frame,
    velocidades, aceleraciones,
    leer_json,
)


PATH_SALIDA = DIR_NORMALIZADO / "data.npz"
PATH_META = DIR_NORMALIZADO / "meta.json"


# ============================================================================
# CARGA
# ============================================================================

def listar_json(carpeta: Path) -> list[Path]:
    if not carpeta.exists():
        return []
    return sorted(p for p in carpeta.iterdir() if p.suffix == ".json")


def pts_world_o_image(entrada_mano):
    """Devuelve list de tuplas world si existen, si no image. None si la mano es None."""
    if entrada_mano is None:
        return None
    pts = entrada_mano.get("world") or entrada_mano.get("image")
    if pts is None:
        return None
    return [tuple(p) for p in pts]


def muestra_a_matriz(data: dict) -> tuple[np.ndarray, np.ndarray]:
    """
    Convierte una muestra (dict del JSON) en:
      X: np.ndarray [T_real, FEAT_DYNAMIC_PER_FRAME]
      mask: np.ndarray [T_real] (todos 1)
    """
    secuencia = data.get("secuencia") or []
    if not secuencia:
        raise ValueError("secuencia vacia")

    # Paso 1: features estaticos por frame
    estaticos = []
    coords_por_frame = []
    for fr in secuencia:
        right_pts = pts_world_o_image(fr.get("Right"))
        left_pts = pts_world_o_image(fr.get("Left"))
        vec = features_frame(right_pts, left_pts)
        estaticos.append(vec)
        coords_por_frame.append(solo_coords_del_frame(vec))

    estaticos = np.stack(estaticos, axis=0)          # [T, 190]
    coords_arr = np.stack(coords_por_frame, axis=0)  # [T, 126]

    # Paso 2: velocidades y aceleraciones sobre coords
    vel = velocidades(coords_arr)                    # [T, 126]
    acc = aceleraciones(vel)                         # [T, 126]

    # Paso 3: concatenacion
    X = np.concatenate([estaticos, vel, acc], axis=1).astype(np.float32)
    if X.shape[1] != FEAT_DYNAMIC_PER_FRAME:
        raise AssertionError(
            f"shape {X.shape} no coincide con FEAT_DYNAMIC_PER_FRAME={FEAT_DYNAMIC_PER_FRAME}"
        )

    mask = np.ones(X.shape[0], dtype=np.float32)
    return X, mask


def pad_o_truncar(X: np.ndarray, mask: np.ndarray, max_len: int):
    """Pad con ceros o trunca uniformemente al inicio manteniendo los ultimos max_len."""
    T, F = X.shape
    if T == max_len:
        return X, mask
    if T > max_len:
        # Downsample uniforme para preservar la senia completa
        idx = np.linspace(0, T - 1, num=max_len).round().astype(int)
        return X[idx], mask[idx]
    # T < max_len -> padding al final
    pad_T = max_len - T
    X_pad = np.concatenate([X, np.zeros((pad_T, F), dtype=X.dtype)], axis=0)
    mask_pad = np.concatenate([mask, np.zeros(pad_T, dtype=mask.dtype)], axis=0)
    return X_pad, mask_pad


# ============================================================================
# PIPELINE
# ============================================================================

def procesar_carpeta(carpeta: Path, tipo_etiqueta: str, logs: list[str]):
    """
    Devuelve listas paralelas:
      Xs, masks, labels, tipos, sessions, nombres
    """
    Xs, masks, labels, tipos, sessions, nombres = [], [], [], [], [], []
    archivos = listar_json(carpeta)
    if not archivos:
        logs.append(f"[aviso] {carpeta}: sin JSONs")
        return Xs, masks, labels, tipos, sessions, nombres

    for p in archivos:
        try:
            data = leer_json(p)
            gesto = str(data.get("gesto", "")).strip().upper()
            if not gesto:
                logs.append(f"[skip] {p.name}: gesto vacio")
                continue
            X, m = muestra_a_matriz(data)
            X_p, m_p = pad_o_truncar(X, m, MAX_SEQ_LEN)
            Xs.append(X_p)
            masks.append(m_p)
            labels.append(gesto)
            tipos.append(tipo_etiqueta)
            sessions.append(str(data.get("session_id", "")))
            nombres.append(p.name)
        except Exception as e:
            logs.append(f"[error] {p.name}: {e}")
    return Xs, masks, labels, tipos, sessions, nombres


def main():
    print("=" * 64)
    print("SignAI - Normalizacion del dataset")
    print("=" * 64)

    logs: list[str] = []

    Xs_e, masks_e, labels_e, tipos_e, sessions_e, nombres_e = procesar_carpeta(
        DIR_ESTATICO, "estatico", logs
    )
    Xs_d, masks_d, labels_d, tipos_d, sessions_d, nombres_d = procesar_carpeta(
        DIR_DINAMICO, "dinamico", logs
    )

    Xs = Xs_e + Xs_d
    masks = masks_e + masks_d
    labels = labels_e + labels_d
    tipos = tipos_e + tipos_d
    sessions = sessions_e + sessions_d
    nombres = nombres_e + nombres_d

    if not Xs:
        print("ERROR: no hay muestras validas en dataset_estatico/ ni dataset_dinamico/")
        for l in logs:
            print(l)
        sys.exit(1)

    X_all = np.stack(Xs, axis=0).astype(np.float32)           # [N, T, F]
    mask_all = np.stack(masks, axis=0).astype(np.float32)     # [N, T]

    # Construir indice de clases
    clases = sorted(set(labels))
    clase_a_idx = {c: i for i, c in enumerate(clases)}
    y_all = np.array([clase_a_idx[l] for l in labels], dtype=np.int64)

    tipos_arr = np.array(tipos)
    sessions_arr = np.array(sessions)
    nombres_arr = np.array(nombres)

    DIR_NORMALIZADO.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        PATH_SALIDA,
        X=X_all,
        mask=mask_all,
        y=y_all,
        tipos=tipos_arr,
        sessions=sessions_arr,
        nombres=nombres_arr,
        clases=np.array(clases),
    )

    meta = {
        "max_seq_len": int(MAX_SEQ_LEN),
        "feat_per_frame": int(FEAT_DYNAMIC_PER_FRAME),
        "feat_static_per_frame": int(FEAT_STATIC_PER_FRAME),
        "feat_coords": int(FEAT_COORDS),
        "feat_per_hand": int(FEAT_PER_HAND),
        "num_clases": len(clases),
        "clases": clases,
        "total_muestras": int(X_all.shape[0]),
        "muestras_estaticas": int(np.sum(tipos_arr == "estatico")),
        "muestras_dinamicas": int(np.sum(tipos_arr == "dinamico")),
    }
    with open(PATH_META, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)

    # Reporte
    print(f"\nMuestras totales: {X_all.shape[0]}")
    print(f"  Estaticas:  {meta['muestras_estaticas']}")
    print(f"  Dinamicas:  {meta['muestras_dinamicas']}")
    print(f"Clases ({len(clases)}): {clases}")
    print(f"Tensor X: {X_all.shape}  dtype={X_all.dtype}")
    print(f"Tensor mask: {mask_all.shape}")

    conteo_clase = Counter(labels)
    print("\nMuestras por clase:")
    for c in clases:
        est = sum(1 for l, t in zip(labels, tipos) if l == c and t == "estatico")
        din = sum(1 for l, t in zip(labels, tipos) if l == c and t == "dinamico")
        print(f"  {c:20s}  total={conteo_clase[c]:4d}  est={est:3d}  din={din:3d}")

    conteo_ses = Counter(sessions)
    print(f"\nSesiones distintas: {len(conteo_ses)}")
    for s, n in sorted(conteo_ses.items(), key=lambda x: -x[1])[:15]:
        print(f"  {s}: {n}")

    # Avisos / errores
    if logs:
        print("\nAvisos y errores:")
        for l in logs:
            print(" ", l)

    print(f"\nGuardado: {PATH_SALIDA}")
    print(f"Meta:    {PATH_META}")


if __name__ == "__main__":
    main()
