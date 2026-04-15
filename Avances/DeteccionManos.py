import cv2
import mediapipe as mp
import json
import os
from datetime import datetime

# === Inicialización ===
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

DATASET_DIR = "dataset"
os.makedirs(DATASET_DIR, exist_ok=True)

# === ESTADO INICIAL ===
gesto_actual = input("Nombre del gesto inicial (ej. A, B, hola): ").strip().upper()
auto_record = False  # Para el modo ráfaga
frames_guardados = 0 # Contador para saber cuántos llevamos en la sesión

# === Captura de cámara ===
cap = cv2.VideoCapture(0)

# 1. Pedirle a la cámara la máxima resolución posible (ej. HD 1280x720)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

# 2. Crear una ventana "Libre" que puedas maximizar o estirar con el mouse
cv2.namedWindow("SignAI", cv2.WINDOW_NORMAL)

# (Opcional) Si quieres que se abra en pantalla completa automáticamente, descomenta esta línea:
# cv2.setWindowProperty("SignAI - Recoleccion Pro", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

with mp_hands.Hands(
# ... (el resto del código sigue igual)
    max_num_hands=1, # IMPORTANTE: Forzamos a que solo vea 1 mano para estáticos
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
) as hands:

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)

        if results.multi_hand_landmarks and results.multi_handedness:
            # zip() nos permite iterar sobre los puntos y el tipo de mano al mismo tiempo
            for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
                h, w, _ = frame.shape
                
                # Obtener si es Izquierda o Derecha
                mano_tipo = handedness.classification[0].label

                # Dibujar landmarks
                mp_drawing.draw_landmarks(
                    frame, hand_landmarks, mp_hands.HAND_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=(0, 255, 0) if mano_tipo == "Right" else (255, 0, 0), thickness=2, circle_radius=2)
                )

                # === LÓGICA DE GUARDADO ===
                # Guarda si presionamos ESPACIO o si AUTO-RECORD está activado
                key = cv2.waitKey(1) & 0xFF
                if key == 32 or auto_record: 
                    puntos = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand_landmarks.landmark]

                    data = {
                        "gesto": gesto_actual,
                        "hand_type": mano_tipo, # <-- AHORA GUARDAMOS QUÉ MANO ES
                        "timestamp": datetime.now().isoformat(),
                        "landmarks": puntos
                    }

                    file_name = os.path.join(DATASET_DIR, f"{gesto_actual}_{mano_tipo}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.json")

                    with open(file_name, "w") as f:
                        json.dump(data, f, indent=4)
                    
                    frames_guardados += 1

        # === INTERFAZ DE USUARIO (HUD) ===
        # Cambiamos "Seña" por "Gesto" para evitar el error de la "ñ" en OpenCV
        cv2.putText(frame, f"Gesto Actual: {gesto_actual}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
        cv2.putText(frame, f"Guardados hoy: {frames_guardados}", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
        cv2.putText(frame, "Controles: [ESPACIO] Guardar 1 | [R] Auto-Record | [C] Cambiar Gesto | [ESC] Salir", (10, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        if auto_record:
            cv2.putText(frame, "GRABANDO... MUEVE LA MANO LIGERAMENTE", (50, frame.shape[0] // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 3)

        cv2.imshow("SignAI - Recoleccion Pro", frame)

        # === CONTROLES DE TECLADO ===
        key = cv2.waitKey(1) & 0xFF
        if key == 27: # ESC
            break
        elif key == ord('r'): # Activar/Desactivar ráfaga
            auto_record = not auto_record
        elif key == ord('c'): # Cambiar de seña en vivo
            auto_record = False # Apagamos por seguridad
            nuevo_gesto = input("\n📝 Escribe la nueva seña a grabar: ").strip().upper()
            if nuevo_gesto:
                gesto_actual = nuevo_gesto
                frames_guardados = 0 # Reiniciamos el contador visual

cap.release()
cv2.destroyAllWindows()