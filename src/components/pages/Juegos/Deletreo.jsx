import React, { useState, useEffect, useRef } from "react";
import { Undo2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { palabrasDeletreo as listaPalabras } from "../../../data/palabras";

// ⚠️ IMPORTA AQUÍ LAS IMÁGENES DEL ABECEDARIO
import imgA from "../../../assets/elefante_lsm.svg"; // Cambia estas por las letras reales
import imgG from "../../../assets/elefante_lsm.svg";
import imgU from "../../../assets/elefante_lsm.svg";
import imgM from "../../../assets/elefante_lsm.svg";
import imgE from "../../../assets/elefante_lsm.svg";
import imgS from "../../../assets/elefante_lsm.svg";

// Helper para obtener la imagen según la letra
const obtenerImagenLetra = (letra) => {
  const mapaImagenes = {
    A: imgA, G: imgG, U: imgU, M: imgM, E: imgE, S: imgS,
    // Agrega el resto del abecedario aquí...
  };
  return mapaImagenes[letra] || imgA; // Fallback temporal
};

export default function Deletreo({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  // ESTADOS DEL JUEGO
  const [nivelActual, setNivelActual] = useState(0);
  const [letrasDisponibles, setLetrasDisponibles] = useState([]);
  const [letrasColocadas, setLetrasColocadas] = useState([]);
  const [verificando, setVerificando] = useState(false);
  const [juegoTerminado, setJuegoTerminado] = useState(false);
  const [puntaje, setPuntaje] = useState(0);

  useEffect(() => {
    if (typeof setSidebarOpen === "function") setSidebarOpen(false);
  }, [setSidebarOpen]);

  // Inicializar el nivel actual
  useEffect(() => {
    if (nivelActual < listaPalabras.length) {
      const palabraSecreta = listaPalabras[nivelActual];
      
      // Separar la palabra en letras y darles un ID único
      const letras = palabraSecreta.split("").map((letra, index) => ({
        id: `${letra}-${index}-${Date.now()}`,
        caracter: letra,
        img: obtenerImagenLetra(letra),
      }));

      // Revolver las letras al azar
      const letrasRevueltas = [...letras].sort(() => Math.random() - 0.5);

      setLetrasDisponibles(letrasRevueltas);
      setLetrasColocadas([]);
      setVerificando(false);
    } else {
      setJuegoTerminado(true);
    }
  }, [nivelActual]);

  // Mover de Disponibles -> Colocadas
  const moverAColocadas = (letra) => {
    if (verificando) return;
    setLetrasDisponibles((prev) => prev.filter((l) => l.id !== letra.id));
    setLetrasColocadas((prev) => [...prev, letra]);
  };

  // Mover de Colocadas -> Disponibles
  const moverADisponibles = (letra) => {
    if (verificando) return;
    setLetrasColocadas((prev) => prev.filter((l) => l.id !== letra.id));
    setLetrasDisponibles((prev) => [...prev, letra]);
  };

  // Lógica para verificar automáticamente cuando se colocan todas las letras
  useEffect(() => {
    const palabraSecreta = listaPalabras[nivelActual];
    if (!palabraSecreta) return;

    if (letrasColocadas.length === palabraSecreta.length) {
      setVerificando(true);

      // Comprobar si toda la palabra está correcta
      const palabraFormada = letrasColocadas.map((l) => l.caracter).join("");
      const esCorrecta = palabraFormada === palabraSecreta;

      if (esCorrecta) {
        setPuntaje((prev) => prev + 1);
      }

      // Esperar 3 segundos para que el usuario vea los colores rojo/verde y luego pasar de nivel
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        // Limpiamos antes de cambiar de nivel para evitar un "flash" con letras antiguas
        setVerificando(false);
        setLetrasColocadas([]);
        setLetrasDisponibles([]);
        setNivelActual((prev) => prev + 1);
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [letrasColocadas, nivelActual]);

  const palabraObjetivo = listaPalabras[nivelActual] || "";
  const haRespondido =
    verificando &&
    palabraObjetivo.length > 0 &&
    letrasColocadas.length === palabraObjetivo.length;

  const progreso = Math.min(
    100,
    Math.max(0, (nivelActual / listaPalabras.length) * 100)
  );

  return (
    <div className="relative isolate h-full w-full bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 flex flex-col items-center pt-14 pb-4 overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Fondos decorativos */}
      <motion.div aria-hidden="true" className="hidden" />
      <motion.div aria-hidden="true" className="hidden" />

      {/* 🔙 Botón volver y Título */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 sm:left-6 flex items-center gap-2 text-gray-800 dark:text-gray-100 hover:text-indigo-400 transition-all duration-300 z-20"
      >
        <Undo2 size={24} strokeWidth={2.2} />
        <span className="hidden sm:inline font-medium">Volver</span>
      </button>

      <h1 className="absolute top-5 right-6 sm:right-10 text-xl font-semibold z-20">
        SignAI
      </h1>

      <div className="z-10 w-full max-w-5xl px-6 flex flex-col items-stretch">
        {/* Encabezado del juego */}
        <div className="w-full mb-4 text-center flex flex-col items-center">

          <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl">
            Toca las señas para formar la palabra correcta. Puedes devolver una carta si te equivocas antes de completar todos los espacios.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm">
            <div className="px-3 py-1 rounded-full bg-white dark:bg-[#151822] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                Nivel {Math.min(nivelActual + 1, listaPalabras.length)} / {listaPalabras.length}
              </span>
            </div>
            <div className="px-3 py-1 rounded-full bg-white dark:bg-[#151822] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                Aciertos: <span className="text-emerald-600">{puntaje}</span>
              </span>
            </div>
          </div>

          <div className="mt-4 w-full max-w-md mx-auto">
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-[#1c212c] overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        </div>

        {juegoTerminado ? (
          <div className="flex-1 flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white dark:bg-[#151822] rounded-3xl p-10 shadow-xl text-center border border-gray-200 dark:border-gray-800"
            >
              <h2 className="text-3xl sm:text-4xl font-extrabold text-indigo-600 mb-4">¡Juego Completado!</h2>
              <p className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 mb-6">
                Acertaste <strong className="text-green-500 text-3xl">{puntaje}</strong> de {listaPalabras.length} palabras.
              </p>
              <button 
                onClick={() => navigate(-1)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition"
              >
                Regresar al menú
              </button>
            </motion.div>
          </div>
        ) : (
          <React.Fragment key={nivelActual}>
            {/* ZONA SUPERIOR: LETRAS DISPONIBLES */}
            <div className="min-h-[180px] w-full flex flex-wrap justify-center items-center gap-4 mb-6 rounded-3xl bg-white dark:bg-[#151822] border border-gray-200 dark:border-gray-800 shadow-xl p-8">
              <AnimatePresence>
                {letrasDisponibles.map((letra) => (
                  <motion.div
                    key={letra.id}
                    layoutId={letra.id}
                    onClick={() => moverAColocadas(letra)}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    // Ajustamos el tamaño de la carta para que sea más armónico (w-24 h-32)
                    className="cursor-pointer bg-gray-50 dark:bg-[#1c212c] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 w-24 sm:w-28 h-32 sm:h-36 flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500"
                  >
                    <img src={letra.img} alt="Seña" className="w-full h-full object-contain drop-shadow-sm" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* ZONA INFERIOR: CAJA DE RESPUESTA */}
            {/* Quitamos el max-w-4xl y ponemos w-full para que mida igual que el de arriba */}
            <div className="w-full relative mt-2 flex-1 flex flex-col items-center justify-start">
              
              {/* Sombra de colores (blur) corregida para que envuelva todo armónicamente */}
              <div className="hidden" />
              
              {/* Añadimos w-full aquí para que la caja blanca ocupe todo el ancho disponible */}
              <div className="relative w-full bg-white dark:bg-[#151822] rounded-[2rem] shadow-xl border border-gray-200 dark:border-gray-800 min-h-[220px] p-8 flex flex-col items-center justify-center">
              
                {/* Contenedor de Huecos + Cartas */}
                <div className="flex flex-wrap justify-center gap-4 z-10 relative">
                  
                  {Array.from({ length: palabraObjetivo.length }).map((_, index) => {
                    
                    const letra = letrasColocadas[index];

                    let bgClass = "bg-white dark:bg-[#1c212c] border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-500"; 
                    if (haRespondido && letra) {
                      const esCorrecta = letra.caracter === palabraObjetivo[index];
                      bgClass = esCorrecta 
                        ? "bg-green-50 border-green-400 ring-4 ring-green-100" 
                        : "bg-red-50 border-red-400 ring-4 ring-red-100";
                    }

                    return (
                      // Mismos tamaños exactos que las cartas de arriba (w-24 h-32)
                      <div key={`slot-${index}`} className="relative w-24 sm:w-28 h-32 sm:h-36 rounded-2xl group">
                        
                        {/* Fondo del hueco (líneas punteadas) */}
                        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-[#1c212c]/60 transition-colors group-hover:border-indigo-300 dark:group-hover:border-indigo-500 group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-500/10" />

                        {/* Carta colocada */}
                        <AnimatePresence>
                          {letra && (
                            <motion.div
                              key={letra.id}
                              layoutId={letra.id}
                              onClick={() => moverADisponibles(letra)}
                              whileHover={{ scale: verificando ? 1 : 1.05 }}
                              whileTap={{ scale: verificando ? 1 : 0.95 }}
                              className={`absolute inset-0 cursor-pointer rounded-2xl shadow-md border p-3 flex flex-col items-center justify-center z-10 transition-all duration-500 ${bgClass}`}
                            >
                              <img src={letra.img} alt="Seña" className="w-full h-full object-contain" />
                              
                              {haRespondido && palabraObjetivo[index] && (
                                <motion.span 
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={`absolute -bottom-3 sm:-bottom-4 font-black text-xl sm:text-2xl px-3 py-1 rounded-lg shadow-sm bg-white ${letra.caracter === palabraObjetivo[index] ? 'text-green-600 border border-green-200' : 'text-red-600 border border-red-200'}`}
                                >
                                  {letra.caracter}
                                </motion.span>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                      </div>
                    );
                  })}
                </div>

                {/* Mensaje de la palabra correcta */}
                <AnimatePresence>
                  {haRespondido && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-10 text-center bg-indigo-50 dark:bg-indigo-900/20 px-8 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-800"
                    >
                      <p className="text-indigo-500 dark:text-indigo-300 font-bold uppercase tracking-widest text-xs mb-1">La palabra es</p>
                      <p className="text-3xl sm:text-4xl font-black text-indigo-700 dark:text-indigo-300 tracking-widest">{palabraObjetivo}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}