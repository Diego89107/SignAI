"""
comun.py

Utilidades compartidas por todo el pipeline del Modelo Transformer de SignAI:
- Constantes de landmarks, dimensiones de features y rutas.
- Geometria (distancias, angulos articulares, normal de palma).
- Deteccion de movimiento para el auto-stop del recorder dinamico.
- Normalizacion y extraccion de features por mano.
- Manejo de MediaPipe Hands con soporte para world_landmarks.
- IO de JSON y generacion de session_id.
"""
from __future__ import annotations

import json
import math
from datetime import datetime
from pathlib import Path

import numpy as np


# ============================================================================
# RUTAS
# ============================================================================

RAIZ = Path(__file__).parent
DIR_ESTATICO = RAIZ / "dataset_estatico"
DIR_DINAMICO = RAIZ / "dataset_dinamico"
DIR_NORMALIZADO = RAIZ / "dataset_normalizado"
DIR_MODELOS = RAIZ / "modelos"

PATH_MODELO = DIR_MODELOS / "signai_transformer.pth"
PATH_LABEL_MAP = DIR_MODELOS / "label_map.json"
PATH_FEATURE_META = DIR_MODELOS / "feature_meta.json"


# ============================================================================
# INDICES DE LANDMARKS (MediaPipe Hands, 21 puntos por mano)
# ============================================================================

WRIST = 0
THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP = 1, 2, 3, 4
INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP = 5, 6, 7, 8
MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP = 9, 10, 11, 12
RING_MCP, RING_PIP, RING_DIP, RING_TIP = 13, 14, 15, 16
PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP = 17, 18, 19, 20

FINGER_TIPS = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]

FINGER_JOINTS = [
    [THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP],
    [INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP],
    [MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP],
    [RING_MCP, RING_PIP, RING_DIP, RING_TIP],
    [PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP],
]

INTER_TIP_PAIRS = [
    (INDEX_TIP, MIDDLE_TIP),
    (MIDDLE_TIP, RING_TIP),
    (RING_TIP, PINKY_TIP),
]


# ============================================================================
# DIMENSIONES DE FEATURES
# ============================================================================
# Por mano:
#   63 coords (21 * XYZ)
#   + 5 dist wrist->tips
#   + 4 dist thumb->otros tips
#   + 3 inter-tips consecutivos
#   + 15 angulos articulares (3 por dedo * 5 dedos)
#   + 3 normal de palma
#   + 1 hand_type (0=Right, 1=Left)
#   + 1 hand_present
#   = 95

FEAT_COORDS = 21 * 3              # 63
FEAT_DIST_WRIST = 5
FEAT_DIST_THUMB = 4
FEAT_INTER_TIPS = 3
FEAT_JOINT_ANGLES = 15
FEAT_PALM_NORMAL = 3
FEAT_HAND_TYPE = 1
FEAT_HAND_PRESENT = 1

FEAT_PER_HAND = (
    FEAT_COORDS + FEAT_DIST_WRIST + FEAT_DIST_THUMB +
    FEAT_INTER_TIPS + FEAT_JOINT_ANGLES + FEAT_PALM_NORMAL +
    FEAT_HAND_TYPE + FEAT_HAND_PRESENT
)  # 95

FEAT_STATIC_PER_FRAME = FEAT_PER_HAND * 2  # 190 (Right + Left)

# Para dinamico se agregan velocidad y aceleracion de las 63 coords por mano.
FEAT_VEL_PER_FRAME = FEAT_COORDS * 2       # 126
FEAT_ACC_PER_FRAME = FEAT_COORDS * 2       # 126
FEAT_DYNAMIC_PER_FRAME = FEAT_STATIC_PER_FRAME + FEAT_VEL_PER_FRAME + FEAT_ACC_PER_FRAME  # 442


# ============================================================================
# PARAMETROS DEL PIPELINE
# ============================================================================

FPS_OBJETIVO = 25
MAX_SEQ_LEN = 80                 # padding/truncation para entrenamiento

CONF_DETECCION = 0.7
CONF_TRACKING = 0.7
CONF_VERDE = 0.75                # confianza minima para encender rectangulo verde

MS_ESTABLE_PARA_COUNTDOWN = 200  # tiempo de deteccion estable antes del countdown
SEG_COUNTDOWN = 3

FRAMES_ESTATICO = 15             # ~0.6s a 25fps

MS_QUIETUD_PARA_FIN = 400        # fin de grabacion dinamica tras Nms de quietud
MS_MARGEN_TRIM = 200             # se conservan estos ms extra tras el inicio de la quietud
UMBRAL_MOVIMIENTO = 0.008        # distancia media entre frames (coord normalizada)

SEG_MAX_DINAMICO = 4.0
SEG_MIN_DINAMICO = 0.3


# ============================================================================
# GEOMETRIA
# ============================================================================

def distancia(p, q) -> float:
    return math.sqrt((p[0]-q[0])**2 + (p[1]-q[1])**2 + (p[2]-q[2])**2)


def angulo_3p(p1, p2, p3, eps: float = 1e-6) -> float:
    """Angulo en p2 formado por los vectores p2->p1 y p2->p3 (radianes)."""
    v1 = np.array([p1[0]-p2[0], p1[1]-p2[1], p1[2]-p2[2]], dtype=np.float64)
    v2 = np.array([p3[0]-p2[0], p3[1]-p2[1], p3[2]-p2[2]], dtype=np.float64)
    n1 = float(np.linalg.norm(v1))
    n2 = float(np.linalg.norm(v2))
    if n1 < eps or n2 < eps:
        return 0.0
    cos = float(np.clip(np.dot(v1, v2) / (n1 * n2), -1.0, 1.0))
    return math.acos(cos)


def normal_palma(pts) -> tuple[float, float, float]:
    """Normal unitaria del plano palmar (triangulo INDEX_MCP, MIDDLE_MCP, PINKY_MCP)."""
    p1 = np.array(pts[INDEX_MCP], dtype=np.float64)
    p2 = np.array(pts[MIDDLE_MCP], dtype=np.float64)
    p3 = np.array(pts[PINKY_MCP], dtype=np.float64)
    n = np.cross(p2 - p1, p3 - p1)
    norm = float(np.linalg.norm(n))
    if norm < 1e-6:
        return (0.0, 0.0, 0.0)
    n = n / norm
    return (float(n[0]), float(n[1]), float(n[2]))


# ============================================================================
# MOVIMIENTO (para auto-stop del recorder y state machine de inferencia)
# ============================================================================

def promedio_movimiento(pts_prev, pts_curr) -> float:
    """
    Distancia euclidea media por landmark entre dos frames consecutivos
    (21 tuplas cada uno). Si alguno es None devuelve 0.0.
    """
    if pts_prev is None or pts_curr is None:
        return 0.0
    if len(pts_prev) != len(pts_curr):
        return 0.0
    total = 0.0
    for a, b in zip(pts_prev, pts_curr):
        total += distancia(a, b)
    return total / max(len(pts_prev), 1)


def movimiento_global(frame_prev, frame_curr) -> float:
    """
    Promedio de movimiento considerando ambas manos. Cada frame_* es:
      {"Right": [21 tuplas] | None, "Left": [21 tuplas] | None}
    Solo promedia manos presentes en ambos frames.
    """
    vals = []
    for lado in ("Right", "Left"):
        if frame_prev.get(lado) and frame_curr.get(lado):
            vals.append(promedio_movimiento(frame_prev[lado], frame_curr[lado]))
    if not vals:
        return 0.0
    return sum(vals) / len(vals)


# ============================================================================
# NORMALIZACION Y FEATURES
# ============================================================================

def puntos_de_landmarks(landmarks) -> list[tuple[float, float, float]]:
    """MediaPipe landmarks -> lista de tuplas (x, y, z)."""
    return [(lm.x, lm.y, lm.z) for lm in landmarks.landmark]


def tuplas_de_dicts(lista_dict) -> list[tuple[float, float, float]]:
    """Lista de dicts {x,y,z} -> lista de tuplas."""
    return [(p["x"], p["y"], p.get("z", 0.0)) for p in lista_dict]


def normalizar_mano(pts) -> list[tuple[float, float, float]]:
    """
    Centra en la muneca y escala por dist(wrist, MIDDLE_MCP).
    Esta escala es estable: no colapsa con el puno cerrado.
    NO aplica rotacion (se preserva la orientacion como senial).
    NO aplica mirror (hand_type va como feature).
    """
    wrist = pts[WRIST]
    mcp9 = pts[MIDDLE_MCP]
    escala = distancia(wrist, mcp9)
    if escala < 1e-6:
        escala = 1.0
    inv = 1.0 / escala
    return [
        ((p[0] - wrist[0]) * inv,
         (p[1] - wrist[1]) * inv,
         (p[2] - wrist[2]) * inv)
        for p in pts
    ]


def features_mano(pts_norm, hand_type: str) -> np.ndarray:
    """
    pts_norm: 21 tuplas (x,y,z) ya normalizadas.
    Devuelve vector np.float32 de FEAT_PER_HAND dims.
    """
    flat = []
    for p in pts_norm:
        flat.extend([p[0], p[1], p[2]])

    dist_wrist = [distancia(pts_norm[WRIST], pts_norm[t]) for t in FINGER_TIPS]
    dist_thumb = [distancia(pts_norm[THUMB_TIP], pts_norm[t]) for t in FINGER_TIPS[1:]]
    inter_tips = [distancia(pts_norm[a], pts_norm[b]) for a, b in INTER_TIP_PAIRS]

    angulos = []
    for chain in FINGER_JOINTS:
        for i in range(1, len(chain) - 1):
            angulos.append(angulo_3p(
                pts_norm[chain[i-1]], pts_norm[chain[i]], pts_norm[chain[i+1]]
            ))

    npalma = normal_palma(pts_norm)

    h_type = 1.0 if hand_type == "Left" else 0.0
    h_present = 1.0

    vec = (
        flat
        + dist_wrist
        + dist_thumb
        + inter_tips
        + angulos
        + list(npalma)
        + [h_type, h_present]
    )
    if len(vec) != FEAT_PER_HAND:
        raise AssertionError(f"features_mano: len={len(vec)} esperado {FEAT_PER_HAND}")
    return np.array(vec, dtype=np.float32)


def vector_mano_ausente(hand_type: str) -> np.ndarray:
    """Vector de FEAT_PER_HAND dims para cuando esa mano no fue detectada."""
    vec = np.zeros(FEAT_PER_HAND, dtype=np.float32)
    # hand_type se codifica igualmente (por consistencia posicional).
    vec[FEAT_PER_HAND - 2] = 1.0 if hand_type == "Left" else 0.0
    # hand_present queda en 0.
    return vec


def features_frame(right_pts, left_pts) -> np.ndarray:
    """
    right_pts, left_pts: listas de 21 tuplas crudas o None.
    Devuelve [FEAT_STATIC_PER_FRAME] con Right seguido de Left.
    """
    if right_pts is not None:
        vec_r = features_mano(normalizar_mano(right_pts), "Right")
    else:
        vec_r = vector_mano_ausente("Right")

    if left_pts is not None:
        vec_l = features_mano(normalizar_mano(left_pts), "Left")
    else:
        vec_l = vector_mano_ausente("Left")

    return np.concatenate([vec_r, vec_l])


def solo_coords_del_frame(features_frame_vec: np.ndarray) -> np.ndarray:
    """
    Extrae solo las 63 coords de cada mano de un vector [FEAT_STATIC_PER_FRAME]
    (usado para derivar velocidad y aceleracion en dinamicas).
    Devuelve [126] con Right primero, Left despues.
    """
    coords_r = features_frame_vec[:FEAT_COORDS]
    coords_l = features_frame_vec[FEAT_PER_HAND:FEAT_PER_HAND + FEAT_COORDS]
    return np.concatenate([coords_r, coords_l])


def velocidades(coords_seq: np.ndarray) -> np.ndarray:
    """coords_seq: [T, 126] -> [T, 126] (frame 0 = 0)."""
    vel = np.zeros_like(coords_seq)
    if coords_seq.shape[0] > 1:
        vel[1:] = coords_seq[1:] - coords_seq[:-1]
    return vel


def aceleraciones(vel_seq: np.ndarray) -> np.ndarray:
    acc = np.zeros_like(vel_seq)
    if vel_seq.shape[0] > 1:
        acc[1:] = vel_seq[1:] - vel_seq[:-1]
    return acc


# ============================================================================
# MEDIAPIPE
# ============================================================================

def crear_hands(num_manos: int, modo_estatico: bool = False):
    """Instancia de MediaPipe Hands con configuracion consistente."""
    import mediapipe as mp
    return mp.solutions.hands.Hands(
        static_image_mode=modo_estatico,
        max_num_hands=num_manos,
        min_detection_confidence=CONF_DETECCION,
        min_tracking_confidence=CONF_TRACKING,
    )


def extraer_manos(results) -> dict:
    """
    De un results de MediaPipe devuelve:
      {
        "Right": {"image": [21 tuplas], "world": [21 tuplas], "score": float} | None,
        "Left":  {...} | None
      }
    Si no hay world_landmarks, "world" se rellena con "image" como fallback.
    """
    out = {"Right": None, "Left": None}
    if not results.multi_hand_landmarks or not results.multi_handedness:
        return out

    hl = results.multi_hand_landmarks
    wl = (results.multi_hand_world_landmarks
          if getattr(results, "multi_hand_world_landmarks", None)
          else [None] * len(hl))
    hn = results.multi_handedness

    for img_lm, w_lm, hness in zip(hl, wl, hn):
        cls = hness.classification[0]
        tipo = cls.label  # "Right" | "Left"
        score = float(cls.score)
        img_pts = puntos_de_landmarks(img_lm)
        world_pts = puntos_de_landmarks(w_lm) if w_lm is not None else img_pts
        if out.get(tipo) is None:
            out[tipo] = {"image": img_pts, "world": world_pts, "score": score}
    return out


def pts_para_features(mano_dict):
    """Devuelve world pts si existen, si no image. None si no hay mano."""
    if mano_dict is None:
        return None
    return mano_dict.get("world") or mano_dict.get("image")


# ============================================================================
# IO
# ============================================================================

def nuevo_session_id() -> str:
    """Timestamp al momento de iniciar el programa (una sola vez por recorder)."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def ahora_iso() -> str:
    return datetime.now().isoformat()


def ahora_ms() -> int:
    return int(datetime.now().timestamp() * 1000)


def guardar_json(data: dict, path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def leer_json(path: str | Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def nombre_archivo_muestra(gesto: str, session_id: str, tipo: str) -> str:
    """Nombre de archivo estandarizado para una muestra."""
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    return f"{tipo}_{gesto}_{session_id}_{stamp}.json"
