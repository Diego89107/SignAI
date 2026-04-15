import React, { useEffect, useState } from "react";
import { Sun, Moon, AudioLines, Speech, Camera } from "lucide-react";

export default function Ajustes({ sidebarOpen }) {
  const [theme, setTheme] = useState(localStorage.getItem("lsm_theme") || "light");
  const isDark = theme === "dark";
  const [velocidadVoz, setVelocidadVoz] = useState(1);
  const [tipoVoz, setTipoVoz] = useState("Femenina");

  // 🎥 Nueva: manejo de cámaras
  const [camaras, setCamaras] = useState([]);
  const [camaraSeleccionada, setCamaraSeleccionada] = useState(localStorage.getItem("camara_lsm") || "");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("lsm_theme", theme);
  }, [theme]);

  // 🔍 Obtener lista de cámaras
  useEffect(() => {
    async function obtenerCamaras() {
      try {
        const dispositivos = await navigator.mediaDevices.enumerateDevices();
        const camarasVideo = dispositivos.filter((d) => d.kind === "videoinput");
        setCamaras(camarasVideo);
      } catch (err) {
        console.error("Error al listar cámaras:", err);
      }
    }
    obtenerCamaras();
  }, []);

  // 💾 Guardar selección
  const cambiarCamara = (id) => {
    setCamaraSeleccionada(id);
    localStorage.setItem("camara_lsm", id);
  };

  return (
    <div
      // ⚠️ 1. Quitamos los colores de fondo de aquí y agregamos 'relative isolate' para que la magia funcione
      className="relative isolate flex flex-col items-center justify-center min-h-screen w-full p-10 
      text-gray-900 dark:text-gray-100 transition-all duration-700 ease-in-out"
    >
      {/* 🟢 2. FONDO MÁGICO: Este div ignora las reglas y pinta el 100% de la pantalla por detrás (-z-10) */}
      <div className="fixed inset-0 bg-gray-50 dark:bg-[#0b0f19] -z-10 transition-colors duration-700 pointer-events-none" />

      <div
        className={`transition-all duration-700 ease-in-out ${
          sidebarOpen ? "max-w-3xl scale-[0.98]" : "max-w-5xl scale-100"
        } w-full`}
      >
        <h2 className="text-3xl font-extrabold mb-8 text-center">Ajustes</h2>

        {/* ====== Tema ====== */}
        <section className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-xl shadow-md p-6 mb-6 transition-all duration-700">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Sun className="text-yellow-400" /> Tema
          </h3>

          <div className="flex gap-4 justify-start">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                !isDark
                  ? "bg-indigo-100 text-indigo-700 font-medium shadow-sm"
                  : "bg-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1f1f1f]"
              }`}
            >
              <Sun size={18} /> Modo claro
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                isDark
                  ? "bg-indigo-100 text-indigo-700 font-medium shadow-sm"
                  : "bg-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1f1f1f]"
              }`}
            >
              <Moon size={18} /> Modo oscuro
            </button>
          </div>
        </section>

        {/* ====== Velocidad ====== */}
        <section className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-xl shadow-md p-6 mb-6 transition-all duration-700">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <AudioLines className="text-indigo-600 dark:text-indigo-400" />
            Velocidad de la voz
          </h3>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={velocidadVoz}
            onChange={(e) => setVelocidadVoz(parseFloat(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <p className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300">
            {velocidadVoz.toFixed(1)}x
          </p>
        </section>

        {/* ====== Tipo de voz ====== */}
        <section className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-xl shadow-md p-6 mb-6 transition-all duration-700">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Speech className="text-indigo-600 dark:text-indigo-400" />
            Tipo de voz
          </h3>
          <select
            value={tipoVoz}
            onChange={(e) => setTipoVoz(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-[#1f1f1f] text-gray-700 dark:text-gray-200 transition-all duration-700"
          >
            <option value="Femenina">Femenina</option>
            <option value="Masculina">Masculina</option>
          </select>
        </section>

        {/* ====== Cámara ====== */}
        <section className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-xl shadow-md p-6 transition-all duration-700">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Camera className="text-indigo-600 dark:text-indigo-400" />
            Cámara
          </h3>
          {camaras.length > 0 ? (
            <select
              value={camaraSeleccionada}
              onChange={(e) => cambiarCamara(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-[#1f1f1f] text-gray-700 dark:text-gray-200 transition-all duration-700"
            >
              {camaras.map((cam, i) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Cámara ${i + 1}`}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No se detectaron cámaras o no se otorgaron permisos.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}