from __future__ import annotations

import sys
from pathlib import Path

import cv2

from comun import (
    DIR_DINAMICO, FPS_OBJETIVO, CONF_VERDE,
    MS_ESTABLE_PARA_COUNTDOWN, SEG_COUNTDOWN,
    MS_QUIETUD_PARA_FIN, MS_MARGEN_TRIM, UMBRAL_MOVIMIENTO,
    SEG_MAX_DINAMICO, SEG_MIN_DINAMICO,
    crear_hands, extraer_manos, movimiento_global,
    nuevo_session_id, ahora_iso, ahora_ms,
    guardar_json, nombre_archivo_muestra,
)

ANCHO_CAM = 1280
ALTO_CAM = 720
VENTANA = "SignAI"

COLOR_VERDE = (0, 220, 0)
COLOR_ROJO = (0, 40, 220)
COLOR_AMARILLO = (0, 220, 220)
COLOR_BLANCO = (240, 240, 240)
COLOR_NEGRO = (20, 20, 20)
COLOR_AZUL = (220, 120, 0)


IDLE = "EN ESPERA"
WAITING_HANDS = "BUSCANDO MANOS"
COUNTDOWN = "CUENTA REGRESIVA"
RECORDING = "GRABANDO"
REVIEW = "REVISION"
SAVING = "GUARDANDO"


# ============================================================================
# HELPERS (reusan los mismos helpers visuales que el estatico pero inlined
# para no acoplarlos entre recorders)
# ============================================================================

def _bbox(pts_img, w, h, pad=25):
    xs = [int(p[0] * w) for p in pts_img]
    ys = [int(p[1] * h) for p in pts_img]
    x1 = max(0, min(xs) - pad)
    y1 = max(0, min(ys) - pad)
    x2 = min(w - 1, max(xs) + pad)
    y2 = min(h - 1, max(ys) + pad)
    return x1, y1, x2, y2


def dibujar_landmarks(frame, manos):
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


def dibujar_verde(frame, manos, solido=False):
    h, w, _ = frame.shape
    for lado in ("Right", "Left"):
        if manos.get(lado) is None:
            continue
        x1, y1, x2, y2 = _bbox(manos[lado]["image"], w, h)
        if solido:
            overlay = frame.copy()
            cv2.rectangle(overlay, (x1, y1), (x2, y2), COLOR_VERDE, -1)
            cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)
        cv2.rectangle(frame, (x1, y1), (x2, y2), COLOR_VERDE, 3)


def dibujar_countdown(frame, n):
    h, w, _ = frame.shape
    texto = str(n)
    (tw, th), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, 8, 18)
    cv2.putText(frame, texto, ((w - tw) // 2, (h + th) // 2),
                cv2.FONT_HERSHEY_SIMPLEX, 8, COLOR_AMARILLO, 22, cv2.LINE_AA)


def dibujar_grabando(frame, seg):
    h, w, _ = frame.shape
    cv2.rectangle(frame, (0, 80), (w, 150), (0, 0, 100), -1)
    cv2.putText(frame, f"GRABANDO  {seg:.2f}s",
                (30, 115), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)


def dibujar_hud(frame, gesto, num_manos, session_id, guardados, estado, flash):
    h, w, _ = frame.shape
    cv2.rectangle(frame, (0, 0), (w, 70), COLOR_NEGRO, -1)
    cv2.putText(frame, f"Gesto: {gesto}", (20, 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, COLOR_AMARILLO, 2)
    cv2.putText(frame, f"Manos: {num_manos}   Guardados (sesion): {guardados}",
                (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_BLANCO, 1)
    cv2.putText(frame, f"Sesion: {session_id}", (w - 320, 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_BLANCO, 1)
    cv2.putText(frame, f"Estado: {estado}", (w - 320, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_VERDE, 1)

    cv2.rectangle(frame, (0, h - 40), (w, h), COLOR_NEGRO, -1)
    cv2.putText(frame,
                "[G] Grabar   [C] Gesto   [M] Manos   [S/R/ESC] En REVISION   [ESC] Salir",
                (20, h - 13), cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_BLANCO, 1)

    if flash:
        texto, color = flash
        (tw, th), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)
        x = (w - tw) // 2
        y = h - 90
        cv2.rectangle(frame, (x - 18, y - th - 14), (x + tw + 18, y + 12),
                      COLOR_NEGRO, -1)
        cv2.putText(frame, texto, (x, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)


def dibujar_review(frame, dur_ms, dur_trim_ms):
    h, w, _ = frame.shape
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, h), COLOR_NEGRO, -1)
    cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)

    cv2.putText(frame, "REVISION",
                (w // 2 - 130, 180),
                cv2.FONT_HERSHEY_SIMPLEX, 1.5, COLOR_AZUL, 3)
    cv2.putText(frame, f"Duracion: {dur_trim_ms} ms",
                (60, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.9, COLOR_BLANCO, 2)
    cv2.putText(frame, "[S] Guardar",
                (60, 400), cv2.FONT_HERSHEY_SIMPLEX, 0.95, COLOR_VERDE, 2)
    cv2.putText(frame, "[R] Regrabar",
                (60, 445), cv2.FONT_HERSHEY_SIMPLEX, 0.95, COLOR_AMARILLO, 2)
    cv2.putText(frame, "[ESC] Cancelar",
                (60, 490), cv2.FONT_HERSHEY_SIMPLEX, 0.95, COLOR_ROJO, 2)


# ============================================================================
# LOGICA
# ============================================================================

def manos_ok(manos, num_manos):
    presentes = [m for m in (manos.get("Right"), manos.get("Left")) if m is not None]
    if len(presentes) < num_manos:
        return False
    return all(m["score"] >= CONF_VERDE for m in presentes[:num_manos])


def frame_dict_desde_manos(manos):
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


def extraer_pts_mov(frame_dict):
    return {
        lado: (frame_dict[lado]["world"] if frame_dict.get(lado) else None)
        for lado in ("Right", "Left")
    }


def trim_buffer(buffer_frames_t, quietud_inicio_ms):
    """
    buffer_frames_t: lista de (frame_dict, t_ms_abs).
    quietud_inicio_ms: timestamp abs en que empezo la quietud (o None si no hubo).
    Devuelve lista de frame_dicts tras recortar.
    """
    if quietud_inicio_ms is None:
        return [fd for fd, _ in buffer_frames_t]
    cutoff = quietud_inicio_ms + MS_MARGEN_TRIM
    return [fd for fd, t in buffer_frames_t if t <= cutoff]


def pedir_gesto(prompt="Nombre del gesto (HOLA, GRACIAS, etc): "):
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
    print("SignAI")
    print("=" * 64)
    gesto = pedir_gesto()
    num_manos = pedir_num_manos()

    session_id = nuevo_session_id()
    print(f"session_id: {session_id}")
    print(f"Salida: {DIR_DINAMICO}")
    print("Abriendo camara...")

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, ANCHO_CAM)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, ALTO_CAM)
    if not cap.isOpened():
        print("ERROR: no se pudo abrir la camara.")
        sys.exit(1)

    cv2.namedWindow(VENTANA, cv2.WINDOW_NORMAL)

    estado = IDLE
    guardados = 0
    flash = None
    t_estable_desde = None
    countdown_ms_inicio = None

    buffer_frames_t = []       # [(frame_dict, t_ms_abs), ...]
    rec_inicio_ms = None
    ultimo_grabado_ms = 0
    ms_por_frame = 1000.0 / FPS_OBJETIVO

    pts_prev_mov = None
    ms_quieto = 0
    quietud_inicio_ms = None
    en_movimiento = True

    # Para REVIEW
    review_data = None

    hands = crear_hands(num_manos=num_manos, modo_estatico=False)

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

            if estado not in (REVIEW, SAVING):
                dibujar_landmarks(frame, manos)

            ahora = ahora_ms()
            flash_actual = None
            if flash is not None:
                texto, color, hasta = flash
                if ahora < hasta:
                    flash_actual = (texto, color)
                else:
                    flash = None

            # --- ESTADOS ---
            if estado == IDLE:
                pass

            elif estado == WAITING_HANDS:
                if manos_ok(manos, num_manos):
                    if t_estable_desde is None:
                        t_estable_desde = ahora
                    dibujar_verde(frame, manos, solido=True)
                    if (ahora - t_estable_desde) >= MS_ESTABLE_PARA_COUNTDOWN:
                        estado = COUNTDOWN
                        countdown_ms_inicio = ahora
                else:
                    t_estable_desde = None
                    cv2.putText(frame,
                                f"Coloca {num_manos} mano(s) frente a la camara",
                                (30, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.9,
                                COLOR_AMARILLO, 2)

            elif estado == COUNTDOWN:
                if not manos_ok(manos, num_manos):
                    estado = WAITING_HANDS
                    t_estable_desde = None
                    flash = ("Countdown cancelado", COLOR_AMARILLO, ahora + 800)
                else:
                    transcurrido = (ahora - countdown_ms_inicio) / 1000.0
                    restante = SEG_COUNTDOWN - int(transcurrido)
                    if restante <= 0:
                        estado = RECORDING
                        buffer_frames_t = []
                        rec_inicio_ms = ahora
                        ultimo_grabado_ms = 0
                        pts_prev_mov = None
                        ms_quieto = 0
                        quietud_inicio_ms = None
                        en_movimiento = True
                    else:
                        dibujar_verde(frame, manos, solido=False)
                        dibujar_countdown(frame, restante)

            elif estado == RECORDING:
                # Limite maximo de seguridad
                dur_actual_ms = ahora - rec_inicio_ms
                if dur_actual_ms >= SEG_MAX_DINAMICO * 1000:
                    # Forzar fin
                    quietud_inicio_ms = quietud_inicio_ms or ahora
                    estado = REVIEW
                    review_data = _preparar_review(buffer_frames_t,
                                                   rec_inicio_ms,
                                                   quietud_inicio_ms)
                    if review_data is None:
                        flash = ("Grabacion invalida (muy corta)",
                                 COLOR_ROJO, ahora + 1500)
                        estado = IDLE
                        buffer_frames_t = []
                    else:
                        flash = ("Limite maximo alcanzado", COLOR_AMARILLO,
                                 ahora + 1200)

                # Captura pacing
                if (ahora - ultimo_grabado_ms) >= ms_por_frame and estado == RECORDING:
                    fd = frame_dict_desde_manos(manos)
                    pts_act = extraer_pts_mov(fd)

                    # Calcular movimiento vs frame anterior
                    if pts_prev_mov is not None:
                        mov = movimiento_global(pts_prev_mov, pts_act)
                    else:
                        mov = 0.0

                    if mov < UMBRAL_MOVIMIENTO:
                        en_movimiento = False
                        if quietud_inicio_ms is None:
                            quietud_inicio_ms = ahora
                        ms_quieto = ahora - quietud_inicio_ms
                    else:
                        en_movimiento = True
                        quietud_inicio_ms = None
                        ms_quieto = 0

                    buffer_frames_t.append((fd, ahora - rec_inicio_ms))
                    pts_prev_mov = pts_act
                    ultimo_grabado_ms = ahora

                    # Fin por quietud sostenida
                    if (quietud_inicio_ms is not None
                            and ms_quieto >= MS_QUIETUD_PARA_FIN):
                        estado = REVIEW
                        review_data = _preparar_review(buffer_frames_t,
                                                       rec_inicio_ms,
                                                       quietud_inicio_ms)
                        if review_data is None:
                            flash = ("Grabacion muy corta, descartada",
                                     COLOR_ROJO, ahora + 1500)
                            estado = IDLE
                            buffer_frames_t = []

                if estado == RECORDING:
                    dibujar_grabando(frame, dur_actual_ms / 1000.0)

            elif estado == REVIEW:
                if review_data is not None:
                    dibujar_review(frame,
                                   review_data["dur_cruda_ms"],
                                   review_data["dur_trim_ms"])
                else:
                    estado = IDLE

            elif estado == SAVING:
                if review_data is not None:
                    data = {
                        "tipo": "dinamico",
                        "gesto": gesto,
                        "session_id": session_id,
                        "num_manos_esperadas": num_manos,
                        "timestamp": ahora_iso(),
                        "fps_objetivo": FPS_OBJETIVO,
                        "total_frames": review_data["total_frames"],
                        "dur_ms": review_data["dur_trim_ms"],
                        "secuencia": review_data["secuencia"],
                    }
                    nombre = nombre_archivo_muestra(gesto, session_id, "DIN")
                    out_path = Path(DIR_DINAMICO) / nombre
                    try:
                        guardar_json(data, out_path)
                        guardados += 1
                        flash = (f"Guardado {guardados}: {gesto}",
                                 COLOR_VERDE, ahora + 1200)
                        print(f"OK [{guardados}] {out_path}")
                    except Exception as e:
                        flash = (f"Error al guardar: {e}", COLOR_ROJO,
                                 ahora + 2000)
                        print(f"ERROR al guardar: {e}")
                review_data = None
                buffer_frames_t = []
                estado = IDLE

            dibujar_hud(frame, gesto, num_manos, session_id,
                        guardados, estado, flash_actual)
            cv2.imshow(VENTANA, frame)

            # Teclado
            key = cv2.waitKey(1) & 0xFF
            if key == 27:
                if estado == REVIEW:
                    flash = ("Cancelado", COLOR_AMARILLO, ahora_ms() + 800)
                    review_data = None
                    estado = IDLE
                elif estado in (RECORDING, COUNTDOWN, WAITING_HANDS):
                    flash = ("Cancelado", COLOR_AMARILLO, ahora_ms() + 800)
                    buffer_frames_t = []
                    estado = IDLE
                else:
                    break
            elif key == ord('s') or key == ord('S'):
                if estado == REVIEW:
                    estado = SAVING
            elif key == ord('r') or key == ord('R'):
                if estado == REVIEW:
                    review_data = None
                    estado = IDLE
                    flash = ("Listo para regrabar", COLOR_AMARILLO,
                             ahora_ms() + 800)
            elif key == ord('g') or key == ord('G'):
                if estado == IDLE:
                    estado = WAITING_HANDS
                    t_estable_desde = None
            elif key == ord('c') or key == ord('C'):
                if estado == IDLE:
                    try:
                        cv2.waitKey(1)
                        gesto = pedir_gesto("\nNuevo gesto: ")
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


def _preparar_review(buffer_frames_t, rec_inicio_ms, quietud_inicio_ms):
    """
    Aplica trim y valida duracion minima. Devuelve dict con datos para REVIEW
    o None si la grabacion es demasiado corta.
    """
    if not buffer_frames_t:
        return None
    dur_cruda_ms = buffer_frames_t[-1][1]  # t_rel del ultimo frame
    secuencia = trim_buffer(buffer_frames_t, quietud_inicio_ms)
    if not secuencia:
        return None
    # duracion efectiva estimada por numero de frames
    dur_trim_ms = int(round(len(secuencia) / FPS_OBJETIVO * 1000.0))
    return {
        "total_frames": len(secuencia),
        "dur_cruda_ms": int(dur_cruda_ms),
        "dur_trim_ms": dur_trim_ms,
        "secuencia": secuencia,
    }


if __name__ == "__main__":
    main()
