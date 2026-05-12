import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "../common/PageHeader";
import Tutorial from "../common/Tutorial";

import memoramaImg from "../../assets/memorama.svg";
import quizImg from "../../assets/quiz.svg";
import desafioImg from "../../assets/desafio.svg";
import imitaImg from "../../assets/imita.svg";

const JUEGOS_TUTORIAL_STEPS = [
  {
    key: "juego-memorama",
    title: "Memorama",
    text: "Encuentra las parejas entre la seña en LSM y el objeto correspondiente.",
    placement: "bottom",
  },
  {
    key: "juego-quiz",
    title: "Quiz visual",
    text: "Observa una seña y elige la palabra correcta entre cuatro opciones.",
    placement: "bottom",
  },
  {
    key: "juego-desafio",
    title: "Modo desafío",
    text: "Reto contrarreloj: realiza la seña indicada frente a la cámara antes que se acabe el tiempo.",
    placement: "top",
  },
  {
    key: "juego-deletreo",
    title: "Deletreo",
    text: "Arma palabras arrastrando las señas en el orden correcto.",
    placement: "top",
  },
];

export default function JuegosInteractivos({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();

  // Cerramos el sidebar al entrar
  useEffect(() => {
    if (typeof setSidebarOpen === "function") {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  const juegos = [
    { title: "Memorama", img: memoramaImg, path: "/Memorama", tutorialKey: "juego-memorama" },
    { title: "Quiz visual", img: quizImg, path: "/Quiz", tutorialKey: "juego-quiz" },
    { title: "Modo desafío", img: desafioImg, path: "/Desafio", tutorialKey: "juego-desafio" },
    { title: "Deletreo", img: imitaImg, path: "/Deletreo", tutorialKey: "juego-deletreo" },
  ];

  return (
    <div
      // Usamos h-full (sin scroll) y justify-start para que empiece desde arriba como Aprender.jsx
      className="h-full w-full flex flex-col items-center justify-start text-center 
      bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 
      transition-all duration-700 ease-in-out pt-10"
    >
      <PageHeader />
      
      {/* 🧩 Contenedor de juegos: 
          Restauramos la estructura GRID de Aprender.jsx para una distribución perfecta 
      */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        // Usamos grid como en Aprender, pero con un max-w más generoso para que no se apelmace
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-10 mt-8 px-6 max-w-5xl"
      >
        {juegos.map((game, index) => (
          <motion.div
            key={index}
            data-tutorial={game.tutorialKey}
            onClick={() => navigate(game.path)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="cursor-pointer bg-white dark:bg-[#151822] rounded-2xl shadow-lg hover:shadow-indigo-400/20
                       p-6 w-64 h-64 flex flex-col items-center justify-center
                       transition-all duration-500 ease-in-out mx-auto border border-transparent hover:border-indigo-500/30"
          >
            <img
              src={game.img}
              alt={game.title}
              className="w-28 h-28 object-contain mb-4 drop-shadow-md"
            />
            <h3 className="text-lg font-semibold">{game.title}</h3>
          </motion.div>
        ))}
      </motion.div>

      <Tutorial
        steps={JUEGOS_TUTORIAL_STEPS}
        storageKey="tourSignAI_juegos"
      />
    </div>
  );
}