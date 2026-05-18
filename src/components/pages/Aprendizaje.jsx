import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "../common/PageHeader";
import Tutorial from "../common/Tutorial";
import PageLayout from "../common/PageLayout";
import ResponsiveContainer from "../common/ResponsiveContainer";
import NavCard from "../common/NavCard";
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
    <PageLayout contentClassName="items-center justify-center text-center text-gray-900 dark:text-gray-100 transition-colors duration-700 ease-in-out">

      <PageHeader showBack={false} />

      <ResponsiveContainer size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 2xl:gap-14">
          {cards.map((card, index) => (
            <NavCard
              key={index}
              title={card.title}
              img={card.img}
              tutorialKey={card.tutorialKey}
              onClick={card.onClick}
            />
          ))}
        </div>
      </ResponsiveContainer>

      <Tutorial
        steps={APRENDIZAJE_TUTORIAL_STEPS}
        storageKey="tourSignAI_aprendizaje"
      />
    </PageLayout>
  );
}
