import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "../common/PageHeader";

import abcImg from "../../assets/Juegoabc.svg";
import numerosImg from "../../assets/numeros.svg";
import coloresImg from "../../assets/colores.svg";
import presentacionesImg from "../../assets/presentacion.svg";
import saludosImg from "../../assets/saludo.svg";
import diasImg from "../../assets/tiempo.svg";
import comidaImg from "../../assets/comida.svg";
import lugaresImg from "../../assets/lugares.svg";
import transporteImg from "../../assets/transporte.svg";

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
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-start text-center 
      bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 
      transition-all duration-700 ease-in-out pt-10`}
    >
      <PageHeader />

      {/* 🧩 Contenedor de categorías */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mt-16 px-6"
      >
        {categorias.map((cat, index) => (
          <motion.div
            key={index}
            onClick={() => navigate(`/Aprender/${cat.slug}`)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="cursor-pointer bg-white dark:bg-[#151822] rounded-2xl shadow-lg hover:shadow-indigo-400/20 
                       p-6 w-64 h-64 flex flex-col items-center justify-center 
                       transition-all duration-500 ease-in-out mx-auto"
          >
            <img
              src={cat.img}
              alt={cat.title}
              className="w-28 h-28 object-contain mb-4 drop-shadow-md"
            />
            <h3 className="text-lg font-semibold">{cat.title}</h3>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
