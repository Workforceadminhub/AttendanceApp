import { useEffect, useState } from "react";

/**
 * Progressive enhancement helper for directional View Transitions
 * (`directional-navigation-transitions` & `scoped-component-transitions` guides).
 */
export function runStageTransition(updateDOM, direction = "forward") {
  if (typeof document === "undefined" || !document.startViewTransition) {
    updateDOM();
    return;
  }
  try {
    const vt = document.startViewTransition({
      update: updateDOM,
      types: [direction],
    });
    vt?.ready?.catch?.(() => {});
  } catch {
    // Fallback for browsers supporting callback-only startViewTransition
    const vt = document.startViewTransition(() => {
      updateDOM();
    });
    vt?.ready?.catch?.(() => {});
  }
}

/**
 * Feature-detect discrete `display` transition support (`animate-element-entry-exit` guide),
 * guarding against Firefox bug 1882408 where CSS.supports returns true without transitioning display.
 */
let supportsDisplayTransition;
export function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (
    typeof window === "undefined" ||
    !window.CSS?.supports?.("transition-behavior", "allow-discrete") ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransition;
}

/**
 * Reusable WeakMap fallback for `:user-invalid` / `:user-valid` (`validate-input-after-interaction` guide).
 */
export const UserInvalidFallback = (() => {
  const dirtyState = new WeakMap();

  const updateState = (input) => {
    if (!input || typeof input.checkValidity !== "function") return;
    const isValid = input.checkValidity();
    input.classList.toggle("user-invalid-fallback", !isValid);
    input.classList.toggle("user-valid-fallback", isValid);
    if (!isValid) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  };

  const handleEvent = (event) => {
    const input = event.target;
    if (event.type === "reset") {
      const controls = input?.elements || [];
      for (const control of controls) {
        dirtyState.delete(control);
        control.classList.remove("user-invalid-fallback", "user-valid-fallback");
        control.removeAttribute("aria-invalid");
      }
      return;
    }
    if (!input || typeof input.checkValidity !== "function") return;

    if (event.type === "input" || event.type === "change") {
      const state = dirtyState.get(input) || {
        hasInteracted: false,
        hasBlurred: false,
      };
      state.hasInteracted = true;
      dirtyState.set(input, state);
      if (state.hasBlurred) updateState(input);
    } else if (event.type === "blur") {
      const state = dirtyState.get(input) || {
        hasInteracted: false,
        hasBlurred: false,
      };
      state.hasBlurred = true;
      dirtyState.set(input, state);
      if (state.hasInteracted) updateState(input);
    }
  };

  const init = (root) => {
    if (
      !root ||
      (typeof CSS !== "undefined" &&
        typeof CSS.supports === "function" &&
        CSS.supports("selector(:user-invalid)"))
    ) {
      return () => {};
    }
    root.addEventListener("blur", handleEvent, true);
    root.addEventListener("input", handleEvent);
    root.addEventListener("change", handleEvent);
    root.addEventListener("reset", handleEvent, true);
    return () => {
      root.removeEventListener("blur", handleEvent, true);
      root.removeEventListener("input", handleEvent);
      root.removeEventListener("change", handleEvent);
      root.removeEventListener("reset", handleEvent, true);
    };
  };

  return { init };
})();

/**
 * Scramble/decode text hook for ceremonial codes and counters.
 */
export function useScrambledText(targetText, active = true, durationMs = 650) {
  const [display, setDisplay] = useState(targetText);
  useEffect(() => {
    if (!active || !targetText) return undefined;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789-";
    const start = performance.now();
    let rafId;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const revealedCount = Math.floor(progress * targetText.length);
      let next = "";
      for (let i = 0; i < targetText.length; i++) {
        const ch = targetText[i];
        if (ch === "-" || ch === " " || i < revealedCount) {
          next += ch;
        } else {
          next += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setDisplay(next);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(targetText);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [targetText, active, durationMs]);

  return !active || !targetText ? targetText : display;
}
