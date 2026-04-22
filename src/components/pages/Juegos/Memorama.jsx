import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../common/PageHeader";

// Asegúrate de que la ruta a tus assets sea correcta
import dorsoImg from "../../../assets/reverso_carta.svg"; 
import elefanteImg from "../../../assets/elefante.svg";
import elefanteLSM from "../../../assets/elefante_lsm.svg"; 
import verdeImg from "../../../assets/verde.svg";
import verdeLSM from "../../../assets/verde_lsm.svg";
import heladoImg from "../../../assets/galleta.svg";
import heladoLSM from "../../../assets/galleta_lsm.svg";
import gatoImg from "../../../assets/gato.svg";
import gatoLSM from "../../../assets/gato_lsm.svg";
import carroImg from "../../../assets/carro.svg";
import carroLSM from "../../../assets/carro_lsm.svg";
import mesaImg from "../../../assets/mesa.svg";
import mesaLSM from "../../../assets/mesa_lsm.svg";
import hamburguesaImg from "../../../assets/hamburguesa.svg";
import hamburguesaLSM from "../../../assets/hamburguesa_lsm.svg";

export default function Memorama({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState([]);
  const [blocked, setBlocked] = useState(false);

  const totalPairs = Math.floor(cards.length / 2);
  const matchedPairs = Math.floor(cards.filter((card) => card.matched).length / 2);
  const progress = totalPairs > 0 ? Math.min(100, (matchedPairs / totalPairs) * 100) : 0;
  
  // ⚠️ NUEVA REGLA: Verificamos si ya se encontraron todos los pares
  const juegoTerminado = totalPairs > 0 && matchedPairs === totalPairs;

  useEffect(() => {
    if (typeof setSidebarOpen === "function") {
      setSidebarOpen(false);
    }

    const dataset = [
      { palabra: "ELEFANTE", img: elefanteImg, tipo: "objeto" },
      { palabra: "ELEFANTE", img: elefanteLSM, tipo: "seña" },
      { palabra: "VERDE", img: verdeImg, tipo: "objeto" },
      { palabra: "VERDE", img: verdeLSM, tipo: "seña" },
      { palabra: "GALLETA", img: heladoImg, tipo: "objeto" },
      { palabra: "GALLETA", img: heladoLSM, tipo: "seña" },
      { palabra: "GATO", img: gatoImg, tipo: "objeto" },
      { palabra: "GATO", img: gatoLSM, tipo: "seña" },
      { palabra: "CARRO", img: carroImg, tipo: "objeto" },
      { palabra: "CARRO", img: carroLSM, tipo: "seña" },
      { palabra: "MESA", img: mesaImg, tipo: "objeto" },
      { palabra: "MESA", img: mesaLSM, tipo: "seña" },
      { palabra: "HAMBURGUESA", img: hamburguesaImg, tipo: "objeto" },
      { palabra: "HAMBURGUESA", img: hamburguesaLSM, tipo: "seña" },
    ];

    const shuffled = dataset
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({
        ...item,
        id: `card-${index}`,
        flipped: false,
        matched: false,
      }));

    setCards(shuffled);
  }, [setSidebarOpen]);

  const handleFlip = (index) => {
    if (blocked || cards[index].flipped || cards[index].matched) return;

    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);

    const newSelected = [...selected, index];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setBlocked(true);
      const [firstIdx, secondIdx] = newSelected;

      if (cards[firstIdx].palabra === cards[secondIdx].palabra) {
        setTimeout(() => {
          newCards[firstIdx].matched = true;
          newCards[secondIdx].matched = true;
          setCards(newCards);
          setSelected([]);
          setBlocked(false);
        }, 600);
      } else {
        setTimeout(() => {
          newCards[firstIdx].flipped = false;
          newCards[secondIdx].flipped = false;
          setCards(newCards);
          setSelected([]);
          setBlocked(false);
        }, 1000);
      }
    }
  };

  // Función para reiniciar el juego sin salir de la pantalla
  const reiniciarJuego = () => {
    const newCards = cards
      .map(card => ({ ...card, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);
    setCards(newCards);
    setSelected([]);
    setBlocked(false);
  };

  return (
    <div className="relative isolate min-h-screen w-full bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 flex flex-col items-center pt-14 pb-10 overflow-hidden px-4 sm:px-6 lg:px-8">
      <PageHeader />

      <div className="z-10 w-full max-w-6xl px-6 flex flex-col items-center">
        
        {/* ⚠️ PANTALLA DE VICTORIA */}
        {juegoTerminado ? (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white dark:bg-[#151822] rounded-3xl p-12 shadow-xl text-center mt-20 max-w-2xl w-full border border-gray-200 dark:border-gray-800"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-4">¡Excelente!</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Encontraste los <strong className="text-indigo-500">{totalPairs}</strong> pares correctamente.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={reiniciarJuego}
                className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200 px-8 py-3 rounded-xl font-bold text-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition"
              >
                Jugar de nuevo
              </button>
              <button 
                onClick={() => navigate(-1)}
                className="bg-indigo-600 text-white dark:bg-indigo-500 dark:text-slate-50 px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 transition"
              >
                Regresar al menú
              </button>
            </div>
          </motion.div>
        ) : (
          /* 🎮 INTERFAZ NORMAL DEL JUEGO */
          <>
            <div className="w-full mb-8 text-center flex flex-col items-center">
              <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl">
                Encuentra las parejas entre la seña en LSM y el objeto correspondiente. Observa con atención antes de voltear la siguiente carta.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm">
                <div className="px-3 py-1 rounded-full bg-white dark:bg-[#151822] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    Pares encontrados: <span className="text-indigo-600 dark:text-indigo-400">{matchedPairs}</span> / {totalPairs || 7}
                  </span>
                </div>
                <div className="px-3 py-1 rounded-full bg-white dark:bg-[#151822] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    Cartas restantes: <span className="text-emerald-600 dark:text-emerald-400">{cards.filter((c) => !c.matched).length}</span>
                  </span>
                </div>
              </div>

              <div className="mt-4 w-full max-w-md mx-auto">
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-[#1c212c] overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 dark:from-indigo-400 dark:via-sky-400 dark:to-emerald-300 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="w-full relative mt-2">
              <div className="relative bg-white dark:bg-[#151822] rounded-[2rem] shadow-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 sm:gap-6 mx-auto w-full">
                  {cards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      whileHover={{ scale: blocked ? 1 : 1.03 }}
                      whileTap={{ scale: blocked ? 1 : 0.97 }}
                      className="relative w-full aspect-[3/4] cursor-pointer perspective-1000"
                      onClick={() => handleFlip(index)}
                    >
                      <motion.div
                        className="w-full h-full preserve-3d relative"
                        animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
                        transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
                      >
                        <div
                          className="absolute inset-0 backface-hidden rounded-2xl shadow-lg overflow-hidden bg-[#005c8f]"
                          style={{ transform: "rotateY(0deg)" }}
                        >
                          <img
                            src={dorsoImg}
                            alt="Dorso"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div
                          className="absolute inset-0 backface-hidden rounded-2xl border-4 border-[#818cf8] bg-[#ffffff] dark:bg-[#ffffff] shadow-xl flex flex-col items-center justify-center p-4 overflow-hidden"
                          style={{ transform: "rotateY(180deg)" }}
                        >
                          <img
                            src={card.img}
                            alt={card.palabra}
                            className="w-3/4 h-3/4 object-contain mb-2"
                          />
                          <p className={`font-bold text-sm sm:text-base uppercase tracking-wide text-center ${card.tipo === "seña" ? "text-[#6366f1]" : "text-[#4b5563] dark:text-[#d1d5db]"}`}>
                            {card.palabra}
                          </p>

                          {card.matched && (
                            <div className="absolute top-3 right-3 bg-[#22c55e] w-4 h-4 rounded-full border-2 border-[#ffffff] shadow-sm" />
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}