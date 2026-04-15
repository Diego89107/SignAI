import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";
import useCamera from "../../hooks/useCamera";

export default function Camara() {
  const navigate = useNavigate();
  const { videoRef, active, errorMsg, start, stop } = useCamera({ autoStart: true });
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    try {
      if (typeof window.closeSidebar === "function") window.closeSidebar();
    } catch {}
  }, []);

  useEffect(() => {
    if (active) {
      const t = setTimeout(() => setFadeIn(true), 120);
      return () => clearTimeout(t);
    }
    setFadeIn(false);
  }, [active]);

  const handleVolver = () => {
    stop();
    navigate(-1);
  };

  const handleRetry = () => {
    setFadeIn(false);
    start();
  };

  return (
    <div className={`fixed inset-0 bg-black text-white ${fadeIn ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="fixed inset-0 w-full h-full object-cover"
      />

      <div className="absolute top-0 left-0 w-full bg-black/40 py-4 text-center backdrop-blur-sm">
        <h1 className="text-white text-2xl font-semibold tracking-wide">LSM Traductor</h1>
      </div>

      <button
        onClick={handleVolver}
        className="absolute top-6 left-6 flex items-center gap-2 text-white bg-black/40 hover:bg-black/60 px-4 py-2 rounded-lg transition-all"
      >
        <Undo2 size={22} strokeWidth={2.2} />
        <span className="hidden sm:inline font-medium">Volver</span>
      </button>

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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
