import { useSyncExternalStore } from "react";

const canMatch = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

/**
 * Whether a CSS media query currently matches, updating on change. Use it to
 * mount only the layout that is visible instead of rendering both and hiding
 * one with CSS. Falls back to `fallback` where matchMedia is unavailable.
 */
export function useMediaQuery(query, fallback = true) {
  return useSyncExternalStore(
    (onChange) => {
      if (!canMatch()) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => (canMatch() ? window.matchMedia(query).matches : fallback),
    () => fallback
  );
}
