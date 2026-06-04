import { useCallback, useEffect, useRef, useState } from "react";

// Servidor local de inferencia (Python). El mismo proceso sirve el video
// MJPEG y los eventos por WebSocket. Cambia el puerto aquí si lo modificas
// en server.py (SIGNAI_PORT).
const HOST = "127.0.0.1:8765";
const HTTP = `http://${HOST}`;
const WS_URL = `ws://${HOST}/ws`;

/**
 * Conecta con el servidor de señas mientras el componente esté montado.
 *
 * - `videoUrl`: URL del stream MJPEG para un <img>. Al desmontar se vacía,
 *   lo que detiene el <img> y libera la cámara en el servidor (junto con el
 *   cierre del WebSocket). Así otras pantallas pueden usar getUserMedia.
 * - `status`: estado en vivo { estado, letra, conf, top3, hand, buffer }.
 * - `lastCommit`: última seña confirmada { letra, conf, id }. El `id` cambia
 *   en cada commit nuevo (útil como dependencia de efectos).
 * - `onCommit`: callback opcional que se llama en cada commit.
 *
 * @param {{ enabled?: boolean, onCommit?: (c:{letra:string,conf:number,id:number})=>void }} opts
 */
export default function useSignServer({ enabled = true, onCommit } = {}) {
  const [connected, setConnected] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState({
    estado: "IDLE",
    letra: "",
    conf: 0,
    top3: null,
    hand: false,
    buffer: 0,
  });
  const [lastCommit, setLastCommit] = useState(null);
  // Modelos disponibles en el servidor y cual esta activo (para el selector).
  const [modelos, setModelos] = useState([]);
  const [modelo, setModeloActual] = useState(null);

  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const commitSeq = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setVideoUrl("");
      return;
    }

    let stopped = false;
    let ws = null;
    let reconnectTimer = null;

    const connect = () => {
      if (stopped) return;
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setConnected(true);
        // El servidor ya responde: ahora sí pedimos el stream MJPEG.
        // El cache-bust fuerza un <img> nuevo (consumidor nuevo) en cada
        // (re)conexión, evitando que quede pegado a un intento fallido.
        setVideoUrl(`${HTTP}/video?t=${Date.now()}`);
      };

      ws.onclose = () => {
        setConnected(false);
        setVideoUrl(""); // el stream también murió; se repide al reconectar
        if (!stopped) reconnectTimer = setTimeout(connect, 1000);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };

      ws.onmessage = (e) => {
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        if (msg.tipo === "hello") {
          if (Array.isArray(msg.modelos)) setModelos(msg.modelos);
          if (msg.modelo) setModeloActual(msg.modelo);
        } else if (msg.tipo === "modelo") {
          // El servidor confirma el cambio de modelo (a todos los clientes).
          if (msg.actual) setModeloActual(msg.actual);
        } else if (msg.tipo === "status") {
          setStatus({
            estado: msg.estado,
            letra: msg.letra || "",
            conf: msg.conf || 0,
            top3: msg.top3 || null,
            hand: !!msg.hand,
            buffer: msg.buffer || 0,
          });
        } else if (msg.tipo === "commit") {
          const c = { letra: msg.letra, conf: msg.conf, id: ++commitSeq.current };
          setLastCommit(c);
          onCommitRef.current?.(c);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {}
      setConnected(false);
      setVideoUrl(""); // detiene el <img> -> libera la cámara del servidor
    };
  }, [enabled]);

  // Cambia el modelo activo en el servidor. Actualiza el estado de forma
  // optimista; el servidor confirma luego con un evento "modelo" por WS.
  const setModelo = useCallback((key) => {
    if (!key) return;
    setModeloActual(key);
    fetch(`${HTTP}/modelo?modelo=${encodeURIComponent(key)}`, {
      method: "POST",
    }).catch(() => {});
  }, []);

  return { connected, videoUrl, status, lastCommit, modelos, modelo, setModelo };
}
