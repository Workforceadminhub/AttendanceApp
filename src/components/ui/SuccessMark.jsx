import { useEffect, useRef, useState } from "react";

export default function SuccessMark({ className = "h-14 w-14 text-forest" }) {
  const pathRef = useRef(null);
  const [state, setState] = useState("out");

  useEffect(() => {
    const path = pathRef.current;
    if (path) {
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
    }

    const frame = requestAnimationFrame(() => setState("in"));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <span className={`t-success-check ${className}`} data-state={state} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path
          ref={pathRef}
          d="m8 12.25 2.5 2.5L16.5 9"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
