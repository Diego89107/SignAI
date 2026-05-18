import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "../common/PageHeader";
import Tutorial from "../common/Tutorial";
import PageLayout from "../common/PageLayout";
import ResponsiveContainer from "../common/ResponsiveContainer";
import NavCard from "../common/NavCard";

import abcImg from "../../assets/Juegoabc.svg";
import numerosImg from "../../assets/numeros.svg";
import coloresImg from "../../assets/colores.svg";
import presentacionesImg from "../../assets/presentacion.svg";
import saludosImg from "../../assets/saludo.svg";
import diasImg from "../../assets/tiempo.svg";
import comidaImg from "../../assets/comida.svg";
import lugaresImg from "../../assets/lugares.svg";
import transporteImg from "../../assets/transporte.svg";

const APRENDER_TUTORIAL_STEPS = [
  {
    key: "aprender-primera",
    title: "Elige una categoría",
    text: "Cada tarjeta abre una lección con las señas de esa categoría. Te recomendamos empezar por el abecedario.",
    placement: "bottom",
  },
  {
    key: "aprender-cuadricula",
    title: "Explora todas las categorías",
    text: "Aquí están todas las lecciones disponibles: números, colores, saludos, comida, lugares y más. Avanza a tu propio ritmo.",
    placement: "top",
  },
];

export default function Aprender({ sidebarOpen }) {
  const navigate = useNavigate();

  const categorias = [
    { title: "Abecedario", img: abcImg, slug: "abecedario" },
    { title: "Números", img: numerosImg, slug: "numeros" },
    { title: "Colores", img: coloresImg, slug: "colores" },
    { title: "Presentaciones personales", img: presentacionesImg, slug: "presentaciones" },
    { title: "Saludos y despedidas", img: saludosImg, slug: "saludos" },
    { title: "Días y tiempo", img: diasImg, slug: "dias" },
    { title: "Comida y bebidas", img: comidaImg, slug: "comida" },
    { title: "Lugares", img: lugaresImg, slug: "lugares" },
    { title: "Transporte y direcciones", img: transporteImg, slug: "transporte" },
  ];

  return (
    <PageLayout
      contentClassName="min-h-screen items-center justify-start text-center text-gray-900 dark:text-gray-100 transition-colors duration-700 ease-in-out pt-10"
    >
      <PageHeader />

      <ResponsiveContainer size="xl">
        <motion.div
          data-tutorial="aprender-cuadricula"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 2xl:gap-14 mt-10 sm:mt-12 lg:mt-16 2xl:mt-20"
        >
          {categorias.map((cat, index) => (
            <NavCard
              key={index}
              title={cat.title}
              img={cat.img}
              tutorialKey={index === 0 ? "aprender-primera" : undefined}
              onClick={() => navigate(`/Aprender/${cat.slug}`)}
            />
          ))}
        </motion.div>
      </ResponsiveContainer>

      <Tutorial
        steps={APRENDER_TUTORIAL_STEPS}
        storageKey="tourSignAI_aprender"
      />
    </PageLayout>
  );
}
