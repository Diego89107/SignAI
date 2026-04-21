import React, { useEffect, useRef, useState } from "react";
import { Sun, Moon, AudioLines, Speech, Camera, Mic2, Volume2, ChevronDown, MonitorSpeaker, Cloud, Check, User, UserRound } from "lucide-react";
import useSpeech, { hasElevenKey } from "../../hooks/useSpeech";

const ELEVEN_VOICES = [
  { id: "6BEk9bRlUBhlAoIbhBYK", name: "Arturo", gender: "Masculina", origin: "es" },
  { id: "pBabaO9WxfrjXjKADHma", name: "Cindy", gender: "Femenina", origin: "es" },
  { id: "hrlCBOGwBPZYViXHeZjS", name: "Sofia", gender: "Femenina", origin: "es" },
  { id: "qRUgOhnxGASxirG4fKjv", name: "David", gender: "Masculina", origin: "es" },
];

function FancyDropdown({ value, options, onChange, placeholder = "Seleccionar…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = options.find((o) => o.id === value) || null;
  const CurrentIcon = current?.Icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 pl-4 pr-10 py-2.5 rounded-lg bg-gradient-to-br from-indigo-50 to-white dark:from-[#1a1f2e] dark:to-[#151822] border border-indigo-200 dark:border-indigo-500/30 text-left shadow-sm hover:border-indigo-400 dark:hover:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 cursor-pointer transition-all duration-300"
      >
        {CurrentIcon && (
          <span className="flex items-center justify-center w-8 h-8 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 shrink-0">
            <CurrentIcon size={16} />
          </span>
        )}
        <span className="flex flex-col min-w-0 flex-1">
          <span className="font-medium text-gray-800 dark:text-gray-100 truncate">
            {current?.label ?? placeholder}
          </span>
          {current?.hint && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {current.hint}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 dark:text-indigo-400 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul className="scrollbar-thin absolute z-20 mt-2 w-full max-h-72 overflow-y-auto rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-[#151822] shadow-xl shadow-indigo-500/10">
          {options.map(({ id, label, hint, Icon }) => {
            const active = value === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200 ${
                    active
                      ? "bg-indigo-50 dark:bg-indigo-500/15"
                      : "hover:bg-gray-50 dark:hover:bg-[#1f2433]"
                  }`}
                >
                  {Icon && (
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                  )}
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-gray-800 dark:text-gray-100 truncate">
                      {label}
                    </span>
                    {hint && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {hint}
                      </span>
                    )}
                  </span>
                  {active && (
                    <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


export default function Ajustes({ sidebarOpen }) {
  const [theme, setTheme] = useState(localStorage.getItem("lsm_theme") || "light");
  const isDark = theme === "dark";

  const { voices, settings, update, speak, stop, speaking } = useSpeech();
  const elevenKeyMissing = settings.provider === "elevenlabs" && !hasElevenKey();

  const PROVIDER_OPTIONS = [
    { id: "webspeech", label: "Web Speech", hint: "Nativa del sistema · offline", Icon: MonitorSpeaker },
    { id: "elevenlabs", label: "ElevenLabs", hint: "IA en la nube · alta calidad", Icon: Cloud },
  ];

  const ELEVEN_OPTIONS = ELEVEN_VOICES.map((v) => ({
    id: v.id,
    label: v.name,
    hint: v.gender,
    Icon: v.gender === "Femenina" ? UserRound : User,
  }));

  const [camaras, setCamaras] = useState([]);
  const [camaraSeleccionada, setCamaraSeleccionada] = useState(
    localStorage.getItem("camara_lsm") || ""
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("lsm_theme", theme);
  }, [theme]);

  useEffect(() => {
    update({
      elevenModel: "eleven_multilingual_v2",
      elevenStability: 0.5,
      elevenSimilarity: 0.75,
      elevenStyle: 0,
      elevenSpeakerBoost: true,
    });
  }, []);

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
          <FancyDropdown
            value={settings.provider}
            options={PROVIDER_OPTIONS}
            onChange={(id) => update({ provider: id })}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Web Speech funciona offline y usa las voces instaladas en tu sistema. ElevenLabs usa voces de IA en la nube con mayor calidad.
          </p>
        </section>

        {/* ====== Aviso de API key ElevenLabs ====== */}
        {elevenKeyMissing && (
          <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/60 rounded-xl p-4 mb-6 text-sm text-amber-800 dark:text-amber-200">
            ⚠️ No se encontró la API key de ElevenLabs. Define <code className="font-mono">VITE_ELEVEN_API_KEY</code> en tu archivo <code className="font-mono">.env</code> para usar este motor.
          </section>
        )}

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
            aria-label="Velocidad de la voz"
            aria-valuetext={`${settings.rate.toFixed(1)} veces`}
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
              <FancyDropdown
                value={settings.voiceURI || ""}
                onChange={(id) => update({ voiceURI: id })}
                options={[
                  { id: "", label: "Automática", hint: "Elegir según el sistema", Icon: Volume2 },
                  ...vocesEs.map((v) => ({
                    id: v.voiceURI,
                    label: v.name,
                    hint: v.lang,
                    Icon: Speech,
                  })),
                ]}
              />
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
            <FancyDropdown
              value={settings.elevenVoiceId}
              options={ELEVEN_OPTIONS}
              onChange={(id) => update({ elevenVoiceId: id, elevenModel: "eleven_multilingual_v2" })}
            />
          </section>
        )}

        {/* ====== Probar voz ====== */}
        <section className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-xl shadow-md p-6 mb-6 transition-all duration-700 flex justify-center">
          <button
            onClick={() =>
              speaking ? stop() : speak("Hola, soy SignAI. Esta es tu voz seleccionada.")
            }
            className={`px-6 py-2.5 rounded-xl font-semibold shadow-lg transition-all active:scale-95 text-white ${
              speaking
                ? "bg-rose-600 hover:bg-rose-700 animate-pulse"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {speaking ? "⏹ Detener" : "🔊 Probar voz"}
          </button>
        </section>

        {/* ====== Cámara ====== */}
        <section className="bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-xl shadow-md p-6 transition-all duration-700">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Camera className="text-indigo-600 dark:text-indigo-400" />
            Cámara
          </h3>
          {camaras.length > 0 ? (
            <FancyDropdown
              value={camaraSeleccionada || camaras[0]?.deviceId || ""}
              onChange={(id) => cambiarCamara(id)}
              options={camaras.map((cam, i) => ({
                id: cam.deviceId,
                label: cam.label || `Cámara ${i + 1}`,
                hint: cam.label ? "Dispositivo detectado" : "Sin nombre · permisos limitados",
                Icon: Camera,
              }))}
            />
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
