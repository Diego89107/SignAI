import React from "react";
import manos from "../assets/hands.jpeg";
import { useNavigate } from "react-router-dom";
import Tutorial from "./common/Tutorial";

const HOME_TUTORIAL_STEPS = [
  {
    key: "iniciar",
    title: "Iniciar traducción",
    text: "Para iniciar la traducción presiona este botón, recuerda hacer las señas correctamente.",
    placement: "top",
    padding: 10,
    radius: 16,
  },
  {
    key: "traductor",
    title: "Traductor",
    text: "En este apartado puedes regresar a la pantalla principal e iniciar la traducción de señas en cualquier momento.",
    placement: "right",
  },
  {
    key: "ajustes",
    title: "Ajustes",
    text: "En este apartado puedes escoger diferentes voces, color de fondo, cámara y velocidad de voz.",
    placement: "right",
  },
  {
    key: "aprendizaje",
    title: "Aprendizaje",
    text: "En este apartado puedes acceder a lecciones y juegos interactivos para aprender Lengua de Señas Mexicana.",
    placement: "right",
  },
  {
    key: "acerca",
    title: "Acerca de nosotros",
    text: "En este apartado puedes conocer al equipo detrás de SignAI y la finalidad del proyecto.",
    placement: "right",
  },
];

const waitForTransition = (element, propertyName, fallback = 800) =>
  new Promise((resolve) => {
    if (!element) return resolve();
    const handler = (e) => {
      if (e.target !== element || e.propertyName !== propertyName) return;
      cleanup();
    };
    const cleanup = () => {
      element.removeEventListener("transitionend", handler);
      clearTimeout(timeoutId);
      resolve();
    };
    const timeoutId = setTimeout(cleanup, fallback);
    element.addEventListener("transitionend", handler);
  });

export default function Home({ sidebarOpen, setSidebarOpen, onTutorialChange }) {
  const navigate = useNavigate();

  // Abre el sidebar antes de pasar al paso 1 (que apunta a un item del sidebar).
  const prepareStep = async (from, to) => {
    if (from === 0 && to === 1 && !sidebarOpen) {
      setSidebarOpen?.(true);
      const sidebarEl = document.querySelector("aside");
      await waitForTransition(sidebarEl, "transform");
    }
  };

  return (
    <div
      className={`
        relative isolate flex flex-col items-center justify-center w-full min-h-[calc(100vh-6rem)] text-center
        transition-all duration-700 ease-in-out
        ${sidebarOpen ? "ml-0" : ""}
      `}
    >
      {/* 🟢 FONDO MÁGICO */}
      <div className="fixed inset-0 bg-[#f9fbf9] dark:bg-[#0b0f19] -z-10 transition-colors duration-700 pointer-events-none" />

      {/* 1. TÍTULO */}
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight drop-shadow-sm mb-4 sm:mb-6">
        LSM Traductor
      </h2>

      {/* 2. IMAGEN */}
      <img
        src={manos}
        alt="Manos LSM"
        className="
          h-[30vh] sm:h-[35vh] lg:h-[40vh] w-auto max-w-full
          transition-all duration-700 ease-in-out rounded-2xl shadow-[0_6px_30px_-10px_rgba(0,0,0,0.3)]
          dark:shadow-[0_6px_30px_-10px_rgba(0,0,0,0.6)] border border-gray-200 dark:border-[#1f2833]
          mb-6 sm:mb-8
        "
      />

      {/* 3. CONTENEDOR DE TEXTO */}
      <div
        className={`
          bg-white dark:bg-[#151822] rounded-2xl shadow-lg p-6 sm:p-8
          transition-all duration-700 ease-in-out border border-gray-200 dark:border-[#1f2833]
          w-full mb-6 sm:mb-8
          ${sidebarOpen ? "max-w-[700px]" : "max-w-[800px]"}
        `}
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-3 transition-all">
          ¡Hola!
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 italic leading-relaxed transition-all">
          ⚠️{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            Para un mejor uso de la aplicación,
          </span>{" "}
          mantén tus manos bien enfocadas en la cámara, en un lugar iluminado y con fondo claro.
          Realiza las señas de forma clara y evita movimientos bruscos. Recuerda que esta herramienta
          es un apoyo y puede presentar errores si las condiciones no son adecuadas.
        </p>
      </div>

      {/* 4. BOTÓN */}
      <button
        data-tutorial="iniciar"
        onClick={() => navigate("/Camara")}
        className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-10 py-3 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 font-semibold text-lg tracking-wide"
      >
        Iniciar
      </button>

      <Tutorial
        steps={HOME_TUTORIAL_STEPS}
        storageKey="tourSignAICompleted"
        prepareStep={prepareStep}
        onStart={() => onTutorialChange?.(true)}
        onFinish={() => onTutorialChange?.(false)}
      />
    </div>
  );
}
