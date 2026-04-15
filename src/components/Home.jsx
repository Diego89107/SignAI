import React, { useState, useEffect, useRef } from "react";
import manos from "../assets/hands.jpeg";
import { useNavigate } from "react-router-dom";

export default function Home({ sidebarOpen, onTutorialChange }) {
  const navigate = useNavigate();
  
  // Referencia para el botón
  const botonRef = useRef(null); 
  
  const [mostrarTutorial, setMostrarTutorial] = useState(false);
  const [botonCoords, setBotonCoords] = useState({ x: 0, y: 0, r: 0, maxR: 0 });
  const [animarAgua, setAnimarAgua] = useState(false);
  const [animarTexto, setAnimarTexto] = useState(false);

  useEffect(() => {
    const calcularPosicion = () => {
      if (botonRef.current) {
        const rect = botonRef.current.getBoundingClientRect();
        
        const radioMaximoPantalla = Math.ceil(Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2));

        setBotonCoords({
          x: rect.left + rect.width / 2, // Centro X
          y: rect.top + rect.height / 2, // Centro Y
          r: Math.max(rect.width, rect.height) / 2 + 15, // Hueco limpio
          maxR: radioMaximoPantalla // Límite del agua en píxeles exactos
        });
      }
    };

    const tourCompletado = localStorage.getItem("tourSignAICompleted");

    if (!tourCompletado) {
      calcularPosicion();
      setMostrarTutorial(true);
      onTutorialChange?.(true);

      // 1. Iniciamos el flujo de agua casi al instante
      setTimeout(() => setAnimarAgua(true), 100);
      // 2. Aparece la burbuja de texto cuando el agua cubre la pantalla
      setTimeout(() => setAnimarTexto(true), 900);

      window.addEventListener("resize", calcularPosicion);
      return () => window.removeEventListener("resize", calcularPosicion);
    }
  }, []);

  const cerrarTutorial = () => {
    setAnimarTexto(false);
    setAnimarAgua(false); // El agua se retrae hacia la esquina
    
    setTimeout(() => {
      localStorage.setItem("tourSignAICompleted", "true");
      setMostrarTutorial(false);
      onTutorialChange?.(false);
    }, 1000); 
  };

  return (
    <div
      className={`
        relative isolate flex flex-col items-center justify-center w-full min-h-[calc(100vh-6rem)] text-center
        transition-all duration-700 ease-in-out
        ${sidebarOpen ? "ml-0" : ""}
      `}
    >
      {/* OVERLAY DE TUTORIAL */}
      {mostrarTutorial && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto">

          {/* EL FLUJO DE AGUA Y EL HUECO CON ANILLO */}
          <div
            className="absolute inset-0 backdrop-blur-md"
            style={{
              backgroundColor: "rgba(79, 70, 229, 0.72)",

              // Expansión tipo agua desde la esquina
              clipPath: animarAgua ? `circle(${botonCoords.maxR}px at 0px 0px)` : `circle(0px at 0px 0px)`,
              WebkitClipPath: animarAgua ? `circle(${botonCoords.maxR}px at 0px 0px)` : `circle(0px at 0px 0px)`,

              // Hueco transparente + anillo blanco que resalta el botón
              maskImage: `radial-gradient(circle at ${botonCoords.x}px ${botonCoords.y}px, transparent ${botonCoords.r}px, rgba(255,255,255,0.9) ${botonCoords.r + 1}px, rgba(255,255,255,0.9) ${botonCoords.r + 5}px, rgba(0,0,0,1) ${botonCoords.r + 7}px)`,
              WebkitMaskImage: `radial-gradient(circle at ${botonCoords.x}px ${botonCoords.y}px, transparent ${botonCoords.r}px, rgba(255,255,255,0.9) ${botonCoords.r + 1}px, rgba(255,255,255,0.9) ${botonCoords.r + 5}px, rgba(0,0,0,1) ${botonCoords.r + 7}px)`,

              transition: "clip-path 1.2s cubic-bezier(0.25, 1, 0.5, 1), -webkit-clip-path 1.2s cubic-bezier(0.25, 1, 0.5, 1)"
            }}
          />

          {/* CAJA DE INSTRUCCIONES FLOTANTE */}
          <div 
            className={`
              absolute bg-white dark:bg-[#151822] text-gray-800 dark:text-gray-100 p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1f2833] w-[90%] max-w-[320px] flex flex-col items-center text-center 
              transition-all duration-500
              ${animarTexto ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95"}
            `}
            style={{
              top: botonCoords.y - botonCoords.r - 190, 
              left: botonCoords.x,
              transform: "translateX(-50%)" 
            }}
          >
            <p className="font-medium text-sm sm:text-base mb-5 leading-relaxed">
              Para iniciar la traducción presiona este botón, recuerda hacer las señas correctamente.
            </p>
            <button 
              onClick={cerrarTutorial}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              Entendido
            </button>
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[14px] border-transparent border-t-white dark:border-t-[#151822]" />
          </div>
        </div>
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