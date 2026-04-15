import cv2
import mediapipe as mp
import json
import os
import time
from datetime import datetime

OUTPUT_DIR = "dataset_dinamico"
os.makedirs(OUTPUT_DIR, exist_ok=True)

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

gesto_actual = input("Nombre de la seña a grabar (ej. hola, gracias): ").strip().upper()
grabando = False
secuencia_actual = []
frames_guardados = 0

en_conteo = False
tiempo_inicio_conteo = 0

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
cv2.namedWindow("SignAI", cv2.WINDOW_NORMAL)

with mp_hands.Hands(
    max_num_hands=2,
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

        # Diccionario para guardar lo que vemos en este frame exacto
        frame_data = {"Right": None, "Left": None}

        if results.multi_hand_landmarks and results.multi_handedness:
            for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
                
                tipo_mano = handedness.classification[0].label # "Left" o "Right"
                
                # Dibujar en pantalla
                mp_drawing.draw_landmarks(
                    frame, hand_landmarks, mp_hands.HAND_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=(0, 255, 0) if tipo_mano == "Right" else (255, 0, 0), thickness=2, circle_radius=2)
                )

                # Extraer puntos crudos
                puntos = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand_landmarks.landmark]
                frame_data[tipo_mano] = puntos

        # ===================================================
        # LÓGICA DE GRABACIÓN Y TEMPORIZADOR
        # ===================================================
        if en_conteo:
            tiempo_restante = 3 - int(time.time() - tiempo_inicio_conteo)
            if tiempo_restante > 0:
                cv2.putText(frame, str(tiempo_restante), (frame.shape[1]//2 - 50, frame.shape[0]//2), 
                            cv2.FONT_HERSHEY_SIMPLEX, 7, (0, 165, 255), 15)
            else:
                en_conteo = False
                grabando = True
                secuencia_actual = []
                print("Grabando")

        elif grabando:
            secuencia_actual.append(frame_data)
            cv2.putText(frame, "Grabando seña...", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 4)
            cv2.putText(frame, f"Frames: {len(secuencia_actual)}", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        # ===================================================
        # INTERFAZ (HUD)
        # ===================================================
        cv2.putText(frame, f"Seña: {gesto_actual} | Videos guardados: {frames_guardados}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
        cv2.putText(frame, "Controles: [G] Grabar | [S] Detener/Guardar | [C] Cambiar Senia | [ESC] Salir", (20, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        cv2.imshow("SignAI", frame)

        # ===================================================
        # TECLADO
        # ===================================================
        key = cv2.waitKey(1) & 0xFF
        if key == 27: # ESC
            break
        elif key == ord('c') and not grabando and not en_conteo:
            nuevo_gesto = input("\nEscribe la nueva seña a grabar: ").strip().upper()
            if nuevo_gesto:
                gesto_actual = nuevo_gesto
                frames_guardados = 0
        elif key == ord('g') and not grabando and not en_conteo:
            en_conteo = True
            tiempo_inicio_conteo = time.time()
        elif key == ord('s') and grabando:
            grabando = False
            
            # Solo guardar si la secuencia tiene sentido (más de 5 frames)
            if len(secuencia_actual) > 5:
                data = {
                    "gesto": gesto_actual,
                    "timestamp": datetime.now().isoformat(),
                    "total_frames": len(secuencia_actual),
                    "secuencia": secuencia_actual
                }

                file_name = os.path.join(OUTPUT_DIR, f"{gesto_actual}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
                with open(file_name, "w") as f:
                    json.dump(data, f, indent=4)
                
                frames_guardados += 1
                print(f"Secuencia guardada ({len(secuencia_actual)} frames)")
            else:
                print("Secuencia muy corta, descartada.")

cap.release()
cv2.destroyAllWindows()