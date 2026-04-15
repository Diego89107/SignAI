import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import ScrollToTop from "./components/ScrollToTop";
import "./index.css";

// 🌙 Aplica el tema guardado ANTES de que React renderice algo
const savedTheme = localStorage.getItem("lsm_theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

// Si el usuario nunca eligió tema, respeta el del sistema
const theme = savedTheme || (prefersDark ? "dark" : "light");

if (theme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <ScrollToTop />
      <App />
    </HashRouter>
  </React.StrictMode>
);
