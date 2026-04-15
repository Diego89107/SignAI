import React from "react";
import { NavLink } from "react-router-dom";
import { X, Hand, Settings, BookOpen, HelpCircle } from "lucide-react";
import useTheme from "../hooks/useTheme";

export default function Sidebar({ isOpen, setIsOpen }) {
  const isDark = useTheme();

  // 🔹 Clases base (mantienen tu estilo original)
  const base =
    "group flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 font-medium";
  const active =
    "bg-indigo-500 text-white shadow-md scale-[1.02]";
  const normalLight =
    "text-gray-700 hover:bg-indigo-50 hover:text-indigo-600";
  const normalDark =
    "text-gray-300 hover:bg-[#1b1e27] hover:text-indigo-400";

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full w-60
        ${isDark ? "bg-[#11131b] border-r border-[#2a2f3b]" : "bg-white border-r border-gray-200"}
        shadow-md flex flex-col justify-between z-40
        transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* 🔹 Encabezado */}
      <div>
        <div
          className={`flex justify-between items-center border-b px-4 py-4 ${
            isDark ? "border-[#2a2f3b]" : "border-gray-200"
          }`}
        >
          <h1
            className={`text-lg font-bold ${
              isDark ? "text-indigo-400" : "text-indigo-600"
            }`}
          >
            SignAI
          </h1>
          <button
            onClick={() => setIsOpen(false)}
            className={`text-2xl leading-none transition ${
              isDark
                ? "text-gray-400 hover:text-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <X size={22} strokeWidth={2.2} />
          </button>
        </div>

        {/* 🔹 Navegación */}
        <nav className="mt-4 flex flex-col space-y-2 px-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${base} ${isActive ? active : isDark ? normalDark : normalLight}`
            }
          >
            <Hand
              size={22}
              strokeWidth={2}
              className="transition-transform duration-300 group-hover:scale-110"
            />
            <span>Traductor</span>
          </NavLink>

          <NavLink
            to="/Ajustes"
            className={({ isActive }) =>
              `${base} ${isActive ? active : isDark ? normalDark : normalLight}`
            }
          >
            <Settings
              size={22}
              strokeWidth={2}
              className="transition-transform duration-300 group-hover:rotate-12"
            />
            <span>Ajustes</span>
          </NavLink>

          <NavLink
            to="/Aprendizaje"
            className={({ isActive }) =>
              `${base} ${isActive ? active : isDark ? normalDark : normalLight}`
            }
          >
            <BookOpen
              size={22}
              strokeWidth={2}
              className="transition-transform duration-300 group-hover:scale-110"
            />
            <span>Aprendizaje</span>
          </NavLink>

          <NavLink
            to="/Acerca"
            className={({ isActive }) =>
              `${base} ${isActive ? active : isDark ? normalDark : normalLight}`
            }
          >
            <HelpCircle
              size={22}
              strokeWidth={2}
              className="transition-transform duration-300 group-hover:scale-110"
            />
            <span>Acerca de nosotros</span>
          </NavLink>
        </nav>
      </div>

    </aside>
  );
}
