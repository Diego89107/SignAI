import React from "react";
import { Mail, Copy, Check, CheckCircle2 } from "lucide-react";
import logoClaro from "../../assets/SignAiMesa de trabajo 3.png";
import logoOscuro from "../../assets/SignAiMesa de trabajo 4.png";
import Tutorial from "../common/Tutorial";

const ACERCA_TUTORIAL_STEPS = [
  {
    key: "acerca-intro",
    title: "Quiénes somos",
    text: "Aquí conoces la motivación detrás de SignAI y el equipo que trabaja para derribar barreras de comunicación.",
    placement: "bottom",
  },
  {
    key: "acerca-mision",
    title: "Misión",
    text: "Nuestra misión: facilitar el aprendizaje de la LSM con herramientas accesibles e inclusivas.",
    placement: "bottom",
  },
  {
    key: "acerca-vision",
    title: "Visión",
    text: "Nuestra visión a futuro: ser la plataforma de referencia en accesibilidad e innovación para la LSM.",
    placement: "top",
  },
  {
    key: "acerca-contacto",
    title: "Contacto",
    text: "Si tienes dudas, sugerencias o reportes, escríbenos. Puedes copiar el correo con un solo clic.",
    placement: "top",
  },
];

export default function Acerca({ sidebarOpen }) {
  const email = "L23ISC001@ebano.tecnm.mx";
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("No se pudo copiar el correo", err);
    }
  };

  return (
    <div
      className="relative isolate flex flex-col items-center justify-center min-h-screen w-full text-center
      text-gray-900 dark:text-gray-100 transition-all duration-700 ease-in-out"
    >
      <div className="fixed inset-0 bg-gray-50 dark:bg-[#0b0f19] -z-10 transition-colors duration-700 pointer-events-none" />

      <div
        className={`transition-all duration-700 ease-in-out ${
          sidebarOpen ? "max-w-3xl scale-[0.98]" : "max-w-5xl scale-100"
        } w-full`}
      >
        <div className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] shadow-lg rounded-2xl p-10 transition-all duration-700">
          <h1 className="text-4xl font-extrabold mb-6 text-gray-800 dark:text-gray-100">
            Acerca de nosotros
          </h1>

          {/* 🌓 Logotipos Dinámicos */}

          {/* 🔆 1. Logo para Modo Claro */}
          <img
            src={logoClaro} // ⬅️ 2. USAMOS LA VARIABLE IMPORTADA
            alt="Logo SignAi Modo Claro"
            className="mx-auto mb-6 w-full max-w-xs h-auto block dark:hidden"
          />

          {/* 🌙 2. Logo para Modo Oscuro */}
          <img
            src={logoOscuro} // ⬅️ 2. USAMOS LA VARIABLE IMPORTADA
            alt="Logo SignAi Modo Oscuro"
            className="mx-auto mb-6 w-full max-w-xs h-auto hidden dark:block"
          />

          <p data-tutorial="acerca-intro" className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            SignAI nace para derribar barreras de comunicación entre personas sordas y oyentes
            mediante tecnología educativa e inteligencia artificial.
            Creemos que aprender la Lengua de Señas Mexicana debe ser un proceso moderno,
            intuitivo e inclusivo.
          </p>

          {/* Misión */}
          <div data-tutorial="acerca-mision" className="text-left mt-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">Misión</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Facilitar el aprendizaje de LSM mediante herramientas tecnológicas accesibles e
              interactivas, promoviendo la inclusión y la comunicación efectiva.
            </p>
          </div>

          {/* Visión */}
          <div data-tutorial="acerca-vision" className="text-left mt-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">Visión</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Ser la plataforma de referencia en accesibilidad e innovación tecnológica, transformando
              la forma en que la sociedad se conecta con la Lengua de Señas Mexicana.
            </p>
          </div>

          {/* Contacto */}
          <div className="mt-10 flex justify-center">
            <div data-tutorial="acerca-contacto" className="group flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-[#1f2833] bg-gray-50 dark:bg-[#0f131c] px-5 py-3 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Escríbenos
                </span>
                <a
                  href={`mailto:${email}`}
                  className="text-sm font-medium text-gray-800 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Contacto SignAI
                </a>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copiar correo"
                title={copied ? "Copiado" : "Copiar correo"}
                className="ml-2 inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-[#1a1f2b] transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Tutorial
        steps={ACERCA_TUTORIAL_STEPS}
        storageKey="tourSignAI_acerca"
      />
    </div>
  );
}