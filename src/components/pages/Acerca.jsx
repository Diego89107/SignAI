import React from "react";
import { Mail, Copy, Check, CheckCircle2 } from "lucide-react";
import logoClaro from "../../assets/SignAiMesa de trabajo 3.png";
import logoOscuro from "../../assets/SignAiMesa de trabajo 4.png";
import Tutorial from "../common/Tutorial";
import PageLayout from "../common/PageLayout";
import ResponsiveContainer from "../common/ResponsiveContainer";
import ContentCard from "../common/ContentCard";

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
    <PageLayout
      contentClassName="items-center justify-center min-h-screen text-center text-gray-900 dark:text-gray-100 transition-all duration-700 ease-in-out"
    >

      <ResponsiveContainer
        size={sidebarOpen ? "md" : "lg"}
        className={`transition-all duration-700 ease-in-out ${
          sidebarOpen ? "scale-[0.98]" : "scale-100"
        }`}
      >
        <ContentCard padding="lg" className="transition-all duration-700">
          <h1 className="text-3xl sm:text-4xl 2xl:text-5xl font-extrabold mb-5 sm:mb-6 2xl:mb-8 text-gray-800 dark:text-gray-100">
            Acerca de nosotros
          </h1>

          <img
            src={logoClaro}
            alt="Logo SignAi Modo Claro"
            className="mx-auto mb-6 2xl:mb-8 w-full max-w-xs 2xl:max-w-sm h-auto block dark:hidden"
          />

          <img
            src={logoOscuro}
            alt="Logo SignAi Modo Oscuro"
            className="mx-auto mb-6 2xl:mb-8 w-full max-w-xs 2xl:max-w-sm h-auto hidden dark:block"
          />

          <p data-tutorial="acerca-intro" className="text-sm sm:text-base 2xl:text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6 2xl:mb-8">
            SignAI nace para derribar barreras de comunicación entre personas sordas y oyentes
            mediante tecnología educativa e inteligencia artificial.
            Creemos que aprender la Lengua de Señas Mexicana debe ser un proceso moderno,
            intuitivo e inclusivo.
          </p>

          <div data-tutorial="acerca-mision" className="text-left mt-6 2xl:mt-8">
            <h2 className="text-xl sm:text-2xl 2xl:text-3xl font-bold mb-2 2xl:mb-3 text-gray-800 dark:text-gray-100">Misión</h2>
            <p className="text-sm sm:text-base 2xl:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              Facilitar el aprendizaje de LSM mediante herramientas tecnológicas accesibles e
              interactivas, promoviendo la inclusión y la comunicación efectiva.
            </p>
          </div>

          <div data-tutorial="acerca-vision" className="text-left mt-6 2xl:mt-8">
            <h2 className="text-xl sm:text-2xl 2xl:text-3xl font-bold mb-2 2xl:mb-3 text-gray-800 dark:text-gray-100">Visión</h2>
            <p className="text-sm sm:text-base 2xl:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              Ser la plataforma de referencia en accesibilidad e innovación tecnológica, transformando
              la forma en que la sociedad se conecta con la Lengua de Señas Mexicana.
            </p>
          </div>

          <div className="mt-8 sm:mt-10 2xl:mt-14 flex justify-center">
            <div data-tutorial="acerca-contacto" className="group flex items-center gap-3 2xl:gap-4 rounded-2xl border border-gray-200 dark:border-[#1f2833] bg-gray-50 dark:bg-[#0f131c] px-4 sm:px-5 2xl:px-7 py-2.5 sm:py-3 2xl:py-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 2xl:w-12 2xl:h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] sm:text-xs 2xl:text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Escríbenos
                </span>
                <a
                  href={`mailto:${email}`}
                  className="text-xs sm:text-sm 2xl:text-base font-medium text-gray-800 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Contacto SignAI
                </a>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copiar correo"
                title={copied ? "Copiado" : "Copiar correo"}
                className="ml-1 sm:ml-2 inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 2xl:w-11 2xl:h-11 rounded-lg text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-[#1a1f2b] transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 2xl:w-5 2xl:h-5 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 2xl:w-5 2xl:h-5" />
                )}
              </button>
            </div>
          </div>
        </ContentCard>
      </ResponsiveContainer>

      <Tutorial
        steps={ACERCA_TUTORIAL_STEPS}
        storageKey="tourSignAI_acerca"
      />
    </PageLayout>
  );
}