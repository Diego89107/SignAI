import { useCallback, useEffect, useRef, useState } from "react";

export default function useCamera({ autoStart = false, constraintsList } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const defaultList = [
    { video: true },
    { video: { facingMode: "user" } },
    { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } },
    { video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" } },
  ];

  const applyDeviceId = (c) => {
    const saved = localStorage.getItem("camara_lsm");
    if (!saved) return c;
    if (c.video === true) return { video: { deviceId: { exact: saved } } };
    return { ...c, video: { ...c.video, deviceId: { exact: saved } } };
  };

  const stop = useCallback(() => {
    const s = streamRef.current;
    if (s) s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    stop();

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg("Tu navegador no soporta acceso a cámara (getUserMedia).");
      setLoading(false);
      return false;
    }

    const tries = (constraintsList || defaultList).map(applyDeviceId);

    for (const c of tries) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setActive(true);
        setLoading(false);
        return true;
      } catch (err) {
        if (err?.name === "NotAllowedError") {
          setErrorMsg("Acceso denegado. Permite el uso de la cámara en tu navegador.");
          setLoading(false);
          return false;
        }
        if (err?.name === "NotFoundError") {
          setErrorMsg("No se encontró cámara. Verifica que esté conectada.");
        } else if (err?.name !== "OverconstrainedError") {
          setErrorMsg("No se pudo acceder a la cámara. Verifica permisos.");
        }
      }
    }
    setLoading(false);
    return false;
  }, [constraintsList, stop]);

  useEffect(() => {
    if (autoStart) start();
    return () => stop();
  }, [autoStart, start, stop]);

  return { videoRef, active, loading, errorMsg, start, stop, setErrorMsg };
}
