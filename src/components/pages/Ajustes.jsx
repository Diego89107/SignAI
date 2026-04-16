import React, { useEffect, useState } from "react";
import { Sun, Moon, AudioLines, Speech, Camera, Mic2, Volume2 } from "lucide-react";
import useSpeech from "../../hooks/useSpeech";

const ELEVEN_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel — Femenina" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah — Femenina" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi — Femenina" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli — Femenina" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte — Femenina" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam — Masculina" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh — Masculina" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold — Masculina" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam — Masculina" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel — Masculina" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam — Masculina" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni — Masculina" },
];

export default function Ajustes({ sidebarOpen }) {
  const [theme, setTheme] = useState(localStorage.getItem("lsm_theme") || "light");
  const isDark = theme === "dark";

  const { voices, settings, update, speak } = useSpeech();

  const [camaras, setCamaras] = useState([]);
  const [camaraSeleccionada, setCamaraSeleccionada] = useState(
    localStorage.getItem("camara_lsm") || ""
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("lsm_theme", theme);
  }, [theme]);

  useEffect(() => {
    async function obtenerCamaras() {
      try {
        const dispositivos = await navigator.mediaDevices.enumerateDevices();
        setCamaras(dispositivos.filter((d) => d.kind === "videoinput"));
      } catch (err) {
        console.error("Error al listar cámaras:", err);
      }
    }
    obtenerCamaras();
  }, []);

  const cambiarCamara = (id) => {
    setCamaraSeleccionada(id);
    localStorage.setItem("camara_lsm", id);
  };

  const vocesEs = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));

  return (
    <div className="relative isolate flex flex-col items-center justify-center min-h-screen w-full p-10 text-gray-900 dark:text-gray-100 transition-all duration-700 ease-in-out">
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

        {/* ====== Motor de voz ====== */}
        <section className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-xl shadow-md p-6 mb-6 transition-all duration-700">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Mic2 className="text-indigo-600 dark:text-indigo-400" />
            Motor de voz
          </h3>
          <select
            value={settings.provider}
            onChange={(e) => update({ provider: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-[#1f1f1f] text-gray-700 dark:text-gray-200 transition-all duration-700"
          >
            <option value="webspeech">Web Speech (nativa del sistema)</option>
            <option value="elevenlabs">ElevenLabs (IA en la nube)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Web Speech funciona offline y usa las voces instaladas en tu sistema. ElevenLabs usa voces de IA en la nube con mayor calidad.
          </p>
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
            value={settings.rate}
            onChange={(e) => update({ rate: parseFloat(e.target.value) })}
            className="w-full accent-indigo-600"
          />
          <p className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300">
            {settings.rate.toFixed(1)}x
          </p>
        </section>

        {/* ====== Tipo de voz ====== */}
        {settings.provider === "webspeech" && (
          <section className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-xl shadow-md p-6 mb-6 transition-all duration-700">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Volume2 className="text-indigo-600 dark:text-indigo-400" />
              Tipo de voz
            </h3>
            {vocesEs.length > 0 ? (
              <select
                value={settings.voiceURI}
                onChange={(e) => update({ voiceURI: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-[#1f1f1f] text-gray-700 dark:text-gray-200 transition-all duration-700"
              >
                <option value="">Automática</option>
                {vocesEs.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cargando voces disponibles…
              </p>
            )}
          </section>
        )}

        {/* ====== Tipo de voz ElevenLabs ====== */}
        {settings.provider === "elevenlabs" && (
          <section className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-xl shadow-md p-6 mb-6 transition-all duration-700">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Speech className="text-indigo-600 dark:text-indigo-400" />
              Tipo de voz
            </h3>
            <select
              value={settings.elevenVoiceId}
              onChange={(e) => update({ elevenVoiceId: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 mb-4 bg-white dark:bg-[#1f1f1f] text-gray-700 dark:text-gray-200 transition-all duration-700"
            >
              {ELEVEN_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Modelo</label>
            <select
              value={settings.elevenModel}
              onChange={(e) => update({ elevenModel: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-[#1f1f1f] text-gray-700 dark:text-gray-200 transition-all duration-700"
            >
              <option value="eleven_multilingual_v2">Multilingual v2 (recomendado)</option>
              <option value="eleven_turbo_v2_5">Turbo v2.5 (más rápido)</option>
              <option value="eleven_monolingual_v1">Monolingual v1</option>
            </select>
          </section>
        )}

        {/* ====== Probar voz ====== */}
        <section className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-xl shadow-md p-6 mb-6 transition-all duration-700 flex justify-center">
          <button
            onClick={() => speak("Hola, soy SignAI. Esta es tu voz seleccionada.")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg transition-all active:scale-95"
          >
            🔊 Probar voz
          </button>
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
