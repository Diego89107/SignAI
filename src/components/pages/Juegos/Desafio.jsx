import React, { useState, useEffect } from "react";
import { Camera, Play, StopCircle, Timer, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useCamera from "../../../hooks/useCamera";
import { palabrasDesafio as listaDesafio } from "../../../data/palabras";
import PageHeader from "../../common/PageHeader";

export default function Desafio({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();

  // ESTADOS DEL JUEGO
  const [juegoIniciado, setJuegoIniciado] = useState(false);
  const [rondaActual, setRondaActual] = useState(0);
  const [estadoRonda, setEstadoRonda] = useState("esperando");
  const [tiempoRestante, setTiempoRestante] = useState(20);
  const [puntaje, setPuntaje] = useState(0);

  const { videoRef, active: cameraActive, errorMsg, loading, start, stop: stopStream } = useCamera();

  useEffect(() => {
    if (typeof setSidebarOpen === "function") setSidebarOpen(false);
  }, [setSidebarOpen]);

  // LÓGICA DEL TEMPORIZADOR
  useEffect(() => {
    let timer;
    if (juegoIniciado && estadoRonda === "jugando" && tiempoRestante > 0) {
      timer = setInterval(() => {
        setTiempoRestante((prev) => prev - 1);
      }, 1000);
    } else if (tiempoRestante === 0 && estadoRonda === "jugando") {
      setEstadoRonda("fracaso");
      stopStream();
    }
    return () => clearInterval(timer);
  }, [juegoIniciado, estadoRonda, tiempoRestante]);

  const startCamera = async () => {
    const ok = await start();
    if (ok) {
      setJuegoIniciado(true);
      setEstadoRonda("jugando");
      setTiempoRestante(20);
    }
  };

  const manejarAcierto = () => {
    if (estadoRonda !== "jugando") return;
    
    setEstadoRonda("exito");
    setPuntaje((prev) => prev + 1);

    setTimeout(() => {
      if (rondaActual + 1 < listaDesafio.length) {
        setRondaActual((prev) => prev + 1);
        setTiempoRestante(20); 
        setEstadoRonda("jugando");
      } else {
        setEstadoRonda("terminado");
        stopStream();
      }
    }, 2000);
  };

  const reiniciarJuego = () => {
    setRondaActual(0);
    setPuntaje(0);
    setEstadoRonda("esperando");
    setJuegoIniciado(false);
    setTiempoRestante(20);
  };

  return (
    // ⚠️ pt-14 empuja todo el contenido hacia arriba justo debajo del botón Volver
    <div className="relative isolate min-h-screen w-full bg-[#f8f9fa] dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 flex flex-col pt-14 px-4 sm:px-6 lg:px-8 pb-4">
      
      <PageHeader />

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center">
        
        {estadoRonda === "fracaso" || estadoRonda === "terminado" ? (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
            className="bg-white dark:bg-[#151822] rounded-3xl p-8 sm:p-12 shadow-2xl text-center w-full border border-gray-100 dark:border-gray-800"
          >
            {estadoRonda === "fracaso" ? (
              <>
                <XCircle size={70} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-3xl sm:text-4xl font-extrabold text-red-500 mb-3">¡Tiempo Agotado!</h2>
                <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-6">
                  Lograste acertar <strong className="text-indigo-500">{puntaje}</strong> palabras consecutivas.
                </p>
              </>
            ) : (
              <>
                <CheckCircle size={70} className="mx-auto text-green-500 mb-4" />
                <h2 className="text-3xl sm:text-4xl font-extrabold text-green-500 mb-3">¡Desafío Completado!</h2>
                <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-6">
                  ¡Increíble! Acertaste todas las palabras.
                </p>
              </>
            )}
            
            <button 
              onClick={reiniciarJuego}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition"
            >
              Volver a intentar
            </button>
          </motion.div>
        ) : (

          /* INTERFAZ PRINCIPAL - Uso de flex-1 estricto */
          <div className="w-full flex-1 flex flex-col gap-3 justify-between">
            
            {/* HEADER: Temporizador y Puntaje */}
            <div className="flex-none w-full flex justify-between items-end px-2">
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-bold tracking-widest text-gray-400 uppercase">Tiempo</span>
                <div className={`flex items-center gap-1.5 text-3xl sm:text-4xl font-black ${tiempoRestante <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-800 dark:text-white'}`}>
                  <Timer size={28} />
                  0:{tiempoRestante.toString().padStart(2, '0')}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-bold tracking-widest text-gray-400 uppercase">Aciertos</span>
                <div className="text-3xl sm:text-4xl font-black text-indigo-600 leading-none">{puntaje}</div>
              </div>
            </div>

            {/* 📷 ÁREA DE LA CÁMARA */}
            {/* ⚠️ Al tener flex-1, esta caja se comerá TODO el espacio vertical sobrante, haciéndose grande y proporcional */}
            <div className="flex-1 w-full bg-gray-200 dark:bg-[#1c212c] rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 relative overflow-hidden shadow-inner min-h-[300px]">
              
              {cameraActive ? (
                <>
                  {/* object-cover asegura que el video llene la caja completa sin importar su forma */}
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                  
                  <AnimatePresence>
                    {estadoRonda === "exito" && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-green-500/30 backdrop-blur-sm flex items-center justify-center z-30"
                      >
                        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1, type: "spring" }}>
                          <CheckCircle size={80} className="text-white drop-shadow-lg" />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button 
                    onClick={() => { stopStream(); setEstadoRonda("fracaso"); }}
                    className="absolute top-4 right-4 bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm transition z-20 flex items-center gap-2 shadow-md"
                  >
                    <StopCircle size={16} /> RENDIRSE
                  </button>

                  {estadoRonda === "jugando" && (
                    <button 
                      onClick={manejarAcierto}
                      className="absolute bottom-4 right-4 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg transition z-20 animate-bounce text-sm"
                    >
                      ✔️ Simular Acierto
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4 z-10 relative">
                  {loading ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-3"></div>
                      <p className="text-indigo-600 font-medium animate-pulse text-sm">Iniciando cámara...</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white dark:bg-[#252a38] p-5 sm:p-6 rounded-full mb-4 shadow-md ring-4 ring-gray-50 dark:ring-gray-800 transition-transform hover:scale-105">
                        <Camera size={40} className="text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold mb-2 text-gray-800 dark:text-white">Cámara Desactivada</h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-5 text-sm sm:text-base">
                        Activa la cámara para comenzar. El tiempo correrá en cuanto te veas en pantalla.
                      </p>
                      {errorMsg && <p className="text-red-500 text-sm mb-3">{errorMsg}</p>}
                      <button
                        onClick={startCamera}
                        disabled={loading}
                        className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-1 active:scale-95"
                      >
                        <Play size={20} fill="currentColor" /> Iniciar Reto
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* CAJA DE LA PALABRA OBJETIVO */}
            {/* ⚠️ Compactada para que no robe espacio a la cámara */}
            <div className="flex-none w-full bg-white dark:bg-[#151822] rounded-3xl shadow-lg border border-gray-200 dark:border-gray-800 py-3 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold tracking-widest text-indigo-500 uppercase mb-0.5">Haz la seña para:</span>
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={rondaActual}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-wider leading-none"
                >
                  {juegoIniciado ? listaDesafio[rondaActual] : "???"}
                </motion.h2>
              </AnimatePresence>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}