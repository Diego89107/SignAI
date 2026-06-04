import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";
import useSignServer from "../../hooks/useSignServer";
import useSpeech from "../../hooks/useSpeech";
import Tutorial from "../common/Tutorial";

const CAMARA_TUTORIAL_STEPS = [
  {
    key: "camara-volver",
    title: "Volver",
    text: "Pulsa aquí en cualquier momento para detener la cámara y regresar a la pantalla anterior.",
    placement: "bottom",
    padding: 12,
  },
  {
    key: "camara-video",
    title: "Vista en vivo",
    text: "Aquí se muestra tu cámara con las manos detectadas. Realiza la seña de una letra y mantenla un instante para que se traduzca y se escuche.",
    placement: "top",
    padding: 4,
  },
];

// Etiquetas bonitas para el selector de modelos. La clave es el nombre de la
// carpeta del modelo en el servidor; si no esta aquí se capitaliza la clave.
const MODELO_LABELS = {
  estatico: "Estático",
  dinamico: "Dinámico",
};
const etiquetaModelo = (k) =>
  MODELO_LABELS[k] || (k ? k.charAt(0).toUpperCase() + k.slice(1) : k);

export default function Camara() {
  const navigate = useNavigate();
  const { speak } = useSpeech();
  const [fadeIn, setFadeIn] = useState(false);

  // Cada letra confirmada por el modelo se pronuncia por voz.
  const handleCommit = useCallback((c) => speak(c.letra), [speak]);

  const { connected, videoUrl, status, modelos, modelo, setModelo } =
    useSignServer({ onCommit: handleCommit });

  useEffect(() => {
    try {
      if (typeof window.closeSidebar === "function") window.closeSidebar();
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setFadeIn(true), 120);
    return () => clearTimeout(t);
  }, []);

  const handleVolver = () => navigate(-1);

  return (
    <div
      className={`fixed inset-0 bg-black text-white ${
        fadeIn ? "opacity-100" : "opacity-0"
      } transition-opacity duration-500`}
    >
      {videoUrl && (
        <img
          src={videoUrl}
          data-tutorial="camara-video"
          alt="Cámara"
          className="fixed inset-0 w-full h-full object-cover"
        />
      )}

      <div className="absolute top-0 left-0 w-full bg-black/40 py-4 text-center backdrop-blur-sm">
        <h1 className="text-white text-2xl font-semibold tracking-wide">LSM Traductor</h1>
      </div>

      {/* Selector de modelo (solo si hay más de uno disponible) */}
      {connected && modelos.length > 1 && (
        <div className="absolute top-6 right-6 z-20 flex gap-1 rounded-lg bg-black/40 p-1 backdrop-blur-sm">
          {modelos.map((m) => (
            <button
              key={m}
              onClick={() => setModelo(m)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                m === modelo
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/20"
              }`}
            >
              {etiquetaModelo(m)}
            </button>
          ))}
        </div>
      )}

      <button
        data-tutorial="camara-volver"
        onClick={handleVolver}
        className="absolute top-6 left-6 flex items-center gap-2 text-white bg-black/40 hover:bg-black/60 px-4 py-2 rounded-lg transition-all z-20"
      >
        <Undo2 size={22} strokeWidth={2.2} />
        <span className="hidden sm:inline font-medium">Volver</span>
      </button>

      {/* Letra reconocida (la mas probable). Se mantiene hasta ver otra. */}
      {status.letra && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
          <div className="font-black leading-none drop-shadow-lg text-8xl text-green-400">
            {status.letra}
          </div>
          <div className="mt-1 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
            {Math.round((status.conf || 0) * 100)}%
          </div>
        </div>
      )}

      {!connected && (
        <div className="absolute inset-0 flex items-center justify-center p-6 z-30">
          <div className="bg-black/70 rounded-xl p-6 max-w-md text-center space-y-3">
            <div className="mx-auto animate-spin rounded-full h-9 w-9 border-4 border-white/30 border-t-white" />
            <p className="text-sm leading-relaxed">
              Conectando con el motor de traducción…
            </p>
            <p className="text-xs text-white/50">
              Si tarda, verifica que el servidor de señas esté en ejecución.
            </p>
          </div>
        </div>
      )}

      {connected && <Tutorial steps={CAMARA_TUTORIAL_STEPS} storageKey="tourSignAI_camara" />}
    </div>
  );
}
