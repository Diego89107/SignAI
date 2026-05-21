import React, { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Play, StopCircle, CheckCircle } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center } from "@react-three/drei";
import useCamera from "../../../hooks/useCamera";
import PageHeader from "../../common/PageHeader";
import Tutorial from "../../common/Tutorial";
import PageLayout from "../../common/PageLayout";

const LECCION_TUTORIAL_STEPS_INTRO = [
  {
    key: "leccion-iniciar",
    title: "Iniciar Cámara",
    text: "Pulsa este botón para activar la cámara y empezar a practicar las señas de esta lección.",
    placement: "top",
  },
  {
    key: "leccion-modelo",
    title: "Modelo 3D",
    text: "Aquí puedes ver una vista 3D de la mano. Arrastra para girarla y observar la seña desde cualquier ángulo.",
    placement: "left",
  },
  {
    key: "leccion-item",
    title: "Seña a practicar",
    text: "Esta es la seña que debes imitar. Cuando avances, irán apareciendo las siguientes.",
    placement: "top",
  },
];

const LECCION_TUTORIAL_STEPS_CAMARA = [
  {
    key: "leccion-camara-activa",
    title: "Vista en vivo",
    text: "Aquí te ves a ti mismo. Realiza la seña frente a la cámara con buena iluminación.",
    placement: "right",
  },
  {
    key: "leccion-acierto",
    title: "Confirmar acierto",
    text: "Cuando completes la seña correctamente, pulsa este botón para avanzar a la siguiente.",
    placement: "top",
  },
  {
    key: "leccion-detener",
    title: "Detener",
    text: "Si quieres pausar la práctica, pulsa aquí para apagar la cámara.",
    placement: "bottom",
  },
];

function ModeloMano({ modeloPath }) {
  const { scene } = useGLTF(modeloPath);
  return (
    <Center>
      <primitive object={scene} scale={0.07} />
    </Center>
  );
}

export default function LeccionAprender({
  items,
  itemInicial,
  modeloPath = "/Mano.glb",
  setSidebarOpen,
}) {
  const [indiceActual, setIndiceActual] = useState(() => {
    if (itemInicial == null) return 0;
    const idx = items.findIndex((i) => i.id === itemInicial);
    return idx >= 0 ? idx : 0;
  });
  const [mostrarExito, setMostrarExito] = useState(false);

  const {
    videoRef,
    active: cameraActive,
    errorMsg,
    loading,
    start: startCamera,
    stop: stopStream,
  } = useCamera();

  const itemActual = items[indiceActual];

  useEffect(() => {
    if (typeof setSidebarOpen === "function") setSidebarOpen(false);
  }, [setSidebarOpen]);

  const siguiente = () => {
    setIndiceActual((prev) => (prev + 1) % items.length);
    setMostrarExito(false);
  };

  const manejarAcierto = () => {
    setMostrarExito(true);
    setTimeout(() => {
      setMostrarExito(false);
      siguiente();
    }, 1500);
  };

  const tamanoLabel = (label) => {
    const n = label.length;
    if (n > 14) return "text-lg sm:text-2xl lg:text-3xl 2xl:text-5xl";
    if (n > 10) return "text-xl sm:text-3xl lg:text-4xl 2xl:text-6xl";
    if (n > 6) return "text-3xl sm:text-4xl lg:text-5xl 2xl:text-7xl";
    return "text-5xl sm:text-7xl lg:text-8xl 2xl:text-[9rem]";
  };

  return (
    <PageLayout
      className="min-h-screen"
      contentClassName="pt-14 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 text-gray-900 dark:text-gray-100"
    >
      <PageHeader />

      <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto mt-4 sm:mt-6 lg:mt-8 flex-1 min-h-0 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 sm:gap-6 lg:gap-8 flex-1 min-h-0">
          {/* 📷 CÁMARA */}
          <div className="aspect-video md:aspect-auto bg-gray-200 dark:bg-[#1c212c] rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 relative overflow-hidden shadow-inner">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  data-tutorial="leccion-camara-activa"
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />

                <AnimatePresence>
                  {mostrarExito && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-green-500/30 backdrop-blur-sm flex items-center justify-center z-30"
                    >
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1, type: "spring" }}
                      >
                        <CheckCircle
                          size={100}
                          className="text-white drop-shadow-lg"
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  data-tutorial="leccion-detener"
                  onClick={stopStream}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-5 lg:right-5 bg-red-500/90 hover:bg-red-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 rounded-full text-[10px] sm:text-xs lg:text-sm font-bold backdrop-blur-sm transition z-20 flex items-center gap-1.5 sm:gap-2 shadow-lg"
                >
                  <StopCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  DETENER
                </button>

                <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5 lg:bottom-7 lg:left-7 bg-black/60 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 rounded-full text-[10px] sm:text-xs lg:text-sm font-medium border border-white/10 text-white flex items-center gap-1.5 sm:gap-2 z-20">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  Cámara activa
                </div>

                <button
                  data-tutorial="leccion-acierto"
                  onClick={manejarAcierto}
                  disabled={mostrarExito}
                  className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 lg:bottom-7 lg:right-7 bg-green-500 hover:bg-green-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 lg:px-6 lg:py-3 rounded-full font-bold shadow-lg transition z-20 animate-bounce text-xs sm:text-sm lg:text-base"
                >
                  ✔️ Simular Acierto
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-3 sm:p-5 lg:p-7 2xl:p-9 z-10 relative">
                {loading ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-4 border-indigo-600 border-t-transparent mb-3"></div>
                    <p className="text-indigo-600 font-medium animate-pulse text-sm sm:text-base lg:text-lg">
                      Iniciando cámara...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white dark:bg-[#252a38] p-4 sm:p-6 lg:p-7 2xl:p-9 rounded-full mb-3 sm:mb-5 lg:mb-6 shadow-xl ring-4 ring-gray-50 dark:ring-gray-800 transition-transform hover:scale-105">
                      <Camera
                        className="text-gray-400 dark:text-gray-500 w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14"
                      />
                    </div>
                    <h3 className="text-lg sm:text-2xl lg:text-3xl 2xl:text-4xl font-bold mb-1.5 sm:mb-2 lg:mb-3 text-gray-800 dark:text-white">
                      Cámara Desactivada
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-xs sm:max-w-sm lg:max-w-md mb-4 sm:mb-6 lg:mb-7 text-xs sm:text-base lg:text-lg 2xl:text-xl">
                      Dale clic a iniciar para empezar a practicar desde{" "}
                      <strong className="text-indigo-500">
                        {items[0].label}
                      </strong>
                    </p>
                    {errorMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-600 text-xs sm:text-sm mb-3 sm:mb-5 bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2"
                      >
                        ⚠️ {errorMsg}
                      </motion.div>
                    )}
                    <button
                      data-tutorial="leccion-iniciar"
                      onClick={startCamera}
                      disabled={loading}
                      className="group flex items-center gap-2 sm:gap-2.5 lg:gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-7 lg:px-10 2xl:px-12 py-2 sm:py-3.5 lg:py-4 2xl:py-5 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg lg:text-xl 2xl:text-2xl shadow-xl hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-1 active:scale-95"
                    >
                      <div className="bg-white/20 p-1 sm:p-1.5 lg:p-2 rounded-full group-hover:bg-white/30 transition">
                        <Play
                          fill="currentColor"
                          className="ml-0.5 w-3.5 h-3.5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7"
                        />
                      </div>
                      Iniciar Cámara
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* PANEL DERECHO - proporción fija 3:1 entre modelo y label */}
          <div className="grid grid-rows-[3fr_1fr] gap-3 sm:gap-4 aspect-[2/3] md:aspect-auto min-h-0">
            {/* 🧊 MODELO 3D */}
            <div data-tutorial="leccion-modelo" className="min-h-0 bg-white dark:bg-[#151822] rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50 z-10"></div>

              <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative z-0">
                <Suspense
                  fallback={
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                  }
                >
                  <Canvas camera={{ position: [0, 0, 25], fov: 25 }}>
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[10, 10, 5]} intensity={1.2} />
                    <directionalLight position={[-10, -10, -5]} intensity={0.4} />
                    <ModeloMano modeloPath={modeloPath} />
                    <OrbitControls enableZoom={true} />
                  </Canvas>
                </Suspense>
              </div>
            </div>

            {/* 🅰️ ÍTEM ACTUAL */}
            <div data-tutorial="leccion-item" className="min-h-0 bg-white dark:bg-[#151822] rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden px-6">
              <AnimatePresence mode="wait">
                <motion.span
                  key={itemActual.id}
                  initial={{ scale: 0.8, opacity: 0, y: -20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 1.2, opacity: 0, y: 20 }}
                  className={`${tamanoLabel(itemActual.label)} font-black leading-tight select-none text-gray-900 dark:text-white text-center`}
                >
                  {itemActual.label}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {!cameraActive && !loading && (
        <Tutorial
          steps={LECCION_TUTORIAL_STEPS_INTRO}
          storageKey="tourSignAI_leccion_intro"
        />
      )}
      {cameraActive && (
        <Tutorial
          steps={LECCION_TUTORIAL_STEPS_CAMARA}
          storageKey="tourSignAI_leccion_camara"
        />
      )}
    </PageLayout>
  );
}
