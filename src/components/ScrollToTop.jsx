import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const mainEl = document.querySelector("main");
    if (!mainEl) return;

    const previousBehavior = mainEl.style.scrollBehavior;
    mainEl.style.scrollBehavior = "auto";
    mainEl.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    requestAnimationFrame(() => {
      mainEl.style.scrollBehavior = previousBehavior;
    });
  }, [pathname]);

  return null;
}
