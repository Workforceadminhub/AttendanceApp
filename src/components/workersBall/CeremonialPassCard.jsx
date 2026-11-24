import { useMemo, useRef, useState } from "react";
import { ArrowDownTrayIcon, ClipboardDocumentCheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { useScrambledText } from "./stageTransition";

/**
 * Interactive 3D-Tilt Gala Pass Card shown on registration confirmation.
 */
export default function CeremonialPassCard({
  profile,
  accessCode,
  qrCode,
  onDownload,
  onCopy,
  copied,
}) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const decodedCode = useScrambledText(accessCode, true, 900);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Number((-y * 6).toFixed(2)),
      ry: Number((x * 6).toFixed(2)),
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

  // Deterministic 7x7 visual verification matrix
  const matrixCells = useMemo(() => {
    const cells = [];
    const size = 7;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isCorner =
          (r < 2 && c < 2) ||
          (r < 2 && c >= size - 2) ||
          (r >= size - 2 && c < 2);
        const codeChar =
          accessCode.charCodeAt((r * size + c) % accessCode.length) || 72;
        const active = isCorner || (codeChar + r * 5 + c * 11) % 3 === 0;
        cells.push({ key: `${r}-${c}`, active, isCorner });
      }
    }
    return cells;
  }, [accessCode]);

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1100px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition:
            tilt.rx === 0 && tilt.ry === 0
              ? "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)"
              : "transform 80ms linear",
        }}
        className="relative rounded-xl bg-ink-900 text-cream border border-ink-800 shadow-pop overflow-hidden wb26-pass-shimmer"
      >
        {/* Top Sienna Ceremonial Bar */}
        <div className="h-2 w-full bg-sienna" />

        {/* Subtle background orbital watermark */}
        <svg
          viewBox="0 0 240 240"
          fill="none"
          className="pointer-events-none absolute -right-12 -bottom-16 h-64 w-64 text-ink-800 opacity-60 wb26-orbit-slow"
          aria-hidden="true"
        >
          <circle cx="120" cy="120" r="105" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" />
          <circle cx="120" cy="120" r="75" stroke="currentColor" strokeWidth="1" />
        </svg>

        <div className="relative z-10 p-6 sm:p-7">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-dashed border-ink-700">
            <div>
              <p className="text-2xs font-mono uppercase tracking-tag text-sienna-light font-semibold">
                Harvesters Gbagada &middot; Official Pass
              </p>
              <h3 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-cream">
                Workers Ball 2026
              </h3>
              <p className="text-xs text-ink-400 mt-0.5">
                Admit One &middot; Accredited Workforce Pass
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs font-mono text-ink-300">
                <span className="text-[#F6B042] font-semibold">All Stars: Jersey &amp; Jazz</span>
                <span>&middot;</span>
                <span>Sun 29 Nov &middot; 3:00 PM</span>
                <span>&middot;</span>
                <span className="text-cream font-medium">Dress Code: Jersey</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded bg-forest/20 border border-forest/40 px-2.5 py-1 text-2xs font-mono uppercase tracking-tag text-cream shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-forest animate-live-pulse" />
              Confirmed
            </span>
          </div>

          {/* Attendee Metadata Grid */}
          <div className="py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-dashed border-ink-700">
            <div className="sm:col-span-2">
              <p className="text-2xs font-mono uppercase tracking-tag text-ink-400">
                Registered Worker
              </p>
              <p className="mt-0.5 text-xl font-semibold text-cream truncate">
                {fullName}
              </p>
            </div>
            <div>
              <p className="text-2xs font-mono uppercase tracking-tag text-ink-400">
                Role
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink-100">
                {profile.role}
              </p>
            </div>
            <div>
              <p className="text-2xs font-mono uppercase tracking-tag text-ink-400">
                Team
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink-100">
                {profile.team}
              </p>
            </div>
            <div>
              <p className="text-2xs font-mono uppercase tracking-tag text-ink-400">
                Department
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink-100">
                {profile.department}
              </p>
            </div>
            <div>
              <p className="text-2xs font-mono uppercase tracking-tag text-ink-400">
                Phone Number
              </p>
              <p className="mt-0.5 text-sm font-mono qc-num text-ink-200">
                {profile.phone}
              </p>
            </div>
          </div>

          {/* Perforated Stub: Access Code & Matrix */}
          <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-2xs font-mono uppercase tracking-tag text-ink-400">
                Your Unique Access Code
              </p>
              <div className="flex items-center gap-2.5">
                <span className="font-mono qc-num text-2xl sm:text-3xl font-bold tracking-wider text-cream">
                  {decodedCode}
                </span>
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex items-center gap-1 rounded border border-ink-700 bg-ink-800 px-2.5 py-1 text-2xs font-mono uppercase tracking-tag text-ink-200 hover:bg-ink-700 hover:text-cream transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-forest" />
                      Copied
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-2xs text-ink-400">
                Present this code or QR at the accreditation desk.
              </p>
            </div>

            {/* Scannable Accreditation QR Code or Geometric Verification Matrix */}
            <div className="self-start sm:self-center bg-cream p-2.5 rounded-lg border border-ink-700 shrink-0 flex flex-col items-center justify-center">
              {qrCode ? (
                <img
                  src={qrCode}
                  alt={`Accreditation QR code for ${accessCode}`}
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded bg-white p-1"
                />
              ) : (
                <div
                  className="grid grid-cols-7 gap-0.5 w-16 h-16 sm:w-20 sm:h-20"
                  aria-label={`Verification matrix for ${accessCode}`}
                >
                  {matrixCells.map((cell) => (
                    <span
                      key={cell.key}
                      className={` rounded-[1px] ${
                        cell.active
                          ? cell.isCorner
                            ? "bg-sienna"
                            : "bg-ink-900"
                          : "bg-cream-200"
                      }`}
                    />
                  ))}
                </div>
              )}
              <span className="text-[10px] font-mono uppercase tracking-widest text-ink-600 mt-1 font-semibold">
                Accreditation QR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Download & Actions Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="qc-btn-primary flex-1 py-3 cursor-pointer"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download Official Pass (PNG)
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="qc-btn-secondary py-3 cursor-pointer"
        >
          {copied ? (
            <>
              <ClipboardDocumentCheckIcon className="h-4 w-4 text-forest" />
              Code Copied
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="h-4 w-4" />
              Copy Access Code
            </>
          )}
        </button>
      </div>
    </div>
  );
}
