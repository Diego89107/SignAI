import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "signai_voice_settings";

const defaults = {
  provider: "webspeech",
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: "es-MX",
  voiceURI: "",
  elevenVoiceId: "EXAVITQu4vr4xnSDxMaL",
  elevenModel: "eleven_multilingual_v2",
  elevenStability: 0.5,
  elevenSimilarity: 0.75,
  elevenStyle: 0,
  elevenSpeakerBoost: true,
};

export const ELEVEN_API_KEY = import.meta.env.VITE_ELEVEN_API_KEY || "";
export const hasElevenKey = () => Boolean(ELEVEN_API_KEY);

export function loadVoiceSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaults;
  }
}

export function saveVoiceSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export default function useSpeech() {
  const [voices, setVoices] = useState([]);
  const [settings, setSettings] = useState(loadVoiceSettings);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveVoiceSettings(next);
      return next;
    });
  }, []);

  const pickWebVoice = useCallback(() => {
    if (!voices.length) return null;
    if (settings.voiceURI) {
      const exact = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (exact) return exact;
    }
    const esVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
    return (esVoices.length ? esVoices : voices)[0];
  }, [voices, settings]);

  const stop = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speakWeb = useCallback(
    (text) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = settings.rate;
      u.pitch = settings.pitch;
      u.volume = settings.volume;
      u.lang = settings.lang;
      const v = pickWebVoice();
      if (v) u.voice = v;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [settings, pickWebVoice]
  );

  const speakEleven = useCallback(
    async (text) => {
      if (!ELEVEN_API_KEY) {
        console.warn("ElevenLabs: falta API key en el archivo .env (VITE_ELEVEN_API_KEY).");
        return;
      }
      try {
        setSpeaking(true);
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${settings.elevenVoiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVEN_API_KEY,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: settings.elevenModel,
              voice_settings: {
                stability: settings.elevenStability,
                similarity_boost: settings.elevenSimilarity,
                style: settings.elevenStyle,
                use_speaker_boost: settings.elevenSpeakerBoost,
                speed: settings.rate,
              },
            }),
          }
        );
        if (!res.ok) {
          console.error("ElevenLabs error:", res.status, await res.text());
          setSpeaking(false);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = settings.volume;
        audio.onended = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audioRef.current = audio;
        await audio.play();
      } catch (err) {
        console.error("ElevenLabs request failed:", err);
        setSpeaking(false);
      }
    },
    [settings]
  );

  const speak = useCallback(
    (text) => {
      if (!text) return;
      stop();
      if (settings.provider === "elevenlabs") return speakEleven(text);
      return speakWeb(text);
    },
    [settings.provider, speakWeb, speakEleven, stop]
  );

  return { voices, settings, update, speak, stop, speaking };
}
