import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Undo2 } from "lucide-react";

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
    { title: "Abecedario", img: abcImg, onClick: () => navigate("/Abecedario") },
    { title: "Números", img: numerosImg },
    { title: "Colores", img: coloresImg },
    { title: "Presentaciones personales", img: presentacionesImg },
    { title: "Saludos y despedidas", img: saludosImg },
    { title: "Días y tiempo", img: diasImg },
    { title: "Comida y bebidas", img: comidaImg },
    { title: "Lugares", img: lugaresImg },
    { title: "Transporte y direcciones", img: transporteImg },
  ];

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-start text-center 
      bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 
      transition-all duration-700 ease-in-out pt-10`}
    >
      {/* 🔙 Botón volver */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-5 left-6 flex items-center gap-2 text-gray-800 dark:text-gray-100 
                   hover:text-indigo-400 transition-all duration-300"
      >
        <Undo2 size={24} strokeWidth={2.2} />
        <span className="hidden sm:inline font-medium">Volver</span>
      </button>

      {/* 🏷️ Título superior */}
      <h1 className="absolute top-6 right-10 text-xl font-bold z-20">SignAI</h1>

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
            onClick={cat.onClick}
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
