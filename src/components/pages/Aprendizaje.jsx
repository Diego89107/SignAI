import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "../common/PageHeader";
import Tutorial from "../common/Tutorial";
import abcImg from "../../assets/abc.svg";
import juegosImg from "../../assets/juegos.svg";

const APRENDIZAJE_TUTORIAL_STEPS = [
  {
    key: "card-aprender",
    title: "Aprender",
    text: "Aquí encontrarás lecciones organizadas por categorías para aprender la Lengua de Señas Mexicana desde cero.",
    placement: "bottom",
  },
  {
    key: "card-juegos",
    title: "Juegos",
    text: "Pon a prueba lo aprendido con juegos interactivos: memorama, quiz, desafíos y deletreo.",
    placement: "bottom",
  },
];

export default function Aprendizaje({ sidebarOpen }) {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Aprender",
      img: abcImg,
      tutorialKey: "card-aprender",
      onClick: () => {
        if (typeof sidebarOpen !== "undefined" && sidebarOpen === true && window.closeSidebar) {
          window.closeSidebar();
        }
        navigate("/Aprender");
      },
    },
    {
      title: "Juegos",
      img: juegosImg,
      tutorialKey: "card-juegos",
      onClick: () => {
        if (typeof sidebarOpen !== "undefined" && sidebarOpen === true && window.closeSidebar) {
          window.closeSidebar();
        }
        navigate("/Juegos");
      }
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-900 dark:text-gray-100 transition-colors duration-700 ease-in-out">

      <div className="fixed inset-0 bg-gray-50 dark:bg-[#0b0f19] -z-10 transition-colors duration-700 pointer-events-none" />

      <PageHeader showBack={false} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 px-6 max-w-3xl">
        {cards.map((card, index) => (
          <motion.div
            key={index}
            data-tutorial={card.tutorialKey}
            onClick={card.onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="cursor-pointer bg-white dark:bg-[#151822] rounded-2xl shadow-lg hover:shadow-indigo-400/20
                       p-6 w-64 h-64 flex flex-col items-center justify-center
                       transition-all duration-500 ease-in-out mx-auto border border-transparent hover:border-indigo-500/30"
          >
            <img
              src={card.img}
              alt={card.title}
              className="w-28 h-28 object-contain mb-4 drop-shadow-md"
            />
            <h3 className="text-lg font-semibold">{card.title}</h3>
          </motion.div>
        ))}
      </div>

      <Tutorial
        steps={APRENDIZAJE_TUTORIAL_STEPS}
        storageKey="tourSignAI_aprendizaje"
      />
    </div>
  );
}
