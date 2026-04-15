import React, { useEffect, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, Camera, Play, StopCircle, CheckCircle } from "lucide-react";
import useCamera from "../../../hooks/useCamera";

// 🧊 IMPORTACIONES PARA EL MODELO 3D
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Center } from "@react-three/drei";

function ModeloMano() {
  const { scene } = useGLTF("./mano.glb"); 
  
  return (
    <Center>
      <primitive object={scene} scale={0.75} />
    </Center>
  );
}

export default function Abecedario({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const [letraActual, setLetraActual] = useState("A");
  const [mostrarExito, setMostrarExito] = useState(false);

  const { videoRef, active: cameraActive, errorMsg, loading, start: startCamera, stop: stopStream } = useCamera();

  // Generamos el abecedario completo de la A a la Z
  const abecedario = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  useEffect(() => {
    if (typeof setSidebarOpen === "function") {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  // ⚠️ SIMULADOR DE IA: Pasa automáticamente a la siguiente letra
  const manejarAcierto = () => {
    setMostrarExito(true);
    
    setTimeout(() => {
      setMostrarExito(false);
      const currentIndex = abecedario.indexOf(letraActual);
      
      // Si no es la Z, avanza a la siguiente. Si es la Z, regresa a la A.
      if (currentIndex < abecedario.length - 1) {
        setLetraActual(abecedario[currentIndex + 1]);
      } else {
        setLetraActual("A");
      }
    }, 1500); // Muestra el mensaje de éxito por 1.5 segundos
  };

  return (
    <div className="relative isolate min-h-screen w-full bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 flex flex-col pt-14 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8">
      
      {/* 🔙 Botón volver y Título */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 sm:left-6 flex items-center gap-2 text-gray-800 dark:text-gray-100 hover:text-indigo-400 transition-all duration-300 z-20"
      >
        <Undo2 size={24} strokeWidth={2.2} />
        <span className="hidden sm:inline font-medium">Volver</span>
      </button>

      <h1 className="absolute top-5 right-6 sm:right-10 text-xl font-semibold z-20">SignAI</h1>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto mt-4 sm:mt-6">
        
        {/* BLOQUE DE PANTALLAS (Cámara Izquierda, 3D y Letra Derecha) */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 sm:gap-6 w-full">
          
          {/* 📷 ÁREA DE LA CÁMARA */}
          <div className="flex-[1.5] lg:flex-[2] min-h-[40vh] lg:min-h-0 bg-gray-200 dark:bg-[#1c212c] rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 relative overflow-hidden shadow-inner">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover" 
                  style={{ transform: "scaleX(-1)" }} 
                />
                
                {/* 🟢 OVERLAY DE ÉXITO AL ACERTAR LA SEÑA */}
                <AnimatePresence>
                  {mostrarExito && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-green-500/30 backdrop-blur-sm flex items-center justify-center z-30"
                    >
                      <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1, type: "spring" }}>
                        <CheckCircle size={100} className="text-white drop-shadow-lg" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={stopStream}
                  className="absolute top-4 right-4 bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold backdrop-blur-sm transition z-20 flex items-center gap-2 shadow-lg"
                >
                  <StopCircle size={18} />
                  DETENER
                </button>

                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-black/60 backdrop-blur-md px-4 py-2 sm:px-5 sm:py-3 rounded-full text-xs sm:text-sm font-medium border border-white/10 text-white flex items-center gap-2 sm:gap-3 z-20">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  Cámara activa
                </div>

                {/* BOTÓN TEMPORAL PARA SIMULAR LA IA */}
                <button 
                  onClick={manejarAcierto}
                  disabled={mostrarExito}
                  className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg transition z-20 animate-bounce text-sm"
                >
                  ✔️ Simular Acierto
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4 sm:p-6 z-10 relative">
                {loading ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
                    <p className="text-indigo-600 font-medium animate-pulse">Iniciando cámara...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white dark:bg-[#252a38] p-6 sm:p-8 rounded-full mb-4 sm:mb-6 shadow-xl ring-4 ring-gray-50 dark:ring-gray-800 transition-transform hover:scale-105">
                      <Camera size={48} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 text-gray-800 dark:text-white">Cámara Desactivada</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6 sm:mb-8 text-sm sm:text-lg">
                      Dale clic a iniciar para empezar a practicar desde la letra <strong className="text-indigo-500">A</strong>
                    </p>
                    {errorMsg && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-600 text-xs sm:text-sm mb-4 sm:mb-6 bg-red-100 dark:bg-red-900/30 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2"
                      >
                        ⚠️ {errorMsg}
                      </motion.div>
                    )}
                    <button
                      onClick={startCamera}
                      disabled={loading}
                      className="group flex items-center gap-2 sm:gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-6 sm:px-10 py-3 sm:py-5 rounded-2xl font-bold text-lg sm:text-xl shadow-xl hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-1 active:scale-95"
                    >
                      <div className="bg-white/20 p-1.5 rounded-full group-hover:bg-white/30 transition">
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                      </div>
                      Iniciar Cámara
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ⚠️ PANEL DERECHO SEPARADO (Modelo 3D arriba, Letra abajo) */}
          <div className="flex-1 min-h-[40vh] lg:min-h-0 flex flex-col gap-4 sm:gap-6">
            
            {/* 🧊 1. CAJA DEL MODELO 3D */}
            <div className="flex-1 min-h-0 bg-white dark:bg-[#151822] rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50 z-10"></div>
              
              <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative z-0">
                <Suspense fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                  </div>
                }>
                  <Canvas camera={{ position: [0, 0, 5], fov: 40 }}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={1} />
                    <Environment preset="city" />
                    <ModeloMano />
                    <OrbitControls enableZoom={true} />
                  </Canvas>
                </Suspense>
              </div>
            </div>

            {/* 🅰️ 2. CAJA DE LA LETRA (Solo la letra, en su propio cuadro perfectamente alineado) */}
            <div className="flex-none h-32 sm:h-40 bg-white dark:bg-[#151822] rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span 
                  key={letraActual}
                  initial={{ scale: 0.8, opacity: 0, y: -20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 1.2, opacity: 0, y: 20 }}
                  className="text-[7rem] sm:text-[8rem] lg:text-[9rem] font-black leading-none select-none text-gray-900 dark:text-white"
                >
                  {letraActual}
                </motion.span>
              </AnimatePresence>
            </div>

          </div>
          
        </div>
      </div>
    </div>
  );
}