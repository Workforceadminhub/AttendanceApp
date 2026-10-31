import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyPageMeta, resolvePageMeta } from "../utils/pageMeta";

/**
 * Route-aware head manager that updates document.title, description,
 * theme-color, Open Graph, and Twitter Card metadata on every navigation.
 */
export default function PageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "";
    const meta = resolvePageMeta(pathname, hostname);
    applyPageMeta(meta, pathname);
  }, [pathname]);

  return null;
}
