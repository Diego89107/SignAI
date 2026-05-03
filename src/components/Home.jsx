import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import manos from "../assets/hands.jpeg";
import { useNavigate } from "react-router-dom";

const tutorialSteps = [
  {
    key: "iniciar",
    text: "Para iniciar la traducción presiona este botón, recuerda hacer las señas correctamente.",
    placement: "top",
  },
  {
    key: "traductor",
    text: "En este apartado puedes regresar a la pantalla principal e iniciar la traducción de señas en cualquier momento.",
    placement: "right",
  },
  {
    key: "ajustes",
    text: "En este apartado puedes escoger diferentes voces, color de fondo, cámara y velocidad de voz.",
    placement: "right",
  },
  {
    key: "aprendizaje",
    text: "En este apartado puedes acceder a lecciones y juegos interactivos para aprender Lengua de Señas Mexicana.",
    placement: "right",
  },
  {
    key: "acerca",
    text: "En este apartado puedes conocer al equipo detrás de SignAI y la finalidad del proyecto.",
    placement: "right",
  },
];

export default function Home({ sidebarOpen, setSidebarOpen, onTutorialChange }) {
  const navigate = useNavigate();

  const botonRef = useRef(null);

  const [mostrarTutorial, setMostrarTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState({
    x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0, radius: 16, maxR: 0,
  });
  const [animarAgua, setAnimarAgua] = useState(false);
  const [animarTexto, setAnimarTexto] = useState(false);
  // Cuando es true, el "hueco" del spotlight se rellena con el mismo color del overlay
  // para que toda la pantalla se vea uniforme mientras se reposiciona entre pasos.
  const [spotlightFilled, setSpotlightFilled] = useState(false);

  const currentStep = tutorialSteps[stepIndex];
  const isLastStep = stepIndex === tutorialSteps.length - 1;

  const computeSpotlight = () => {
    let rect;
    if (stepIndex === 0) {
      rect = botonRef.current?.getBoundingClientRect();
    } else {
      const el = document.querySelector(`[data-tutorial="${currentStep.key}"]`);
      rect = el?.getBoundingClientRect();
    }
    if (!rect || rect.width === 0) return;

    const padding = stepIndex === 0 ? 10 : 6;
    const radioMaximoPantalla = Math.ceil(
      Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2)
    );
    setSpotlight({
      x: rect.left - padding,
      y: rect.top - padding,
      w: rect.width + 2 * padding,
      h: rect.height + 2 * padding,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      radius: stepIndex === 0 ? 16 : 12,
      maxR: radioMaximoPantalla,
    });
  };

  useEffect(() => {
    const tourCompletado = localStorage.getItem("tourSignAICompleted");
    if (tourCompletado) return;

    setMostrarTutorial(true);
    onTutorialChange?.(true);

    const tAgua = setTimeout(() => setAnimarAgua(true), 100);
    const tTexto = setTimeout(() => setAnimarTexto(true), 900);

    return () => {
      clearTimeout(tAgua);
      clearTimeout(tTexto);
    };
  }, [onTutorialChange]);

  useLayoutEffect(() => {
    if (!mostrarTutorial) return;

    // Espera breve para que el sidebar termine de animar antes de medir
    const delay = stepIndex === 0 ? 0 : 60;
    const t = setTimeout(computeSpotlight, delay);

    const onResize = () => computeSpotlight();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarTutorial, stepIndex, sidebarOpen]);

  const avanzarPaso = () => {
    if (stepIndex === 0) {
      // 1) Oculta tarjeta y "tapa" el spotlight para que toda la pantalla se vea uniforme
      setAnimarTexto(false);
      setSpotlightFilled(true);
      setSidebarOpen?.(true);
      // 2) Tras la apertura del sidebar, cambia al paso 1 (el spotlight se reposiciona "a ciegas")
      setTimeout(() => {
        setStepIndex(1);
      }, 450);
      // 3) Una vez ya posicionado en Traductor, revela el spotlight y la nueva tarjeta
      setTimeout(() => {
        setSpotlightFilled(false);
        setAnimarTexto(true);
      }, 850);
      return;
    }
    if (isLastStep) {
      cerrarTutorial();
      return;
    }
    setAnimarTexto(false);
    setTimeout(() => {
      setStepIndex((s) => s + 1);
      setTimeout(() => setAnimarTexto(true), 200);
    }, 280);
  };

  const cerrarTutorial = () => {
    setAnimarTexto(false);
    setAnimarAgua(false);

    setTimeout(() => {
      localStorage.setItem("tourSignAICompleted", "true");
      setMostrarTutorial(false);
      onTutorialChange?.(false);
    }, 1000);
  };

  const cardStyle = (() => {
    if (currentStep.placement === "right") {
      const left = Math.min(
        spotlight.x + spotlight.w + 24,
        window.innerWidth - 340
      );
      return {
        top: spotlight.cy,
        left,
        transform: "translateY(-50%)",
      };
    }
    return {
      top: spotlight.y - 200,
      left: spotlight.cx,
      transform: "translateX(-50%)",
    };
  })();

  const arrowClass =
    currentStep.placement === "right"
      ? "absolute top-1/2 -left-3 -translate-y-1/2 w-0 h-0 border-t-[12px] border-b-[12px] border-r-[14px] border-transparent border-r-white dark:border-r-[#151822]"
      : "absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[14px] border-transparent border-t-white dark:border-t-[#151822]";

  return (
    <div
      className={`
        relative isolate flex flex-col items-center justify-center w-full min-h-[calc(100vh-6rem)] text-center
        transition-all duration-700 ease-in-out
        ${sidebarOpen ? "ml-0" : ""}
      `}
    >
      {/* OVERLAY DE TUTORIAL (portal: fuera del stacking context para cubrir el sidebar) */}
      {mostrarTutorial &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] pointer-events-auto"
            style={{
              clipPath: animarAgua
                ? `circle(${spotlight.maxR}px at 0px 0px)`
                : `circle(0px at 0px 0px)`,
              WebkitClipPath: animarAgua
                ? `circle(${spotlight.maxR}px at 0px 0px)`
                : `circle(0px at 0px 0px)`,
              transition:
                "clip-path 1.2s cubic-bezier(0.25, 1, 0.5, 1), -webkit-clip-path 1.2s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {/* SPOTLIGHT */}
            <div
              style={{
                position: "absolute",
                left: spotlight.x,
                top: spotlight.y,
                width: spotlight.w,
                height: spotlight.h,
                borderRadius: spotlight.radius,
                backgroundColor: spotlightFilled
                  ? "rgba(79, 70, 229, 0.78)"
                  : "transparent",
                boxShadow: "0 0 0 9999px rgba(79, 70, 229, 0.78)",
                outlineStyle: "solid",
                outlineWidth: "2px",
                outlineColor: spotlightFilled
                  ? "rgba(255,255,255,0)"
                  : "rgba(255,255,255,0.9)",
                outlineOffset: "3px",
                transition:
                  "left 0.5s cubic-bezier(0.4, 0, 0.2, 1), top 0.5s cubic-bezier(0.4, 0, 0.2, 1), width 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease, outline-color 0.3s ease",
                pointerEvents: "none",
              }}
            />

            {/* CAJA DE INSTRUCCIONES FLOTANTE */}
            <div
              className={`
                absolute bg-white dark:bg-[#151822] text-gray-800 dark:text-gray-100 p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1f2833] w-[90%] max-w-[320px] flex flex-col items-center text-center
                transition-all duration-300
                ${animarTexto ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-4 scale-95 pointer-events-none"}
              `}
              style={cardStyle}
            >
              <p className="font-medium text-sm sm:text-base mb-5 leading-relaxed">
                {currentStep.text}
              </p>
              <button
                onClick={avanzarPaso}
                disabled={!animarTexto}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-60 disabled:cursor-default"
              >
                {isLastStep ? "Entendido" : "Continuar"}
              </button>
              <div className={arrowClass} />
            </div>
          </div>,
          document.body
        )}

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
        className={`
          w-full object-cover
          h-[30vh] sm:h-[35vh] lg:h-[40vh]
          transition-all duration-700 ease-in-out rounded-2xl shadow-[0_6px_30px_-10px_rgba(0,0,0,0.3)]
          dark:shadow-[0_6px_30px_-10px_rgba(0,0,0,0.6)] border border-gray-200 dark:border-[#1f2833]
          mb-6 sm:mb-8
          ${sidebarOpen ? "max-w-[500px]" : "max-w-[650px]"}
        `}
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
        ref={botonRef}
        onClick={() => navigate("/Camara")}
        className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-10 py-3 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 font-semibold text-lg tracking-wide"
      >
        Iniciar
      </button>
    </div>
  );
}
