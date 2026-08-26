import React, { useEffect, useId, useRef, useState } from "react";

const GenericModal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "medium"
}) => {
  const [rendered, setRendered] = useState(false);
  const [phase, setPhase] = useState("closed");
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let frame;
    let timer;
    if (isOpen) {
      setRendered(true);
      frame = requestAnimationFrame(() => setPhase("open"));
    } else if (rendered) {
      setPhase("closing");
      const closeMs =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--modal-close-dur")
        ) || 150;
      timer = setTimeout(() => {
        setRendered(false);
        setPhase("closed");
      }, closeMs);
    }
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, rendered]);

  useEffect(() => {
    if (!isOpen) return undefined;
    previousFocusRef.current = document.activeElement;
    const focusFrame = requestAnimationFrame(() => {
      modalRef.current?.querySelector("[data-autofocus]")?.focus();
    });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        modalRef.current?.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!rendered) return null;

  const sizeClasses = {
    small: "w-96 max-w-[90vw]",
    medium: "w-[500px] max-w-[90vw]",
    large: "w-[700px] max-w-[90vw]"
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={modalRef}
        className={`t-modal ${phase === "open" ? "is-open" : phase === "closing" ? "is-closing" : ""} bg-white p-6 rounded-lg shadow-xl ${sizeClasses[size]} max-h-[90vh] flex flex-col my-auto`}
      >
        <div className="flex justify-between items-center pb-3 border-b border-ink-100 mb-4 shrink-0">
          <h2 id={titleId} className="text-xl font-bold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            type="button"
            data-autofocus
            aria-label="Close dialog"
            className="min-h-touch min-w-touch inline-flex items-center justify-center text-ink-400 hover:text-ink-600 transition-colors rounded-md hover:bg-cream-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default GenericModal;
