"""
SignAI Server.py

Servidor local de inferencia para la app SignAI (Electron/React). Reusa el
pipeline de SignAI.py / comun.py (camara + MediaPipe + features + Transformer).

Expone:
    GET  /video   -> stream MJPEG del frame anotado con landmarks.
    WS   /ws      -> eventos JSON {tipo:"status"|"commit"|"hello"|"modelo"}.
    GET  /health  -> {ok:true} para que Electron sepa que ya arranco.

La camara se ABRE solo cuando hay al menos un cliente conectado (/video o /ws)
y se LIBERA cuando no hay ninguno, asi las demas pantallas (getUserMedia) pueden
tomar la camara cuando el usuario no esta traduciendo.

Uso:
    py "SignAI Server.py"
    SIGNAI_PORT=9000 SIGNAI_MANOS=2 py "SignAI Server.py"
"""
from __future__ import annotations

import os
import json
import time
import asyncio
import threading
from pathlib import Path
from collections import deque
from contextlib import asynccontextmanager

import cv2
import numpy as np
import torch

from comun import (
    crear_hands, extraer_manos, features_frame, ahora_ms, DIR_MODELOS,
    SignTransformer,
)
from SignAI import (
    construir_tensor, inferir_tta, dibujar_landmarks,
    MIN_FRAMES_INFER, INFER_CADA_FRAMES, HAND_GONE_MS_RESET,
    ANCHO_CAM, ALTO_CAM,
    IDLE, DETECTANDO,
)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import uvicorn


PORT = int(os.environ.get("SIGNAI_PORT", "8765"))
NUM_MANOS = int(os.environ.get("SIGNAI_MANOS", "1"))   # abecedario = 1 mano
CAM_INDEX = int(os.environ.get("SIGNAI_CAM", "0"))
JPEG_QUALITY = 70
IDLE_SLEEP = 0.05      # espera cuando no hay clientes (camara liberada)

# Frames acumulados antes de inferir: en vivo la camara corre mas rapido que los
# 25fps de grabacion, asi que una senia larga supera los 80 frames del modelo;
# construir_tensor submuestrea a 80 antes de inferir para no perder el arranque.
BUFFER_LEN = int(os.environ.get("SIGNAI_BUFFER", "80"))

# Confianza minima de la senia mas probable para mostrarla. Baja a proposito:
# el modelo da confianzas bajas en vivo. La letra se mantiene aunque fluctue.
MIN_SHOW_CONF = float(os.environ.get("SIGNAI_MIN_CONF", "0.10"))

# Una letra mostrada se mantiene hasta que OTRA distinta sea la mas probable en
# LIVE_SWITCH_FRAMES inferencias seguidas; evita el parpadeo por ruido.
LIVE_SWITCH_FRAMES = int(os.environ.get("SIGNAI_SWITCH_FRAMES", "3"))

# Estado extra (no viene de SignAI.py): senia ya predicha, se espera a que la
# mano se vaya para volver a capturar.
ESPERA = "ESPERA"

# Modelo a cargar al arrancar (clave = nombre de la subcarpeta en modelos/).
MODELO_DEFAULT = os.environ.get("SIGNAI_MODELO", "estatico").strip()

# Cada modelo vive en su subcarpeta de modelos/ con estos 3 archivos; la clave
# del modelo es el nombre de la carpeta (ej. "estatico", "dinamico").
ARCHIVOS_MODELO = ("signai_transformer.pth", "label_map.json", "feature_meta.json")


def descubrir_modelos() -> dict[str, Path]:
    """{nombre_carpeta: ruta} para cada subcarpeta de modelos/ con los 3 archivos.
    Si los archivos estan sueltos en modelos/ (layout antiguo) se expone como "default"."""
    modelos: dict[str, Path] = {}
    if DIR_MODELOS.exists():
        for sub in sorted(DIR_MODELOS.iterdir()):
            if sub.is_dir() and all((sub / a).exists() for a in ARCHIVOS_MODELO):
                modelos[sub.name] = sub
    if not modelos and all((DIR_MODELOS / a).exists() for a in ARCHIVOS_MODELO):
        modelos["default"] = DIR_MODELOS
    return modelos


def cargar_modelo_en(dir_modelo: Path, device):
    """Carga (model, clases, meta) desde una carpeta de modelo concreta."""
    p_modelo = dir_modelo / "signai_transformer.pth"
    p_label = dir_modelo / "label_map.json"
    p_meta = dir_modelo / "feature_meta.json"
    for p in (p_modelo, p_label, p_meta):
        if not p.exists():
            raise FileNotFoundError(f"falta {p}")

    with open(p_label, "r", encoding="utf-8") as f:
        clases = json.load(f)["classes"]
    with open(p_meta, "r", encoding="utf-8") as f:
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
    state = torch.load(p_modelo, map_location=device)
    model.load_state_dict(state)
    model.eval()
    return model, clases, meta


class Engine:
    """Corre la captura + inferencia en un hilo dedicado. Solo procesa cuando
    hay consumidores. Publica el ultimo JPEG y difunde eventos a los WS."""

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.clases = None
        self.meta = None

        self.modelos: dict[str, Path] = {}
        self.modelo_actual: str | None = None
        self._pending_modelo: str | None = None   # lo aplica el hilo del engine

        self._running = True
        self._consumers = 0
        self._consumers_lock = threading.Lock()

        self._jpeg = None
        self._jpeg_lock = threading.Lock()

        # Cada conexion WS registra una asyncio.Queue; el hilo difunde via
        # call_soon_threadsafe sobre el loop principal.
        self.loop: asyncio.AbstractEventLoop | None = None
        self.ws_queues: set[asyncio.Queue] = set()

        self._thread = threading.Thread(target=self._run, daemon=True, name="engine")

    def start(self):
        self.modelos = descubrir_modelos()
        if not self.modelos:
            raise RuntimeError(
                f"No se encontraron modelos en {DIR_MODELOS}. "
                f"Cada modelo debe estar en su subcarpeta con: {', '.join(ARCHIVOS_MODELO)}."
            )

        if MODELO_DEFAULT in self.modelos:
            self.modelo_actual = MODELO_DEFAULT
        elif "estatico" in self.modelos:
            self.modelo_actual = "estatico"
        else:
            self.modelo_actual = next(iter(self.modelos))

        print(f"[engine] modelos disponibles: {list(self.modelos)}")
        print(f"[engine] cargando '{self.modelo_actual}' en {self.device} ...")
        self.model, self.clases, self.meta = cargar_modelo_en(
            self.modelos[self.modelo_actual], self.device)
        print(f"[engine] clases ({len(self.clases)}): {self.clases}")
        self._thread.start()

    def stop(self):
        self._running = False

    def set_modelo(self, key: str) -> bool:
        """Solicita cambiar al modelo `key`; lo aplica el hilo del engine en el
        proximo ciclo. Devuelve False si el modelo no existe."""
        if key not in self.modelos:
            return False
        self._pending_modelo = key
        return True

    def add_consumer(self):
        with self._consumers_lock:
            self._consumers += 1

    def remove_consumer(self):
        with self._consumers_lock:
            self._consumers = max(0, self._consumers - 1)

    @property
    def active(self) -> bool:
        with self._consumers_lock:
            return self._consumers > 0

    def get_jpeg(self):
        with self._jpeg_lock:
            return self._jpeg

    def _set_jpeg(self, frame):
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        if ok:
            with self._jpeg_lock:
                self._jpeg = buf.tobytes()

    def broadcast(self, event: dict):
        if self.loop is None:
            return
        for q in list(self.ws_queues):
            try:
                self.loop.call_soon_threadsafe(q.put_nowait, event)
            except Exception:
                pass

    def _run(self):
        cap = None
        hands = None

        buffer_static = deque(maxlen=BUFFER_LEN)
        estado = IDLE
        frame_count = 0
        sin_mano_desde_ms = None

        # Letra mostrada (verde) y su confianza; persisten hasta que otra senia
        # distinta pase a ser la mas probable.
        shown_txt = ""
        shown_conf = 0.0
        cand = None             # candidata a reemplazar a la mostrada
        cand_count = 0          # inferencias seguidas a favor del candidato
        emitida = ""            # ultima letra emitida como commit (no repetir)
        live_top3 = None

        def full_reset():
            nonlocal estado, sin_mano_desde_ms, shown_txt, shown_conf
            nonlocal cand, cand_count, emitida, live_top3
            buffer_static.clear()
            estado = IDLE
            sin_mano_desde_ms = None
            shown_txt = ""
            shown_conf = 0.0
            cand = None
            cand_count = 0
            emitida = ""
            live_top3 = None

        while self._running:
            # Cambio de modelo solicitado (se aplica aqui, en este hilo).
            pend = self._pending_modelo
            if pend is not None:
                self._pending_modelo = None
                if pend != self.modelo_actual and pend in self.modelos:
                    try:
                        m, c, mt = cargar_modelo_en(self.modelos[pend], self.device)
                        self.model, self.clases, self.meta = m, c, mt
                        self.modelo_actual = pend
                        full_reset()
                        print(f"[engine] modelo cambiado a '{pend}' "
                              f"({len(c)} clases)", flush=True)
                        self.broadcast({"tipo": "modelo", "actual": pend, "clases": c})
                    except Exception as e:
                        print(f"[engine] error al cambiar a '{pend}': {e}", flush=True)
                        self.broadcast({
                            "tipo": "error",
                            "msg": f"No se pudo cargar el modelo '{pend}'.",
                        })

            # Sin consumidores: liberar camara y dormir.
            if not self.active:
                if cap is not None:
                    cap.release()
                    cap = None
                if hands is not None:
                    try:
                        hands.close()
                    except Exception:
                        pass
                    hands = None
                full_reset()
                with self._jpeg_lock:
                    self._jpeg = None
                time.sleep(IDLE_SLEEP)
                continue

            if cap is None:
                cap = cv2.VideoCapture(CAM_INDEX)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, ANCHO_CAM)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, ALTO_CAM)
                hands = crear_hands(num_manos=NUM_MANOS, modo_estatico=False)
                full_reset()
                if not cap.isOpened():
                    print("[engine] ERROR: no se pudo abrir la camara.")
                    self.broadcast({"tipo": "error", "msg": "No se pudo abrir la camara."})
                    cap = None
                    time.sleep(0.5)
                    continue

            ok, frame = cap.read()
            if not ok:
                time.sleep(0.01)
                continue

            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)
            manos = extraer_manos(results)
            dibujar_landmarks(frame, manos)

            r_pts = manos["Right"]["world"] if manos.get("Right") else None
            l_pts = manos["Left"]["world"] if manos.get("Left") else None
            hand_present = (r_pts is not None) or (l_pts is not None)
            feat = features_frame(r_pts, l_pts)

            frame_count += 1
            commit_ahora = None  # se setea si la letra mostrada cambia

            if estado == IDLE:
                if hand_present:
                    estado = DETECTANDO
                    buffer_static.clear()
                    buffer_static.append(feat)
                    sin_mano_desde_ms = None
                    # shown_txt NO se borra: la letra verde persiste hasta la
                    # siguiente prediccion.

            elif estado == DETECTANDO:
                # Se acumulan frames hasta llenar el buffer; recien entonces se
                # corre el modelo, asi la prediccion ve la senia entera.
                buffer_static.append(feat)

                if not hand_present:
                    if sin_mano_desde_ms is None:
                        sin_mano_desde_ms = ahora_ms()
                    if ahora_ms() - sin_mano_desde_ms > HAND_GONE_MS_RESET:
                        # Senia incompleta -> vuelve a IDLE (conserva la letra verde).
                        estado = IDLE
                        buffer_static.clear()
                        sin_mano_desde_ms = None
                else:
                    sin_mano_desde_ms = None

                if estado == DETECTANDO and len(buffer_static) >= BUFFER_LEN:
                    X, mask = construir_tensor(list(buffer_static))
                    pred_idx, conf, probs = inferir_tta(self.model, X, mask, self.device)
                    top_idx = np.argsort(-probs)[:3]
                    live_top3 = [[self.clases[i], float(probs[i])] for i in top_idx]

                    shown_txt = self.clases[pred_idx]
                    shown_conf = conf
                    estado = ESPERA
                    sin_mano_desde_ms = None

                    emitida = shown_txt
                    commit_ahora = (shown_txt, shown_conf)
                    print(f"[seña] {shown_txt}  ({shown_conf*100:.0f}%)", flush=True)

            elif estado == ESPERA:
                # Senia ya predicha: se mantiene mostrada y se espera a que la
                # mano se vaya para volver a capturar.
                if not hand_present:
                    if sin_mano_desde_ms is None:
                        sin_mano_desde_ms = ahora_ms()
                    if ahora_ms() - sin_mano_desde_ms > HAND_GONE_MS_RESET:
                        estado = IDLE
                        buffer_static.clear()
                        sin_mano_desde_ms = None
                        # se limpia para que la misma senia, repetida en un gesto
                        # nuevo, vuelva a emitir commit.
                        emitida = ""
                else:
                    sin_mano_desde_ms = None

            self._set_jpeg(frame)

            if commit_ahora is not None:
                self.broadcast({
                    "tipo": "commit",
                    "letra": commit_ahora[0],
                    "conf": round(float(commit_ahora[1]), 4),
                })

            if frame_count % INFER_CADA_FRAMES == 0 or commit_ahora is not None:
                self.broadcast({
                    "tipo": "status",
                    "estado": estado,
                    "letra": shown_txt,
                    "conf": round(float(shown_conf), 4),
                    "top3": live_top3,
                    "buffer": len(buffer_static),
                    "hand": hand_present,
                })

        if cap is not None:
            cap.release()
        if hands is not None:
            try:
                hands.close()
            except Exception:
                pass


engine = Engine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine.loop = asyncio.get_running_loop()
    engine.start()
    yield
    engine.stop()


app = FastAPI(title="SignAI Inference Server", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return JSONResponse({
        "ok": True,
        "clases": engine.clases or [],
        "modelos": list(engine.modelos.keys()),
        "modelo": engine.modelo_actual,
    })


@app.get("/modelos")
async def modelos():
    return JSONResponse({
        "modelos": list(engine.modelos.keys()),
        "actual": engine.modelo_actual,
    })


@app.post("/modelo")
async def cambiar_modelo(modelo: str):
    if not engine.set_modelo(modelo):
        return JSONResponse(
            {"ok": False,
             "msg": f"Modelo '{modelo}' no existe.",
             "modelos": list(engine.modelos.keys())},
            status_code=404,
        )
    return JSONResponse({"ok": True, "modelo": modelo})


@app.get("/video")
async def video():
    engine.add_consumer()

    async def gen():
        try:
            while True:
                jpeg = engine.get_jpeg()
                if jpeg is not None:
                    yield (b"--frame\r\n"
                           b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n")
                await asyncio.sleep(1 / 30)
        finally:
            engine.remove_consumer()

    return StreamingResponse(
        gen(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await websocket.accept()
    engine.add_consumer()
    q: asyncio.Queue = asyncio.Queue()
    engine.ws_queues.add(q)
    try:
        # enviar clases y modelos al conectar (la UI los usa para el selector)
        await websocket.send_json({
            "tipo": "hello",
            "clases": engine.clases,
            "modelos": list(engine.modelos.keys()),
            "modelo": engine.modelo_actual,
        })
        while True:
            event = await q.get()
            await websocket.send_json(event)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        engine.ws_queues.discard(q)
        engine.remove_consumer()


if __name__ == "__main__":
    print("=" * 60)
    print(f"SignAI server  ->  http://127.0.0.1:{PORT}")
    print(f"  /video  (MJPEG)   /ws  (WebSocket)   /health")
    print(f"  manos={NUM_MANOS}  cam={CAM_INDEX}")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")
