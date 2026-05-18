import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "../common/PageHeader";
import Tutorial from "../common/Tutorial";
import PageLayout from "../common/PageLayout";
import ResponsiveContainer from "../common/ResponsiveContainer";
import NavCard from "../common/NavCard";

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
    <PageLayout
      contentClassName="items-center justify-start text-center text-gray-900 dark:text-gray-100 transition-colors duration-700 ease-in-out pt-10"
    >
      <PageHeader />

      <ResponsiveContainer size="lg">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 2xl:gap-14 mt-6 sm:mt-8 lg:mt-10 2xl:mt-16"
        >
          {juegos.map((game, index) => (
            <NavCard
              key={index}
              title={game.title}
              img={game.img}
              tutorialKey={game.tutorialKey}
              onClick={() => navigate(game.path)}
            />
          ))}
        </motion.div>
      </ResponsiveContainer>

      <Tutorial
        steps={JUEGOS_TUTORIAL_STEPS}
        storageKey="tourSignAI_juegos"
      />
    </PageLayout>
  );
}