import React from "react";
import manos from "../assets/hands.jpeg";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, BookOpen, Lightbulb, Hand, Target, Camera, Zap, Volume2 } from "lucide-react";
import Tutorial from "./common/Tutorial";
import PageLayout from "./common/PageLayout";
import ResponsiveContainer from "./common/ResponsiveContainer";

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

const TIPS = [
  {
    icon: Lightbulb,
    title: "Buena iluminación",
    text: "Ubícate en un lugar bien iluminado con fondo claro.",
    color: "from-amber-400 to-orange-500",
  },
  {
    icon: Hand,
    title: "Manos enfocadas",
    text: "Mantén tus manos visibles y centradas en la cámara.",
    color: "from-emerald-400 to-teal-500",
  },
  {
    icon: Target,
    title: "Señas claras",
    text: "Realiza las señas con precisión y evita movimientos bruscos.",
    color: "from-indigo-400 to-indigo-600",
  },
];

const STEPS = [
  { icon: Camera, label: "Activa la cámara" },
  { icon: Hand, label: "Haz la seña" },
  { icon: Volume2, label: "Escucha la traducción" },
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" },
  }),
};

export default function Home({ sidebarOpen, setSidebarOpen, onTutorialChange }) {
  const navigate = useNavigate();

  const prepareStep = async (from, to) => {
    if (from === 0 && to === 1 && !sidebarOpen) {
      setSidebarOpen?.(true);
      const sidebarEl = document.querySelector("aside");
      await waitForTransition(sidebarEl, "transform");
    }
  };

  return (
    <PageLayout className="min-h-[calc(100vh-6rem)] overflow-hidden">
      <ResponsiveContainer size="xl" className="relative py-8 sm:py-12 2xl:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 2xl:gap-20 items-center mb-12 sm:mb-16 2xl:mb-24">
          {/* Columna izquierda: imagen */}
          <motion.div
            className="relative order-2 lg:order-1"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <img
                src={manos}
                alt="Manos LSM"
                className="w-full h-auto max-h-[420px] 2xl:max-h-[560px] object-cover rounded-3xl shadow-[0_20px_60px_-15px_rgba(79,70,229,0.45)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-white/40 dark:border-white/5"
              />
              {/* Badge flotante */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 dark:bg-[#151822]/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/40 dark:border-white/10"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  IA en tiempo real
                </span>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Columna derecha: texto + CTA */}
          <div className="order-1 lg:order-2 text-center lg:text-left">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                SignAI · Lengua de Señas Mexicana
              </span>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4 2xl:mb-6 leading-tight"
            >
              Traduce señas{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
                en tiempo real
              </span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
              className="text-base sm:text-lg 2xl:text-xl text-gray-600 dark:text-gray-300 mb-8 2xl:mb-10 max-w-xl 2xl:max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Conecta con la comunidad sorda a través de la inteligencia artificial.
              Convierte la Lengua de Señas Mexicana en voz, al instante.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <button
                data-tutorial="iniciar"
                onClick={() => navigate("/Camara")}
                className="group relative inline-flex items-center justify-center gap-2 2xl:gap-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-8 2xl:px-10 py-3.5 2xl:py-4.5 rounded-xl font-semibold text-base 2xl:text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-300"
              >
                <span className="absolute inset-0 rounded-xl bg-indigo-400 opacity-0 group-hover:opacity-30 blur-xl transition-opacity" />
                <Play className="w-5 h-5 2xl:w-6 2xl:h-6 relative" fill="currentColor" />
                <span className="relative">Iniciar Traducción</span>
              </button>

              <button
                onClick={() => navigate("/Aprendizaje")}
                className="inline-flex items-center justify-center gap-2 2xl:gap-3 bg-white/80 dark:bg-[#151822]/80 backdrop-blur hover:bg-white dark:hover:bg-[#1f2433] text-gray-800 dark:text-gray-100 px-8 2xl:px-10 py-3.5 2xl:py-4.5 rounded-xl font-semibold text-base 2xl:text-lg border border-gray-200 dark:border-[#1f2833] hover:scale-[1.02] active:scale-95 transition-all duration-300"
              >
                <BookOpen className="w-5 h-5 2xl:w-6 2xl:h-6" />
                Aprender LSM
              </button>
            </motion.div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 2xl:gap-20 items-start">
          {/* CÓMO FUNCIONA */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="lg:pl-4 text-center lg:text-left"
          >
            <h2 className="text-sm 2xl:text-base font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-6 2xl:mb-8">
              Cómo funciona
            </h2>
            <div className="flex flex-col gap-5 2xl:gap-7">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.label}
                    variants={fadeUp}
                    custom={i}
                    className="flex items-center gap-4 2xl:gap-6"
                  >
                    <div className="relative w-14 h-14 2xl:w-20 2xl:h-20 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] shadow-md">
                      <Icon className="w-6 h-6 2xl:w-8 2xl:h-8 text-indigo-600 dark:text-indigo-400" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 2xl:w-8 2xl:h-8 rounded-full bg-indigo-600 text-white text-xs 2xl:text-sm font-bold flex items-center justify-center shadow">
                        {i + 1}
                      </span>
                    </div>
                    <span className="text-base 2xl:text-xl font-medium text-gray-700 dark:text-gray-300">
                      {step.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* RECOMENDACIONES (CUADRO ÚNICO) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative bg-white/80 dark:bg-[#151822]/80 backdrop-blur rounded-2xl 2xl:rounded-3xl border border-gray-200 dark:border-[#1f2833] shadow-lg p-6 2xl:p-9 overflow-hidden"
          >
            {/* Acento de fondo */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 blur-2xl pointer-events-none" />

            <div className="relative flex items-center gap-2 2xl:gap-3 mb-5 2xl:mb-7">
              <div className="w-8 h-8 2xl:w-11 2xl:h-11 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 2xl:w-5 2xl:h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-base 2xl:text-xl font-bold text-gray-800 dark:text-gray-100">
                Recomendaciones
              </h2>
            </div>

            <div className="relative flex flex-col gap-4 2xl:gap-6">
              {TIPS.map((tip, i) => {
                const Icon = tip.icon;
                return (
                  <div key={tip.title} className="flex items-start gap-3 2xl:gap-4">
                    <div
                      className={`w-9 h-9 2xl:w-12 2xl:h-12 flex-shrink-0 rounded-lg bg-gradient-to-br ${tip.color} flex items-center justify-center shadow-md`}
                    >
                      <Icon className="w-4 h-4 2xl:w-6 2xl:h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm 2xl:text-base font-semibold text-gray-800 dark:text-gray-100 mb-0.5 2xl:mb-1">
                        {tip.title}
                      </h3>
                      <p className="text-xs sm:text-sm 2xl:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                        {tip.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </ResponsiveContainer>

      <Tutorial
        steps={HOME_TUTORIAL_STEPS}
        storageKey="tourSignAICompleted"
        prepareStep={prepareStep}
        onStart={() => onTutorialChange?.(true)}
        onFinish={() => onTutorialChange?.(false)}
      />
    </PageLayout>
  );
}
