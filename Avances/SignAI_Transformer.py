import cv2
import mediapipe as mp
import json
import numpy as np
import torch
import torch.nn as nn
import math

# ===========================================================
# CARGAR LABEL MAP
# ===========================================================
with open("label_map_transformer.json", "r", encoding="utf-8") as f:
    label_map = json.load(f)["classes"]

# ===========================================================
# POSICIONAL & TRANSFORMER (MISMA ARQUITECTURA DEL TRAIN)
# ===========================================================
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=1):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1)

        div = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div)
        pe[:, 1::2] = torch.cos(position * div)

        self.register_buffer('pe', pe)

    def forward(self, x):
        return x + self.pe

class SignTransformer(nn.Module):
    # ¡Cambiamos input_dim a 72!
    def __init__(self, input_dim=72, num_classes=20, dim_model=128, num_heads=4, num_layers=3):
        super().__init__()
        self.input_projection = nn.Linear(input_dim, dim_model)
        self.pos_encoding = PositionalEncoding(dim_model)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=dim_model, nhead=num_heads,
            dim_feedforward=dim_model*4, dropout=0.1,
            batch_first=True
        )

        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.fc = nn.Linear(dim_model, num_classes)

    def forward(self, x):
        x = self.input_projection(x)
        x = x.unsqueeze(1)
        x = self.pos_encoding(x)
        x = self.transformer(x)
        return self.fc(x[:, 0, :])

# ===========================================================
# CARGAR MODELO
# ===========================================================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# ¡Actualizamos a 72 aquí también!
model = SignTransformer(input_dim=72, num_classes=len(label_map)).to(device)

model.load_state_dict(torch.load("signai_transformer.pth", map_location=device))
model.eval()

print("✅ Modelo cargado correctamente con 72 dimensiones en:", device)

# ===========================================================
# NORMALIZACIÓN NUEVA (ESPEJO + 9 DISTANCIAS)
# ===========================================================
def normalizar_landmarks(landmarks, hand_type="Right"):
    pts = [(lm.x, lm.y, lm.z) for lm in landmarks.landmark]

    # 1. Centrado en muñeca
    wrist = pts[0]
    pts = [(p[0]-wrist[0], p[1]-wrist[1], p[2]-wrist[2]) for p in pts]

    # 2. Escalar
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    scale = max(max(xs)-min(xs), max(ys)-min(ys), 1e-6)
    pts = [(p[0]/scale, p[1]/scale, p[2]/scale) for p in pts]

    # 3. Truco del espejo para la mano izquierda
    if hand_type == "Left":
        pts = [(-p[0], p[1], p[2]) for p in pts]

    # 4. Ingeniería de Características (9 Distancias)
    def dist(p, q):
        return math.sqrt((p[0]-q[0])**2 + (p[1]-q[1])**2 + (p[2]-q[2])**2)

    extra_features = [
        dist(pts[0], pts[4]), dist(pts[0], pts[8]), dist(pts[0], pts[12]), dist(pts[0], pts[16]), dist(pts[0], pts[20]),
        dist(pts[4], pts[8]), dist(pts[4], pts[12]), dist(pts[4], pts[16]), dist(pts[4], pts[20])
    ]

    # Unir todo
    flat_pts = []
    for p in pts:
        flat_pts.extend([p[0], p[1], p[2]])

    return np.array(flat_pts + extra_features, dtype=np.float32)

# ===========================================================
# MEDIAPIPE HANDS
# ===========================================================
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

# ===========================================================
# LOOP DE CÁMARA
# ===========================================================
cap = cv2.VideoCapture(0)
# Pedimos alta resolución a la cámara para mayor precisión
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

with mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
) as hands:

    pred_anterior = ""
    estabilidad = 0
    UMBRAL_ESTABILIDAD = 5

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)

        pred_final = ""

        # IMPORTANTE: Ahora detectamos también qué mano es (multi_handedness)
        if results.multi_hand_landmarks and results.multi_handedness:
            for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
                
                # Obtener "Left" o "Right"
                tipo_mano = handedness.classification[0].label

                mp_drawing.draw_landmarks(
                    frame, hand_landmarks, mp_hands.HAND_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=(0, 255, 0) if tipo_mano == "Right" else (255, 0, 0), thickness=2, circle_radius=2)
                )

                # Normalizar pasando el tipo de mano
                vector = normalizar_landmarks(hand_landmarks, hand_type=tipo_mano)

                tensor = torch.tensor(vector, dtype=torch.float32).unsqueeze(0).to(device)

                with torch.no_grad():
                    logits = model(tensor)
                    pred_idx = torch.argmax(logits, dim=1).item()
                    pred = label_map[pred_idx]

                # Suavizado para estabilidad visual
                if pred == pred_anterior:
                    estabilidad += 1
                else:
                    estabilidad = 0

                pred_anterior = pred

                if estabilidad > UMBRAL_ESTABILIDAD:
                    pred_final = pred
                    # print("Predicción:", pred_final) # Comentado para no saturar consola

        # Mostrar en pantalla
        cv2.putText(frame, f"Traduccion: {pred_final}", (20, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 255), 4)

        cv2.imshow("SignAI - Inferencia en vivo", frame)

        if cv2.waitKey(1) & 0xFF == 27:  # ESC para salir
            break

cap.release()
cv2.destroyAllWindows()