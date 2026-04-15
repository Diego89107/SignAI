import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";

export default function Camara() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Intenta varias configuraciones (del perfil más compatible al más exigente)
  const CONSTRAINTS_TRIES = [
    { video: true }, // súper compatible
    { video: { facingMode: "user" } },
    { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } },
    { video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" } },
  ];

  const stopStream = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
  };

  const startWithConstraintsList = useCallback(async () => {
    setErrorMsg("");
    stopStream();

    // Si hay sidebar abierto, ciérralo
    try {
      if (typeof window.closeSidebar === "function") window.closeSidebar();
    } catch {}

    // Comprueba que el navegador soporta mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg("Tu navegador no soporta acceso a cámara (getUserMedia).");
      return;
    }

    // Comprueba si hay cámaras disponibles
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devs.some((d) => d.kind === "videoinput");
      if (!hasVideo) {
        setErrorMsg("No se detectó ninguna cámara conectada.");
        return;
      }
    } catch {
      // Si enumerar falla, seguimos intentando igualmente
    }

    // Intenta secuencialmente
    for (const c of CONSTRAINTS_TRIES) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setTimeout(() => setFadeIn(true), 120);
          return; // ¡listo!
        }
      } catch (err) {
        // Guarda el último error; seguimos probando con el siguiente
        console.warn("Intento fallido con constraints:", c, err);
        if (err?.name === "NotAllowedError") {
          setErrorMsg(
            "Acceso denegado. Permite el uso de la cámara en el icono del candado (barra de direcciones) → Permisos → Cámara."
          );
          return; // si denegó permisos, no sigas probando
        } else if (err?.name === "NotFoundError") {
          setErrorMsg("No se encontró cámara. Verifica que esté conectada.");
        } else if (err?.name === "OverconstrainedError") {
          // Seguimos al siguiente perfil (normal)
        } else {
          setErrorMsg("No se pudo acceder a la cámara. Verifica permisos.");
        }
      }
    }

    // Si llegamos aquí, ningún perfil funcionó
    if (!errorMsg) {
      setErrorMsg("No se pudo inicializar la cámara. Intenta nuevamente o revisa permisos.");
    }
  }, [errorMsg]);

  useEffect(() => {
    startWithConstraintsList();
    return stopStream;
  }, [startWithConstraintsList]);

  const handleVolver = () => {
    stopStream();
    navigate(-1);
  };

  const handleRetry = () => {
    setFadeIn(false);
    startWithConstraintsList();
  };

  return (
    <div className={`fixed inset-0 bg-black text-white ${fadeIn ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}>
      {/* Video a pantalla completa */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="fixed inset-0 w-full h-full object-cover"
      />

      {/* Overlay superior (banner) */}
      <div className="absolute top-0 left-0 w-full bg-black/40 py-4 text-center backdrop-blur-sm">
        <h1 className="text-white text-2xl font-semibold tracking-wide">LSM Traductor</h1>
      </div>

      {/* Botón Volver */}
      <button
        onClick={handleVolver}
        className="absolute top-6 left-6 flex items-center gap-2 text-white bg-black/40 hover:bg-black/60 px-4 py-2 rounded-lg transition-all"
      >
        <Undo2 size={22} strokeWidth={2.2} />
        <span className="hidden sm:inline font-medium">Volver</span>
      </button>
      {/* Mensaje de error (si aplica) */}
      {errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="bg-black/60 rounded-xl p-6 max-w-md text-center space-y-4">
            <p className="text-sm leading-relaxed">{errorMsg}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition"
              >
                Reintentar
              </button>
              <button
                onClick={() => window.open("chrome://settings/content/camera", "_blank")}
                className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 transition"
              >
                Abrir permisos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
