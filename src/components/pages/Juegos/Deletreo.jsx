import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { palabrasDeletreo as listaPalabras } from "../../../data/palabras";
import PageHeader from "../../common/PageHeader";

// ⚠️ Placeholder temporal: todas las letras usan la misma imagen hasta que se agreguen assets reales
import imgPlaceholder from "../../../assets/elefante_lsm.svg";

const obtenerImagenLetra = () => imgPlaceholder;

export default function Deletreo({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const slotRefs = useRef([]);
  const disponiblesRef = useRef(null);

  const [nivelActual, setNivelActual] = useState(0);
  const [letrasDisponibles, setLetrasDisponibles] = useState([]);
  // letrasColocadas es un array disperso: cada índice es un objeto letra o null
  const [letrasColocadas, setLetrasColocadas] = useState([]);
  const [verificando, setVerificando] = useState(false);
  const [juegoTerminado, setJuegoTerminado] = useState(false);
  const [puntaje, setPuntaje] = useState(0);

  useEffect(() => {
    if (typeof setSidebarOpen === "function") setSidebarOpen(false);
  }, [setSidebarOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Inicializar nivel
  useEffect(() => {
    if (nivelActual >= listaPalabras.length) {
      setJuegoTerminado(true);
      return;
    }
    const palabraSecreta = listaPalabras[nivelActual];
    const letras = palabraSecreta.split("").map((letra, index) => ({
      id: `n${nivelActual}-${letra}-${index}`,
      caracter: letra,
      img: obtenerImagenLetra(letra),
    }));
    const letrasRevueltas = [...letras].sort(() => Math.random() - 0.5);

    slotRefs.current = [];
    setLetrasDisponibles(letrasRevueltas);
    setLetrasColocadas(Array(palabraSecreta.length).fill(null));
    setVerificando(false);
  }, [nivelActual]);

  const palabraObjetivo = listaPalabras[nivelActual] || "";

  // Verificación: solo cuando TODOS los slots están llenos y no estemos ya verificando
  useEffect(() => {
    if (verificando) return;
    if (!palabraObjetivo) return;
    if (letrasColocadas.length !== palabraObjetivo.length) return;
    if (letrasColocadas.some((l) => l === null)) return;

    setVerificando(true);
    const palabraFormada = letrasColocadas.map((l) => l.caracter).join("");
    if (palabraFormada === palabraObjetivo) {
      setPuntaje((prev) => prev + 1);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setNivelActual((prev) => prev + 1);
    }, 3000);
  }, [letrasColocadas, palabraObjetivo, verificando]);

  // Colocar/mover una letra en un slot específico
  const dropEnSlot = (letra, slotIndex, origen) => {
    if (verificando) return;

    if (origen.tipo === "disponibles") {
      // Guarda anti-duplicado: si la letra ya está en algún slot, no volver a colocarla
      if (letrasColocadas.some((l) => l && l.id === letra.id)) return;

      const existente = letrasColocadas[slotIndex];
      setLetrasColocadas((prev) => {
        const nuevas = [...prev];
        nuevas[slotIndex] = letra;
        return nuevas;
      });
      setLetrasDisponibles((d) => {
        const filtradas = d.filter((l) => l.id !== letra.id);
        return existente ? [...filtradas, existente] : filtradas;
      });
    } else if (origen.tipo === "slot") {
      if (origen.index === slotIndex) return;
      setLetrasColocadas((prev) => {
        const nuevas = [...prev];
        const existente = nuevas[slotIndex];
        nuevas[origen.index] = existente; // swap (puede ser null)
        nuevas[slotIndex] = letra;
        return nuevas;
      });
    }
  };

  const devolverADisponibles = (slotIndex) => {
    if (verificando) return;
    setLetrasColocadas((prev) => {
      const letra = prev[slotIndex];
      if (!letra) return prev;
      const nuevas = [...prev];
      nuevas[slotIndex] = null;
      setLetrasDisponibles((d) => [...d, letra]);
      return nuevas;
    });
  };

  // Tap: colocar en el primer slot vacío
  const colocarEnPrimerVacio = (letra) => {
    if (verificando) return;
    // Guarda anti-duplicado
    if (letrasColocadas.some((l) => l && l.id === letra.id)) return;

    const slotIndex = letrasColocadas.findIndex((l) => l === null);
    if (slotIndex === -1) return;
    setLetrasColocadas((prev) => {
      const nuevas = [...prev];
      nuevas[slotIndex] = letra;
      return nuevas;
    });
    setLetrasDisponibles((d) => d.filter((l) => l.id !== letra.id));
  };

  // Detección del drop según la posición del puntero
  const handleDragEnd = (letra, info, origen) => {
    if (verificando) return;
    const { x, y } = info.point;

    for (let i = 0; i < slotRefs.current.length; i++) {
      const el = slotRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        dropEnSlot(letra, i, origen);
        return;
      }
    }

    // Si se soltó fuera de todos los slots y venía de un slot, regresarla a disponibles
    if (origen.tipo === "slot") {
      devolverADisponibles(origen.index);
    }
    // Si venía de disponibles, dragSnapToOrigin la regresa sola
  };

  const haRespondido =
    verificando &&
    palabraObjetivo.length > 0 &&
    letrasColocadas.length === palabraObjetivo.length &&
    letrasColocadas.every((l) => l !== null);

  const progreso = Math.min(
    100,
    Math.max(0, (nivelActual / listaPalabras.length) * 100)
  );

  return (
    <div className="relative isolate h-full w-full bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 flex flex-col items-center pt-14 pb-4 overflow-hidden px-4 sm:px-6 lg:px-8">
      <PageHeader />

      <div className="z-10 w-full max-w-5xl px-6 flex flex-col items-stretch">
        {/* Encabezado */}
        <div className="w-full mb-4 text-center flex flex-col items-center">
          <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl">
            Arrastra las señas a los espacios para formar la palabra correcta. Puedes moverlas entre huecos o regresarlas arriba si te equivocas.
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
            {/* ZONA DISPONIBLES */}
            <div
              ref={disponiblesRef}
              className="min-h-[180px] w-full flex flex-wrap justify-center items-center gap-4 mb-6 rounded-3xl bg-white dark:bg-[#151822] border border-gray-200 dark:border-gray-800 shadow-xl p-8"
            >
              <AnimatePresence>
                {letrasDisponibles.map((letra) => (
                  <motion.div
                    key={letra.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    drag={!verificando}
                    dragSnapToOrigin
                    dragElastic={0.2}
                    dragMomentum={false}
                    onDragEnd={(e, info) =>
                      handleDragEnd(letra, info, { tipo: "disponibles" })
                    }
                    onTap={() => colocarEnPrimerVacio(letra)}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    whileDrag={{ scale: 1.1, zIndex: 50 }}
                    className="cursor-grab active:cursor-grabbing bg-gray-50 dark:bg-[#1c212c] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 w-24 sm:w-28 h-32 sm:h-36 flex flex-col items-center justify-center hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 touch-none select-none"
                  >
                    <img
                      src={letra.img}
                      alt="Seña"
                      draggable={false}
                      className="w-full h-full object-contain drop-shadow-sm pointer-events-none"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* ZONA SLOTS */}
            <div className="w-full relative mt-2 flex-1 flex flex-col items-center justify-start">
              <div className="relative w-full bg-white dark:bg-[#151822] rounded-[2rem] shadow-xl border border-gray-200 dark:border-gray-800 min-h-[220px] p-8 flex flex-col items-center justify-center">
                <div className="flex flex-wrap justify-center gap-4 z-10 relative">
                  {Array.from({ length: palabraObjetivo.length }).map((_, index) => {
                    const letra = letrasColocadas[index];

                    let bgClass =
                      "bg-white dark:bg-[#1c212c] border-gray-200 dark:border-gray-700";
                    if (haRespondido && letra) {
                      const esCorrecta = letra.caracter === palabraObjetivo[index];
                      bgClass = esCorrecta
                        ? "bg-green-50 border-green-400 ring-4 ring-green-100"
                        : "bg-red-50 border-red-400 ring-4 ring-red-100";
                    }

                    return (
                      <div
                        key={`slot-${index}`}
                        ref={(el) => (slotRefs.current[index] = el)}
                        className="relative w-24 sm:w-28 h-32 sm:h-36 rounded-2xl group"
                      >
                        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-[#1c212c]/60 transition-colors group-hover:border-indigo-300 dark:group-hover:border-indigo-500 group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-500/10" />

                        <AnimatePresence>
                          {letra && (
                            <motion.div
                              key={letra.id}
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              drag={!verificando}
                              dragSnapToOrigin
                              dragElastic={0.2}
                              dragMomentum={false}
                              onDragEnd={(e, info) =>
                                handleDragEnd(letra, info, { tipo: "slot", index })
                              }
                              onTap={() => devolverADisponibles(index)}
                              whileHover={{ scale: verificando ? 1 : 1.05 }}
                              whileTap={{ scale: verificando ? 1 : 0.95 }}
                              whileDrag={{ scale: 1.1, zIndex: 50 }}
                              className={`absolute inset-0 cursor-grab active:cursor-grabbing rounded-2xl shadow-md border p-3 flex flex-col items-center justify-center z-10 ${bgClass}`}
                            >
                              <img
                                src={letra.img}
                                alt="Seña"
                                draggable={false}
                                className="w-full h-full object-contain pointer-events-none"
                              />

                              {haRespondido && palabraObjetivo[index] && (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={`absolute -bottom-3 sm:-bottom-4 font-black text-xl sm:text-2xl px-3 py-1 rounded-lg shadow-sm bg-white ${
                                    letra.caracter === palabraObjetivo[index]
                                      ? "text-green-600 border border-green-200"
                                      : "text-red-600 border border-red-200"
                                  }`}
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

                <AnimatePresence>
                  {haRespondido && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-10 text-center bg-indigo-50 dark:bg-indigo-900/20 px-8 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-800"
                    >
                      <p className="text-indigo-500 dark:text-indigo-300 font-bold uppercase tracking-widest text-xs mb-1">
                        La palabra es
                      </p>
                      <p className="text-3xl sm:text-4xl font-black text-indigo-700 dark:text-indigo-300 tracking-widest">
                        {palabraObjetivo}
                      </p>
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
