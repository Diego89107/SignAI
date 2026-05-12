import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Tutorial({
  steps,
  storageKey,
  onFinish,
  onStart,
  prepareStep,
}) {
  const cardRef = useRef(null);
  const spotlightRef = useRef(null);

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [animarAgua, setAnimarAgua] = useState(false);
  const [animarTexto, setAnimarTexto] = useState(false);
  const [spotlight, setSpotlight] = useState({
    x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0, radius: 12, maxR: 0,
  });

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const computeSpotlight = () => {
    if (!currentStep) return;
    const el = document.querySelector(`[data-tutorial="${currentStep.key}"]`);
    const rect = el?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;

    const padding = currentStep.padding ?? 8;
    const maxR = Math.ceil(
      Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2)
    );
    setSpotlight({
      x: rect.left - padding,
      y: rect.top - padding,
      w: rect.width + 2 * padding,
      h: rect.height + 2 * padding,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      radius: currentStep.radius ?? 14,
      maxR,
    });
  };

  useEffect(() => {
    if (storageKey && localStorage.getItem(storageKey)) return;
    setActive(true);
    onStart?.();
    const tAgua = setTimeout(() => setAnimarAgua(true), 100);
    const tTexto = setTimeout(() => setAnimarTexto(true), 900);
    return () => {
      clearTimeout(tAgua);
      clearTimeout(tTexto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useLayoutEffect(() => {
    if (!active) return;

    const el = document.querySelector(`[data-tutorial="${currentStep?.key}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });

    const t = setTimeout(computeSpotlight, 380);
    const onResize = () => computeSpotlight();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  const finishTutorial = async () => {
    setAnimarTexto(false);
    await wait(320);
    setAnimarAgua(false);
    await wait(1000);
    if (storageKey) localStorage.setItem(storageKey, "true");
    setActive(false);
    onFinish?.();
  };

  const avanzarPaso = async () => {
    if (isLastStep) {
      finishTutorial();
      return;
    }
    setAnimarTexto(false);
    await wait(320);
    if (prepareStep) {
      await prepareStep(stepIndex, stepIndex + 1);
    }
    setStepIndex((s) => s + 1);
    await wait(900);
    setAnimarTexto(true);
  };

  if (!active || !currentStep) return null;

  const cardW = 320;
  const cardH = 260;
  const margin = 16;
  const gap = 32;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // Espacio disponible a cada lado del spotlight (en píxeles del viewport)
  const spaces = {
    top: spotlight.y - margin,
    bottom: vh - (spotlight.y + spotlight.h) - margin,
    left: spotlight.x - margin,
    right: vw - (spotlight.x + spotlight.w) - margin,
  };
  const needs = {
    top: cardH + gap,
    bottom: cardH + gap,
    left: cardW + gap,
    right: cardW + gap,
  };

  const hugeElement = spotlight.w > vw * 0.85 && spotlight.h > vh * 0.7;
  const requested = currentStep.placement;
  const fitsRequested =
    requested && spaces[requested] >= needs[requested];

  let placement;
  if (hugeElement) {
    placement = "center";
  } else if (fitsRequested) {
    placement = requested;
  } else {
    // Elegir el lado con mayor espacio disponible que pueda contener el card
    const candidatos = ["bottom", "top", "right", "left"]
      .filter((p) => spaces[p] >= needs[p])
      .sort((a, b) => spaces[b] - spaces[a]);
    placement = candidatos[0] || "center";
  }

  // Posición del card (sin transforms — usamos coords absolutas para poder
  // calcular la posición de la flecha relativa al card)
  let cardLeft, cardTop;
  if (placement === "bottom") {
    cardLeft = clamp(spotlight.cx - cardW / 2, margin, vw - cardW - margin);
    cardTop = spotlight.y + spotlight.h + gap;
  } else if (placement === "top") {
    cardLeft = clamp(spotlight.cx - cardW / 2, margin, vw - cardW - margin);
    cardTop = spotlight.y - gap - cardH;
  } else if (placement === "right") {
    cardLeft = clamp(spotlight.x + spotlight.w + gap, margin, vw - cardW - margin);
    cardTop = clamp(spotlight.cy - cardH / 2, margin, vh - cardH - margin);
  } else if (placement === "left") {
    cardLeft = clamp(spotlight.x - gap - cardW, margin, vw - cardW - margin);
    cardTop = clamp(spotlight.cy - cardH / 2, margin, vh - cardH - margin);
  } else {
    cardLeft = vw / 2 - cardW / 2;
    cardTop = vh / 2 - cardH / 2;
  }

  // Guardia anti-solapamiento: si el card terminó solapando el spotlight,
  // empujarlo en la dirección del placement para que no se vean encima.
  if (placement !== "center") {
    const overlapH = cardLeft < spotlight.x + spotlight.w && cardLeft + cardW > spotlight.x;
    const overlapV = cardTop < spotlight.y + spotlight.h && cardTop + cardH > spotlight.y;
    if (overlapH && overlapV) {
      if (placement === "bottom") cardTop = spotlight.y + spotlight.h + gap;
      else if (placement === "top") cardTop = spotlight.y - gap - cardH;
      else if (placement === "right") cardLeft = spotlight.x + spotlight.w + gap;
      else if (placement === "left") cardLeft = spotlight.x - gap - cardW;
    }
  }

  const cardStyle = {
    top: cardTop,
    left: cardLeft,
    width: cardW,
  };

  // Flecha: la posicionamos dinámicamente para que apunte hacia el centro del
  // spotlight, aunque el card haya sido desplazado por el clampeo.
  const cornerInset = 22;
  const arrowVisual = {
    bottom:
      "w-0 h-0 border-l-[12px] border-r-[12px] border-b-[14px] border-transparent border-b-white dark:border-b-[#151822]",
    top:
      "w-0 h-0 border-l-[12px] border-r-[12px] border-t-[14px] border-transparent border-t-white dark:border-t-[#151822]",
    right:
      "w-0 h-0 border-t-[12px] border-b-[12px] border-r-[14px] border-transparent border-r-white dark:border-r-[#151822]",
    left:
      "w-0 h-0 border-t-[12px] border-b-[12px] border-l-[14px] border-transparent border-l-white dark:border-l-[#151822]",
  };

  let arrowStyle = null;
  let arrowVisualClass = "";
  if (placement === "bottom") {
    arrowVisualClass = arrowVisual.bottom;
    const arrowX = clamp(spotlight.cx - cardLeft, cornerInset, cardW - cornerInset);
    arrowStyle = { position: "absolute", top: -12, left: arrowX, transform: "translateX(-50%)" };
  } else if (placement === "top") {
    arrowVisualClass = arrowVisual.top;
    const arrowX = clamp(spotlight.cx - cardLeft, cornerInset, cardW - cornerInset);
    arrowStyle = { position: "absolute", bottom: -12, left: arrowX, transform: "translateX(-50%)" };
  } else if (placement === "right") {
    arrowVisualClass = arrowVisual.right;
    const arrowY = clamp(spotlight.cy - cardTop, cornerInset, cardH - cornerInset);
    arrowStyle = { position: "absolute", left: -12, top: arrowY, transform: "translateY(-50%)" };
  } else if (placement === "left") {
    arrowVisualClass = arrowVisual.left;
    const arrowY = clamp(spotlight.cy - cardTop, cornerInset, cardH - cornerInset);
    arrowStyle = { position: "absolute", right: -12, top: arrowY, transform: "translateY(-50%)" };
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] pointer-events-auto"
      style={{
        clipPath: animarAgua
          ? `circle(${spotlight.maxR}px at 0px 0px)`
          : `circle(0px at 0px 0px)`,
        WebkitClipPath: animarAgua
          ? `circle(${spotlight.maxR}px at 0px 0px)`
          : `circle(0px at 0px 0px)`,
        transition:
          "clip-path 1.2s cubic-bezier(0.25, 1, 0.5, 1), -webkit-clip-path 1.2s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      {placement === "center" ? (
        <>
          {/* Capa oscura cubriendo toda la pantalla */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(79, 70, 229, 0.78)",
              pointerEvents: "none",
            }}
          />
          {/* Borde azul indicando que toda la pantalla es el tutorial */}
          <div
            style={{
              position: "absolute",
              inset: 10,
              border: "3px solid rgba(165, 180, 252, 0.95)",
              borderRadius: 18,
              boxShadow:
                "inset 0 0 0 2px rgba(255, 255, 255, 0.18), 0 0 24px rgba(99, 102, 241, 0.45)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : (
        <div
          ref={spotlightRef}
          style={{
            position: "absolute",
            left: spotlight.x,
            top: spotlight.y,
            width: spotlight.w,
            height: spotlight.h,
            borderRadius: spotlight.radius,
            backgroundColor: "transparent",
            boxShadow: "0 0 0 9999px rgba(79, 70, 229, 0.78)",
            outlineStyle: "solid",
            outlineWidth: "2px",
            outlineColor: "rgba(255,255,255,0.9)",
            outlineOffset: "3px",
            transition:
              "left 0.5s cubic-bezier(0.4, 0, 0.2, 1), top 0.5s cubic-bezier(0.4, 0, 0.2, 1), width 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: "none",
          }}
        />
      )}

      <div
        ref={cardRef}
        className={`absolute bg-white dark:bg-[#151822] text-gray-800 dark:text-gray-100 p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1f2833] flex flex-col items-center text-center transition-opacity duration-300 ${
          animarTexto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={cardStyle}
      >
        {currentStep.title && (
          <h4 className="font-bold text-base sm:text-lg mb-2 text-indigo-600 dark:text-indigo-400">
            {currentStep.title}
          </h4>
        )}
        <p className="font-medium text-sm sm:text-base mb-5 leading-relaxed">
          {currentStep.text}
        </p>

        <div className="flex items-center gap-3">
          {!isLastStep && (
            <button
              onClick={finishTutorial}
              disabled={!animarTexto}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-60"
            >
              Saltar
            </button>
          )}
          <button
            onClick={avanzarPaso}
            disabled={!animarTexto}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-60 disabled:cursor-default"
          >
            {isLastStep ? "Entendido" : "Continuar"}
          </button>
        </div>

        <div className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          {stepIndex + 1} / {steps.length}
        </div>

        {arrowStyle && (
          <div className={arrowVisualClass} style={arrowStyle} />
        )}
      </div>
    </div>,
    document.body
  );
}
