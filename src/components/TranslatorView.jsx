import React from "react";
import manos from "../assets/image.png";
import { useNavigate } from "react-router-dom";

export default function TranslatorView() {
  const navigate = useNavigate(); 
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center p-8">
      <h2 className="text-3xl font-bold mb-4">SignAI</h2>
      <img src={manos} alt="Manos LSM" className="w-96 rounded-lg shadow-md mb-8" />

      <div className="bg-white rounded-xl p-8 w-3/4 shadow-lg">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">¡Hola!</h1>
        <p className="text-sm text-gray-600 italic">
          ⚠️ Para un mejor uso de la aplicación, mantén tus manos bien enfocadas en la cámara,
          en un lugar iluminado y con fondo claro. Evita movimientos bruscos.
        </p>
      </div>

      <button
        onClick={() => navigate("/Camara")} 
        className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
      >
        Iniciar
      </button>
    </div>
  );
}
