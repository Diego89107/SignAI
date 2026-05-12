import { useEffect, useState } from "react";

// Devuelve true cuando el contenedor de scroll (por defecto el <main>) ha
// bajado más allá del umbral indicado. Útil para mostrar barras "sticky" que
// aparecen sólo cuando los botones originales ya no son visibles.
export default function useScrolled(threshold = 80, containerSelector = "main") {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.querySelector(containerSelector);
    if (!el) return;

    const onScroll = () => setScrolled(el.scrollTop > threshold);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [threshold, containerSelector]);

  return scrolled;
}
