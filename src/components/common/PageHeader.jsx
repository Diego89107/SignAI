import React from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";

export default function PageHeader({ showBack = true, onBack, title = "SignAI" }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <>
      {showBack && (
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 sm:left-6 flex items-center gap-2 text-gray-800 dark:text-gray-100 hover:text-indigo-400 transition-all duration-300 z-20"
        >
          <Undo2 size={24} strokeWidth={2.2} />
          <span className="hidden sm:inline font-medium">Volver</span>
        </button>
      )}
      <h1 className="absolute top-5 right-6 sm:right-10 text-xl font-semibold z-20">
        {title}
      </h1>
    </>
  );
}
