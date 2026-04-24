"""
grabar_estatica.py

Recorder de senias estaticas para el Modelo Transformer de SignAI.

Cada muestra es una secuencia corta de FRAMES_ESTATICO frames a FPS_OBJETIVO fps
(la mano se mantiene quieta). Esto reemplaza la captura de un unico frame y da
robustez frente al jitter natural de MediaPipe.

Maquina de estados:
    IDLE           -> esperando tecla G
    WAITING_HANDS  -> rectangulo verde mientras detecta la(s) mano(s) requerida(s)
                      con confianza >= CONF_VERDE de forma consistente
    COUNTDOWN      -> cuenta atras 3-2-1 (solo avanza si las manos siguen detectadas)
    RECORDING      -> captura FRAMES_ESTATICO a FPS_OBJETIVO fps.
                      Si hay movimiento excesivo entre frames se descarta la toma
                      (la senia estatica asume quietud).
    SAVING         -> escribe JSON, muestra flash de confirmacion, vuelve a IDLE

Controles:
    G     iniciar grabacion
    C     cambiar gesto actual
    M     cambiar numero de manos esperadas (1 o 2)
    ESC   salir (cancela grabacion si esta en curso)
"""
from __future__ import annotations

import time
import sys
from pathlib import Path

import cv2
import numpy as np

from comun import (
    DIR_ESTATICO, FPS_OBJETIVO, FRAMES_ESTATICO, CONF_VERDE,
    MS_ESTABLE_PARA_COUNTDOWN, SEG_COUNTDOWN, UMBRAL_MOVIMIENTO,
    crear_hands, extraer_manos, movimiento_global,
    nuevo_session_id, ahora_iso, ahora_ms,
    guardar_json, nombre_archivo_muestra,
)

# ============================================================================
# CONFIG OPENCV
# ============================================================================

ANCHO_CAM = 1280
ALTO_CAM = 720
VENTANA = "SignAI - Grabador Estatico"

COLOR_VERDE = (0, 220, 0)
COLOR_ROJO = (0, 40, 220)
COLOR_AMARILLO = (0, 220, 220)
COLOR_BLANCO = (240, 240, 240)
COLOR_NEGRO = (20, 20, 20)


# ============================================================================
# ESTADOS
# ============================================================================

IDLE = "IDLE"
WAITING_HANDS = "WAITING_HANDS"
COUNTDOWN = "COUNTDOWN"
RECORDING = "RECORDING"
SAVING = "SAVING"


# ============================================================================
# HELPERS DE DIBUJO
# ============================================================================

def _bbox_de_pts(pts_img, w, h, pad=25):
    xs = [int(p[0] * w) for p in pts_img]
    ys = [int(p[1] * h) for p in pts_img]
    x1 = max(0, min(xs) - pad)
    y1 = max(0, min(ys) - pad)
    x2 = min(w - 1, max(xs) + pad)
    y2 = min(h - 1, max(ys) + pad)
    return x1, y1, x2, y2


def dibujar_landmarks(frame, manos):
    import mediapipe as mp
    mp_drawing = mp.solutions.drawing_utils
    # En este recorder no necesitamos reconstruir landmarks_list para drawing,
    # asi que dibujamos a mano: puntos + conexiones minimas.
    h, w, _ = frame.shape
    conexiones = [
        (0, 1), (1, 2), (2, 3), (3, 4),
        (0, 5), (5, 6), (6, 7), (7, 8),
        (5, 9), (9, 10), (10, 11), (11, 12),
        (9, 13), (13, 14), (14, 15), (15, 16),
        (13, 17), (17, 18), (18, 19), (19, 20), (0, 17),
    ]
    for lado in ("Right", "Left"):
        if manos.get(lado) is None:
            continue
        pts = manos[lado]["image"]
        color = (0, 255, 0) if lado == "Right" else (255, 80, 80)
        for i, j in conexiones:
            a = (int(pts[i][0] * w), int(pts[i][1] * h))
            b = (int(pts[j][0] * w), int(pts[j][1] * h))
            cv2.line(frame, a, b, color, 2)
        for p in pts:
            cv2.circle(frame, (int(p[0] * w), int(p[1] * h)), 3, color, -1)


def dibujar_rectangulo_verde(frame, manos, solido=False):
    h, w, _ = frame.shape
    for lado in ("Right", "Left"):
        if manos.get(lado) is None:
            continue
        x1, y1, x2, y2 = _bbox_de_pts(manos[lado]["image"], w, h)
        grosor = -1 if solido else 3
        if solido:
            overlay = frame.copy()
            cv2.rectangle(overlay, (x1, y1), (x2, y2), COLOR_VERDE, -1)
            cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)
        cv2.rectangle(frame, (x1, y1), (x2, y2), COLOR_VERDE, 3)


def dibujar_hud(frame, gesto, num_manos, session_id, guardados, estado, flash):
    h, w, _ = frame.shape

    # Franja superior
    cv2.rectangle(frame, (0, 0), (w, 70), COLOR_NEGRO, -1)
    cv2.putText(frame, f"Gesto: {gesto}", (20, 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, COLOR_AMARILLO, 2)
    cv2.putText(frame, f"Manos: {num_manos}   Guardados (sesion): {guardados}",
                (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_BLANCO, 1)
    cv2.putText(frame, f"Session: {session_id}", (w - 320, 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_BLANCO, 1)
    cv2.putText(frame, f"Estado: {estado}", (w - 320, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_VERDE, 1)

    # Franja inferior
    cv2.rectangle(frame, (0, h - 40), (w, h), COLOR_NEGRO, -1)
    cv2.putText(frame, "[G] Grabar   [C] Cambiar gesto   [M] Cambiar manos   [ESC] Salir",
                (20, h - 13), cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_BLANCO, 1)

    if flash:
        texto, color = flash
        (tw, th), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)
        x = (w - tw) // 2
        y = h - 90
        cv2.rectangle(frame, (x - 18, y - th - 14), (x + tw + 18, y + 12), COLOR_NEGRO, -1)
        cv2.putText(frame, texto, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)


def dibujar_countdown(frame, n):
    h, w, _ = frame.shape
    texto = str(n)
    (tw, th), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, 8, 18)
    x = (w - tw) // 2
    y = (h + th) // 2
    cv2.putText(frame, texto, (x, y),
                cv2.FONT_HERSHEY_SIMPLEX, 8, COLOR_AMARILLO, 22, cv2.LINE_AA)


def dibujar_grabando(frame, idx, total):
    h, w, _ = frame.shape
    cv2.rectangle(frame, (0, 80), (w, 140), (0, 0, 100), -1)
    cv2.putText(frame, f"GRABANDO  {idx}/{total}", (30, 120),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)


# ============================================================================
# LOGICA DE ESTADO
# ============================================================================

def manos_requeridas_detectadas(manos, num_manos) -> bool:
    """True si hay al menos num_manos detectadas con confianza >= CONF_VERDE."""
    presentes = [m for m in (manos.get("Right"), manos.get("Left")) if m is not None]
    if len(presentes) < num_manos:
        return False
    return all(m["score"] >= CONF_VERDE for m in presentes[:num_manos])


def frame_dict_desde_manos(manos):
    """
    Convierte la salida de extraer_manos en el diccionario que guardamos
    en el JSON (incluye image y world en listas serializables).
    """
    out = {}
    for lado in ("Right", "Left"):
        m = manos.get(lado)
        if m is None:
            out[lado] = None
            continue
        out[lado] = {
            "image": [list(p) for p in m["image"]],
            "world": [list(p) for p in m["world"]],
            "score": m["score"],
        }
    return out


def extraer_puntos_para_mov(frame_dict):
    """Devuelve dict {Right: pts_world|None, Left: pts_world|None} para movimiento_global."""
    return {
        lado: (frame_dict[lado]["world"] if frame_dict.get(lado) else None)
        for lado in ("Right", "Left")
    }


# ============================================================================
# INPUT DE CONSOLA
# ============================================================================

def pedir_gesto(prompt="Nombre del gesto (ej. A, HOLA): "):
    while True:
        g = input(prompt).strip().upper()
        if g:
            return g
        print("El gesto no puede estar vacio.")


def pedir_num_manos(prompt="Numero de manos para esta senia (1 o 2): "):
    while True:
        raw = input(prompt).strip()
        if raw in ("1", "2"):
            return int(raw)
        print("Debe ser 1 o 2.")


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 64)
    print("SignAI - Grabador de senias ESTATICAS")
    print("=" * 64)
    gesto = pedir_gesto()
    num_manos = pedir_num_manos()

    session_id = nuevo_session_id()
    print(f"session_id: {session_id}")
    print(f"Salida: {DIR_ESTATICO}")
    print("Abriendo camara...")

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, ANCHO_CAM)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, ALTO_CAM)
    if not cap.isOpened():
        print("ERROR: no se pudo abrir la camara.")
        sys.exit(1)

    cv2.namedWindow(VENTANA, cv2.WINDOW_NORMAL)

    # Estado
    estado = IDLE
    guardados = 0
    flash = None                    # (texto, color, ms_expiracion)
    t_estable_desde = None          # cuando empezo deteccion continua en WAITING_HANDS
    countdown_ms_inicio = None
    buffer_frames = []              # secuencia de frame_dicts durante RECORDING
    ultimo_grabado_ms = 0
    previo_puntos = None            # para detectar movimiento excesivo en RECORDING
    ms_por_frame = 1000.0 / FPS_OBJETIVO

    hands = crear_hands(num_manos=num_manos, modo_estatico=False)

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("ERROR: fallo al leer frame.")
                break

            frame = cv2.flip(frame, 1)  # vista espejo para que se sienta natural
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)
            manos = extraer_manos(results)

            dibujar_landmarks(frame, manos)

            # Flash expirado?
            ahora = ahora_ms()
            flash_actual = None
            if flash is not None:
                texto, color, hasta = flash
                if ahora < hasta:
                    flash_actual = (texto, color)
                else:
                    flash = None

            # --- LOGICA DE ESTADOS ---
            if estado == IDLE:
                # No pasa nada especial. Esperar tecla.
                pass

            elif estado == WAITING_HANDS:
                if manos_requeridas_detectadas(manos, num_manos):
                    if t_estable_desde is None:
                        t_estable_desde = ahora
                    dibujar_rectangulo_verde(frame, manos, solido=True)
                    estables_ms = ahora - t_estable_desde
                    if estables_ms >= MS_ESTABLE_PARA_COUNTDOWN:
                        estado = COUNTDOWN
                        countdown_ms_inicio = ahora
                else:
                    t_estable_desde = None
                    cv2.putText(frame,
                                f"Coloca {num_manos} mano(s) frente a la camara",
                                (30, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.9,
                                COLOR_AMARILLO, 2)

            elif estado == COUNTDOWN:
                if not manos_requeridas_detectadas(manos, num_manos):
                    # Se perdieron las manos -> cancelar countdown
                    estado = WAITING_HANDS
                    t_estable_desde = None
                    flash = ("Countdown cancelado", COLOR_AMARILLO, ahora + 800)
                else:
                    transcurrido = (ahora - countdown_ms_inicio) / 1000.0
                    restante = SEG_COUNTDOWN - int(transcurrido)
                    if restante <= 0:
                        # Arrancar grabacion
                        estado = RECORDING
                        buffer_frames = []
                        previo_puntos = None
                        ultimo_grabado_ms = 0
                    else:
                        dibujar_rectangulo_verde(frame, manos, solido=False)
                        dibujar_countdown(frame, restante)

            elif estado == RECORDING:
                # Capturamos FRAMES_ESTATICO frames a FPS_OBJETIVO fps.
                # Descartamos si hay movimiento excesivo (debe estar quieto).
                if (ahora - ultimo_grabado_ms) >= ms_por_frame:
                    fd = frame_dict_desde_manos(manos)
                    pts_act = extraer_puntos_para_mov(fd)

                    # Validar quietud
                    if previo_puntos is not None:
                        mov = movimiento_global(previo_puntos, pts_act)
                        if mov > UMBRAL_MOVIMIENTO * 3:
                            # Se movio mucho -> descartar y regresar
                            estado = IDLE
                            buffer_frames = []
                            previo_puntos = None
                            flash = ("Se detecto movimiento: toma descartada",
                                     COLOR_ROJO, ahora + 1500)
                            dibujar_hud(frame, gesto, num_manos, session_id,
                                        guardados, estado, flash_actual)
                            cv2.imshow(VENTANA, frame)
                            if cv2.waitKey(1) & 0xFF == 27:
                                break
                            continue

                    # Tambien validar que las manos siguen detectadas
                    presentes = sum(1 for lado in ("Right", "Left")
                                    if fd.get(lado) is not None)
                    if presentes < num_manos:
                        estado = IDLE
                        buffer_frames = []
                        previo_puntos = None
                        flash = ("Se perdio la mano: toma descartada",
                                 COLOR_ROJO, ahora + 1500)
                        dibujar_hud(frame, gesto, num_manos, session_id,
                                    guardados, estado, flash_actual)
                        cv2.imshow(VENTANA, frame)
                        if cv2.waitKey(1) & 0xFF == 27:
                            break
                        continue

                    buffer_frames.append(fd)
                    previo_puntos = pts_act
                    ultimo_grabado_ms = ahora

                dibujar_grabando(frame, len(buffer_frames), FRAMES_ESTATICO)

                if len(buffer_frames) >= FRAMES_ESTATICO:
                    estado = SAVING

            elif estado == SAVING:
                data = {
                    "tipo": "estatico",
                    "gesto": gesto,
                    "session_id": session_id,
                    "num_manos_esperadas": num_manos,
                    "timestamp": ahora_iso(),
                    "fps_objetivo": FPS_OBJETIVO,
                    "total_frames": len(buffer_frames),
                    "secuencia": buffer_frames,
                }
                nombre = nombre_archivo_muestra(gesto, session_id, "EST")
                out_path = Path(DIR_ESTATICO) / nombre
                try:
                    guardar_json(data, out_path)
                    guardados += 1
                    flash = (f"Guardado {guardados}: {gesto}",
                             COLOR_VERDE, ahora + 1200)
                    print(f"OK [{guardados}] {out_path}")
                except Exception as e:
                    flash = (f"Error al guardar: {e}", COLOR_ROJO, ahora + 2000)
                    print(f"ERROR al guardar: {e}")
                buffer_frames = []
                previo_puntos = None
                estado = IDLE

            # HUD y ventana
            dibujar_hud(frame, gesto, num_manos, session_id,
                        guardados, estado, flash_actual)
            cv2.imshow(VENTANA, frame)

            # Teclado
            key = cv2.waitKey(1) & 0xFF
            if key == 27:  # ESC
                if estado in (RECORDING, COUNTDOWN, WAITING_HANDS):
                    estado = IDLE
                    buffer_frames = []
                    previo_puntos = None
                    flash = ("Cancelado", COLOR_AMARILLO, ahora_ms() + 800)
                else:
                    break
            elif key == ord('g') or key == ord('G'):
                if estado == IDLE:
                    estado = WAITING_HANDS
                    t_estable_desde = None
            elif key == ord('c') or key == ord('C'):
                if estado == IDLE:
                    try:
                        cv2.waitKey(1)
                        nuevo = pedir_gesto("\nNuevo gesto: ")
                        gesto = nuevo
                        flash = (f"Gesto -> {gesto}", COLOR_AMARILLO,
                                 ahora_ms() + 900)
                    except (EOFError, KeyboardInterrupt):
                        pass
            elif key == ord('m') or key == ord('M'):
                if estado == IDLE:
                    try:
                        cv2.waitKey(1)
                        nuevo = pedir_num_manos("\nNuevo numero de manos (1/2): ")
                        if nuevo != num_manos:
                            num_manos = nuevo
                            # Recrear MediaPipe con nuevo max_num_hands
                            hands.close()
                            hands = crear_hands(num_manos=num_manos,
                                                modo_estatico=False)
                            flash = (f"Manos -> {num_manos}", COLOR_AMARILLO,
                                     ahora_ms() + 900)
                    except (EOFError, KeyboardInterrupt):
                        pass
    finally:
        try:
            hands.close()
        except Exception:
            pass
        cap.release()
        cv2.destroyAllWindows()
        print(f"\nTotal guardados en esta sesion: {guardados}")
        print("Hasta pronto.")


if __name__ == "__main__":
    main()
