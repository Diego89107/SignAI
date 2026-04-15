import React, { useState, useEffect, createRef } from "react";
import { Menu } from "lucide-react";
import { Routes, Route, useLocation, Outlet } from "react-router-dom"; 
import { CSSTransition, TransitionGroup } from "react-transition-group";

// Componentes Globales
import Sidebar from "./components/Sidebar";
import ScrollToTop from "./components/ScrollToTop";

// Páginas
import Home from "./components/Home.jsx";
import Ajustes from "./components/pages/Ajustes";
import Aprendizaje from "./components/pages/Aprendizaje";
import Acerca from "./components/pages/Acerca.jsx";
import TranslatorView from "./components/TranslatorView";

// Páginas "Limpias" (Juegos y Aprendizaje interactivo)
import Desafio from "./components/pages/Juegos/Desafio.jsx";
import Deletreo from "./components/pages/Juegos/Deletreo";
import Camara from "./components/pages/Camara";
import Quiz from "./components/pages/Juegos/Quiz";
import Aprender from "./components/pages/Aprender";
import JuegosInteractivos from "./components/pages/Juegos.jsx";
import Memorama from "./components/pages/Juegos/Memorama.jsx";
import Abecedario from "./components/pages/Aprender/Abecedario.jsx";

import "./transitions.css";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [tutorialActivo, setTutorialActivo] = useState(() => !localStorage.getItem("tourSignAICompleted"));
  const location = useLocation();
  const nodeRef = createRef(null);

  useEffect(() => {
    window.closeSidebar = () => setSidebarOpen(false);
    return () => delete window.closeSidebar;
  }, []);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if (mutation.attributeName === "class" && !animating) {
          triggerAnimation();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [animating]);

  const triggerAnimation = () => {
    setAnimating(true);
    const wrapper = document.getElementById("app-wrapper");
    if (wrapper) {
      wrapper.classList.add("theme-zoom-out");
      setTimeout(() => {
        wrapper.classList.remove("theme-zoom-out");
        wrapper.classList.add("theme-zoom-in");
        setTimeout(() => {
          wrapper.classList.remove("theme-zoom-in");
          setAnimating(false);
        }, 400);
      }, 250);
    }
  };

  // --- 🏗️ DEFINICIÓN DE LAYOUTS ---

  // Layout A: Páginas Estándar
  const MainLayout = () => (
    // ⚠️ CAMBIO CLAVE: Se usó flex-1 flex flex-col para heredar la altura perfecta
    <div className="p-6 w-full max-w-7xl mx-auto flex-1 flex flex-col">
      {!sidebarOpen && !tutorialActivo && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 left-8 z-50 bg-white dark:bg-[#151822] text-gray-800 dark:text-gray-100
                     shadow-md rounded-md p-2 hover:bg-gray-200 dark:hover:bg-[#1e2230]
                     transition flex items-center justify-center"
        >
          <Menu size={22} strokeWidth={2.2} />
        </button>
      )}
      <Outlet />
    </div>
  );

  // Layout B: Páginas Limpias
  const CleanLayout = () => (
    // ⚠️ CAMBIO CLAVE: Se usó flex-1 flex flex-col
    <div className="flex-1 w-full flex flex-col">
      <Outlet />
    </div>
  );

  return (
    <div
      id="app-wrapper"
      className="h-screen w-full bg-gray-100 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 
                 transition-all duration-700 ease-in-out overflow-hidden flex"
    >
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div
        className={`flex-1 flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          sidebarOpen ? "ml-60" : "ml-0"
        }`}
      >
        {/* ⚠️ CAMBIO CLAVE: Al <main> también se le agregó flex flex-col */}
        <main className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden scroll-smooth">
          
          {/* ⚠️ CAMBIO CLAVE: La cadena de divs internos ahora usan flex-1 en lugar de min-h-full */}
          <div className="flex-1 flex flex-col w-full">
            <TransitionGroup component={null}>
              <CSSTransition
                key={location.key}
                nodeRef={nodeRef}
                classNames="fade"
                timeout={300}
                unmountOnExit
              >
                <div ref={nodeRef} className="flex-1 flex flex-col w-full">
                  <Routes location={location}>
                    
                    <Route element={<MainLayout />}>
                      <Route path="/" element={<Home sidebarOpen={sidebarOpen} onTutorialChange={setTutorialActivo} />} />
                      <Route path="/Ajustes" element={<Ajustes sidebarOpen={sidebarOpen} />} />
                      <Route path="/Aprendizaje" element={<Aprendizaje sidebarOpen={sidebarOpen} />} />
                      <Route path="/Acerca" element={<Acerca sidebarOpen={sidebarOpen} />} />
                      <Route path="/Traductor" element={<TranslatorView sidebarOpen={sidebarOpen} />} />
                    </Route>

                    <Route element={<CleanLayout />}>
                      <Route path="/Deletreo" element={<Deletreo sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />} />
                      <Route path="/Desafio" element={<Desafio sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />} />
                      <Route path="/Camara" element={<Camara sidebarOpen={sidebarOpen} />} />
                      <Route path="/Abecedario" element={<Abecedario sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />} />
                      <Route path="/Memorama" element={<Memorama sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />} />
                      <Route path="/Juegos" element={<JuegosInteractivos sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />} />
                      <Route path="/Aprender" element={<Aprender sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />} />
                      <Route path="/Quiz" element={<Quiz sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />} />
                    </Route>

                  </Routes>
                </div>
              </CSSTransition>
            </TransitionGroup>
          </div>
        </main>
      </div>
    </div>
  );
}