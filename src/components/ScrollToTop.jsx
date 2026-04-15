import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}
