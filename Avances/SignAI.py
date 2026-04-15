import cv2
import mediapipe as mp
import torch
import json
import numpy as np
import math
from Entrenamiento import SignMLP

# ======== CONFIGURACIÓN ========
MODEL_PATH = "signai.pth"
LABELMAP_PATH = "label_map.json"

# Cargar mapa de etiquetas
with open(LABELMAP_PATH, "r", encoding="utf-8") as f:
    label_map = json.load(f)
CLASSES = label_map["classes"]

# ======== Cargar modelo ========
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = SignMLP(input_dim=63, num_classes=len(CLASSES)).to(device)
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.eval()

print("Modelo cargado en:", device)

# ======== MediaPipe ========
mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

# ======== Normalización ========

WRIST = 0
INDEX_MCP = 5
PINKY_MCP = 17

def sub(p, q):
    return (p[0]-q[0], p[1]-q[1], p[2]-q[2])

def rot2d(p, ang):
    ca, sa = math.cos(ang), math.sin(ang)
    x, y, z = p
    return (x*ca - y*sa, x*sa + y*ca, z)

def normalizar_landmarks(lms):
    pts = [(p.x, p.y, p.z) for p in lms]

    # 1. Centrar en muñeca
    wrist = pts[WRIST]
    pts = [sub(p, wrist) for p in pts]

    # 2. Escala
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    scale = max(max(xs)-min(xs), max(ys)-min(ys), 1e-6)
    pts = [(p[0]/scale, p[1]/scale, p[2]/scale) for p in pts]

    # 3. Rotación
    v = sub(pts[INDEX_MCP], pts[PINKY_MCP])
    ang = math.atan2(v[1], v[0])
    pts = [rot2d(p, -ang) for p in pts]

    # Flatten
    flat = []
    for p in pts:
        flat.extend([p[0], p[1], p[2]])
    return np.array(flat, dtype=np.float32)

# ======== Cámara ========
cap = cv2.VideoCapture(0)

print("Iniciando cámara... Presiona ESC para salir.")

with mp_hands.Hands(
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
    max_num_hands=1
) as hands:

    last_pred = None  # para imprimir solo cuando cambia

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        results = hands.process(rgb)

        pred_text = "___"

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:

                mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

                vector = normalizar_landmarks(hand_landmarks.landmark)

                x = torch.tensor(vector, dtype=torch.float32).unsqueeze(0).to(device)

                with torch.no_grad():
                    logits = model(x)
                    pred_id = torch.argmax(logits, dim=1).item()
                    pred_text = CLASSES[pred_id]

                # Mostrar en la pantalla
                cv2.putText(frame, f"Pred: {pred_text}", (10, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,255,0), 3)

                # <<< IMPRIMIR EN CONSOLA >>>
                if pred_text != last_pred:
                    print("Predicción:", pred_text)
                    last_pred = pred_text

        cv2.imshow("SignAI", frame)

        if cv2.waitKey(1) & 0xFF == 27:
            break

cap.release()
cv2.destroyAllWindows()
