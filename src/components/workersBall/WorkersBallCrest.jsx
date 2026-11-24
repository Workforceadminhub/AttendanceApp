/**
 * Ceremonial Harvesters Emblem for Workers Ball 2026 (uses official /logo.jpg).
 */
export default function WorkersBallCrest({ className = "h-20 w-20" }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      {/* Outer slow rotating orbital ring */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className="absolute inset-0 h-full w-full wb26-orbit-slow text-ink-300"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r="56"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <circle cx="60" cy="4" r="2.5" fill="#B5471F" />
        <circle cx="60" cy="116" r="2.5" fill="#0A0E1A" />
        <circle cx="4" cy="60" r="2" fill="#A87B0F" />
        <circle cx="116" cy="60" r="2" fill="#A87B0F" />
      </svg>

      {/* Inner badge with transparent official Harvesters logo */}
      <div className="relative h-[78%] w-[78%] rounded-full bg-transparent flex items-center justify-center p-2 overflow-hidden">
        <img
          src="/logo-transparent.png"
          alt="Harvesters"
          className="w-full h-auto object-contain select-none"
        />
      </div>
    </div>
  );
}
