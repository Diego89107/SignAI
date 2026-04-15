import React from "react";
import logoClaro from "../../assets/SignAiMesa de trabajo 3.png"; 
import logoOscuro from "../../assets/SignAiMesa de trabajo 4.png"; 

export default function Acerca({ sidebarOpen }) {
  return (
    <div
      className="relative isolate flex flex-col items-center justify-center min-h-screen w-full text-center
      text-gray-900 dark:text-gray-100 transition-all duration-700 ease-in-out"
    >
      {/* 🟢 FONDO MÁGICO: Mantiene el fondo expandido a pantalla completa */}
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

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            SignAI nace para derribar barreras de comunicación entre personas sordas y oyentes
            mediante tecnología educativa e inteligencia artificial.
            Creemos que aprender la Lengua de Señas Mexicana debe ser un proceso moderno,
            intuitivo e inclusivo.
          </p>

          {/* Misión */}
          <div className="text-left mt-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">Misión</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Facilitar el aprendizaje de LSM mediante herramientas tecnológicas accesibles e
              interactivas, promoviendo la inclusión y la comunicación efectiva.
            </p>
          </div>

          {/* Visión */}
          <div className="text-left mt-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">Visión</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Ser la plataforma de referencia en accesibilidad e innovación tecnológica, transformando
              la forma en que la sociedad se conecta con la Lengua de Señas Mexicana.
            </p>
          </div>

          {/* Valores */}
          <div className="text-left mt-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">Valores</h2>
            <ul className="text-gray-600 dark:text-gray-300 leading-relaxed space-y-1">
              <li>• Inclusión – Igualdad de oportunidades comunicativas</li>
              <li>• Respeto – Reconocimiento a la cultura e identidad sorda</li>
              <li>• Innovación – Tecnología para mejorar el aprendizaje</li>
              <li>• Compromiso social – Impacto académico y comunitario</li>
              <li>• Calidad educativa – Contenido claro, confiable y accesible</li>
            </ul>
          </div>

          {/* Contacto */}
          <div className="mt-8">
            <span className="text-sm text-gray-700 dark:text-gray-400">
              📧 Contacto: <span className="font-medium">contacto@signai.mx</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}