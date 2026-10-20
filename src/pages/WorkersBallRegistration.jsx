import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  EnvelopeIcon,
  EyeIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  TicketIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import SuccessMark from "../components/ui/SuccessMark";
import {
  MOCK_OTP_CODE,
  downloadWorkersBallPassPng,
  generateWorkersBallCode,
  getAllRoleOptions,
  getAllTeamOptions,
  getDepartmentsForTeam,
  maskEmail,
  maskPhone,
  searchWorkersBallMock,
} from "../utils/workersBallMock";
import {
  buildWorkersBallConfirmationEmail,
  buildWorkersBallOtpEmail,
} from "../emails/workersBallEmails";

/**
 * Progressive enhancement helper for directional View Transitions
 * (`directional-navigation-transitions` & `scoped-component-transitions` guides).
 */
function runStageTransition(updateDOM, direction = "forward") {
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
const UserInvalidFallback = (() => {
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
function useScrambledText(targetText, active = true, durationMs = 650) {
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

/**
 * Ceremonial SVG Crest Emblem for Workers Ball 2026.
 */
function WorkersBallCrest({ className = "h-20 w-20" }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
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
          r="54"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <circle cx="60" cy="6" r="2.5" fill="#B5471F" />
        <circle cx="60" cy="114" r="2.5" fill="#0A0E1A" />
        <circle cx="6" cy="60" r="2" fill="#A87B0F" />
        <circle cx="114" cy="60" r="2" fill="#A87B0F" />
      </svg>

      {/* Inner reverse orbital geometry */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className="absolute inset-0 h-full w-full wb26-orbit-reverse text-ink-200"
        aria-hidden="true"
      >
        <rect
          x="23"
          y="23"
          width="74"
          height="74"
          rx="4"
          stroke="currentColor"
          strokeWidth="1"
          transform="rotate(45 60 60)"
        />
      </svg>

      {/* Central drawn crest */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className="relative h-full w-full text-ink-900"
        aria-hidden="true"
      >
        <path
          d="M60 16 L71 45 L102 48 L77 68 L85 98 L60 81 L35 98 L43 68 L18 48 L49 45 Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          className="wb26-draw-path"
        />
        <circle
          cx="60"
          cy="60"
          r="16"
          fill="#0A0E1A"
          stroke="#B5471F"
          strokeWidth="1.5"
        />
        <text
          x="60"
          y="64"
          textAnchor="middle"
          fill="#FAFAF7"
          fontSize="10"
          fontWeight="700"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          ’26
        </text>
      </svg>
    </div>
  );
}

/**
 * Pre-Form Ceremonial Opening Sequence ("Before the form even loads").
 */
function IntroCurtain({ onEnter }) {
  const [progress, setProgress] = useState(0);
  const [yearCounter, setYearCounter] = useState(1998);
  const serialText = useScrambledText("HICC-GBG // WB-2026 // GALA PASS", true, 900);

  useEffect(() => {
    const duration = 2200;
    const start = performance.now();
    let rafId;
    let timerId;

    const step = (now) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      setYearCounter(Math.min(2026, 2000 + Math.floor((pct / 100) * 26)));

      if (elapsed < duration) {
        rafId = requestAnimationFrame(step);
      } else {
        // Brief pause at 100% before parting the curtain
        timerId = setTimeout(() => {
          onEnter();
        }, 260);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      if (timerId) clearTimeout(timerId);
    };
  }, [onEnter]);

  return (
    <div className="min-h-screen bg-cream text-ink-900 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Architectural Hairline Grid Lines */}
      <div
        className="pointer-events-none absolute inset-x-0 top-16 h-px bg-ink-200 wb26-line-x"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-16 h-px bg-ink-200 wb26-line-x"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-6 sm:left-12 w-px bg-ink-200 wb26-line-y"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-6 sm:right-12 w-px bg-ink-200 wb26-line-y"
        aria-hidden="true"
      />

      {/* Top Telemetry Bar */}
      <div className="relative z-10 max-w-5xl w-full mx-auto px-8 sm:px-16 h-16 flex items-center justify-between text-2xs font-mono uppercase tracking-tag text-ink-500">
        <span className="inline-flex items-center gap-2">
          <span className="qc-live-dot" />
          <span>{serialText}</span>
        </span>
        <button
          type="button"
          onClick={onEnter}
          className="text-ink-600 hover:text-ink-900 underline underline-offset-4 cursor-pointer"
        >
          Skip Intro &rarr;
        </button>
      </div>

      {/* Central Ceremonial Greeting */}
      <div className="relative z-10 max-w-2xl mx-auto px-8 py-12 text-center space-y-6">
        <div className="wb26-stagger-item" style={{ "--stagger-index": 0 }}>
          <WorkersBallCrest className="h-28 w-28 mx-auto" />
        </div>

        <div className="space-y-3 wb26-stagger-item" style={{ "--stagger-index": 2 }}>
          <p className="text-2xs sm:text-xs font-mono uppercase tracking-tag text-sienna font-semibold">
            Harvesters International Christian Centre &middot; Gbagada
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-ink-900">
            Workers Ball{" "}
            <span className="qc-num font-mono font-normal text-ink-700">
              {yearCounter}
            </span>
          </h1>
          <p className="text-sm sm:text-base text-ink-600 max-w-md mx-auto leading-relaxed">
            A Night of Honour, Excellence &amp; Thanksgiving. Verify your workforce
            profile and claim your official gala pass.
          </p>
        </div>

        {/* Animated Loader Rail */}
        <div
          className="max-w-xs mx-auto pt-4 space-y-2.5 wb26-stagger-item"
          style={{ "--stagger-index": 4 }}
        >
          <div className="flex items-center justify-between text-2xs font-mono uppercase tracking-tag text-ink-500">
            <span>Initializing Accreditation Desk</span>
            <span className="qc-num text-ink-900 font-semibold">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-ink-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-ink-900 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="pt-2 wb26-stagger-item" style={{ "--stagger-index": 6 }}>
          <button
            type="button"
            onClick={onEnter}
            className="qc-btn-primary px-6 py-2.5 text-xs font-mono uppercase tracking-tag cursor-pointer"
          >
            Enter Registration Desk &rarr;
          </button>
        </div>
      </div>

      {/* Bottom Corner Telemetry */}
      <div className="relative z-10 max-w-5xl w-full mx-auto px-8 sm:px-16 h-16 flex items-center justify-between text-2xs font-mono uppercase tracking-tag text-ink-400">
        <span>GBAGADA CAMPUS WORKFORCE</span>
        <span>EDITION XXVI &middot; ADMIT ONE</span>
      </div>
    </div>
  );
}

/**
 * Step Progress Rail with tabular numbers and active states.
 */
const JOURNEY_STEPS = [
  { id: "lookup", num: "01", label: "Find Profile" },
  { id: "verify", num: "02", label: "Email & OTP" },
  { id: "profile", num: "03", label: "Update Details" },
  { id: "pass", num: "04", label: "Gala Pass" },
];

function StepProgressRail({ currentStage }) {
  const stageToIndex = {
    search: 0,
    results: 0,
    collectEmail: 1,
    sendingOtp: 1,
    verifyOtp: 1,
    editProfile: 2,
    mintingPass: 3,
    confirmed: 3,
  };
  const activeIdx = stageToIndex[currentStage] ?? 0;

  return (
    <nav aria-label="Registration progress" className="mb-8">
      <ol className="grid grid-cols-4 gap-2">
        {JOURNEY_STEPS.map((s, idx) => {
          const isDone = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          return (
            <li
              key={s.id}
              aria-current={isCurrent ? "step" : undefined}
              className={`rounded-md border px-2.5 py-2 transition-all ${
                isCurrent
                  ? "border-ink-900 bg-ink-900 text-cream shadow-sheet"
                  : isDone
                    ? "border-forest/40 bg-forest-50 text-forest"
                    : "border-ink-200 bg-white text-ink-400"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-2xs font-mono font-semibold qc-num ${
                    isCurrent
                      ? "text-sienna-light"
                      : isDone
                        ? "text-forest"
                        : "text-ink-400"
                  }`}
                >
                  {isDone ? "✓" : s.num}
                </span>
                {isCurrent && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-sienna animate-live-pulse" />
                )}
              </div>
              <p
                className={`mt-0.5 text-xs font-medium truncate ${
                  isCurrent
                    ? "text-cream"
                    : isDone
                      ? "text-forest"
                      : "text-ink-500"
                }`}
              >
                {s.label}
              </p>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Required / Missing pill badge for empty worker fields.
 */
function MissingRequiredBadge({ filled }) {
  if (filled) {
    return (
      <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-forest-50 px-1.5 py-0.5 text-2xs font-mono font-medium text-forest">
        ✓ Ready
      </span>
    );
  }
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-mustard-50 px-1.5 py-0.5 text-2xs font-mono font-semibold text-mustard">
      Update Required
    </span>
  );
}

/**
 * Email Templates Studio Modal: Lets the user preview both the OTP Email HTML
 * and the Registration Confirmation Email HTML (and copy or download them).
 */
function EmailTemplatesModal({
  isOpen,
  onClose,
  initialTab = "otp",
  workerProfile,
  accessCode,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewMode, setViewMode] = useState("preview"); // "preview" | "source"
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const firstName = workerProfile?.firstName || "Adebayo";
  const fullName =
    `${workerProfile?.firstName || "Adebayo"} ${workerProfile?.lastName || "Okafor"}`.trim();

  const otpHtml = buildWorkersBallOtpEmail({
    firstName,
    otpCode: MOCK_OTP_CODE,
    expiryMinutes: 10,
    year: "2026",
  });

  const confirmHtml = buildWorkersBallConfirmationEmail({
    firstName,
    fullName,
    accessCode: accessCode || "HGWB-AO2419",
    role: workerProfile?.role || "Cell Leader",
    department: workerProfile?.department || "Leadership Training",
    team: workerProfile?.team || "Ministry",
    phone: workerProfile?.phone || "08034521908",
    email: workerProfile?.email || "adebayo.okafor@harvestersng.org",
    passUrl:
      typeof window !== "undefined"
        ? `${window.location.origin}/wb26`
        : "https://workers.hiccgbagada.com/wb26",
    year: "2026",
  });

  const currentHtml = activeTab === "otp" ? otpHtml : confirmHtml;
  const filename =
    activeTab === "otp"
      ? "workers-ball-2026-otp-email.html"
      : "workers-ball-2026-confirmation-email.html";

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(currentHtml);
      setCopied(true);
      toast.success("Email HTML copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy HTML.");
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([currentHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wb26-email-modal-title"
    >
      <div className="wb26-panel bg-cream border border-ink-200 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-pop overflow-hidden">
        {/* Modal Header */}
        <div className="bg-white border-b border-ink-200 px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-2xs font-mono uppercase tracking-tag text-sienna font-semibold">
              Workers Ball 2026 &middot; Transactional Email Templates
            </p>
            <h2
              id="wb26-email-modal-title"
              className="text-lg font-semibold text-ink-900"
            >
              Email HTML Preview &amp; Source
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close email preview"
            className="p-2 rounded-md text-ink-500 hover:text-ink-900 hover:bg-cream-200 transition cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-cream-200 border-b border-ink-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border border-ink-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("otp")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition cursor-pointer ${
                activeTab === "otp"
                  ? "bg-ink-900 text-cream"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              1. OTP Verification Email
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("confirm")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition cursor-pointer ${
                activeTab === "confirm"
                  ? "bg-ink-900 text-cream"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              2. Confirmation &amp; Pass Email
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-ink-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                  viewMode === "preview"
                    ? "bg-ink-100 text-ink-900"
                    : "text-ink-500 hover:text-ink-900"
                }`}
              >
                <EyeIcon className="h-3.5 w-3.5" />
                Rendered
              </button>
              <button
                type="button"
                onClick={() => setViewMode("source")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                  viewMode === "source"
                    ? "bg-ink-100 text-ink-900"
                    : "text-ink-500 hover:text-ink-900"
                }`}
              >
                <CodeBracketIcon className="h-3.5 w-3.5" />
                HTML Code
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyHtml}
              className="qc-btn-secondary py-1.5 px-3 min-h-0 text-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <ClipboardDocumentCheckIcon className="h-4 w-4 text-forest" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="h-4 w-4" />
                  Copy HTML
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="qc-btn-primary py-1.5 px-3 min-h-0 text-xs cursor-pointer"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download .html
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-cream">
          {viewMode === "preview" ? (
            <div
              className="rounded-lg border border-ink-200 bg-cream overflow-hidden shadow-sheet"
              dangerouslySetInnerHTML={{ __html: currentHtml }}
            />
          ) : (
            <pre className="rounded-lg border border-ink-200 bg-ink-900 text-cream p-4 text-xs font-mono overflow-x-auto leading-relaxed">
              <code>{currentHtml}</code>
            </pre>
          )}
        </div>

        {/* Footer file path hint */}
        <div className="bg-white border-t border-ink-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500 font-mono">
          <span>
            Template file:{" "}
            <strong className="text-ink-800">
              {activeTab === "otp"
                ? "src/emails/workers-ball-otp-email.html"
                : "src/emails/workers-ball-confirmation-email.html"}
            </strong>
          </span>
          <span>600px table layout &middot; 100% inline CSS</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive 3D-Tilt Gala Pass Card shown on registration confirmation.
 */
function CeremonialPassCard({ profile, accessCode, onDownload, onCopy, copied }) {
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
                Present this code at the Workers Ball accreditation desk.
              </p>
            </div>

            {/* Geometric Verification Matrix */}
            <div className="self-start sm:self-center bg-cream p-2.5 rounded-lg border border-ink-700 shrink-0">
              <div
                className="grid grid-cols-7 gap-0.5 w-16 h-16"
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

/**
 * Main Page Component: Workers Ball 2026 Registration (`/wb26`)
 */
export default function WorkersBallRegistration() {
  const uid = useId();
  const [showIntro, setShowIntro] = useState(true);

  // Journey state machine:
  // "search" | "results" | "collectEmail" | "sendingOtp" | "verifyOtp" | "editProfile" | "mintingPass" | "confirmed"
  const [stage, setStage] = useState("search");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [lastSearchedQuery, setLastSearchedQuery] = useState("");

  // Selected worker & email/OTP state
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [enteredEmail, setEnteredEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpShake, setOtpShake] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Profile Update Form state
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    role: "",
    team: "",
    department: "",
  });
  // Track which fields were originally empty when the worker was selected
  const [originallyMissing, setOriginallyMissing] = useState(new Set());
  const [profileErrors, setProfileErrors] = useState({});

  // Confirmed Pass state
  const [accessCode, setAccessCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  // Email HTML Studio Modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalTab, setEmailModalTab] = useState("otp");

  const otpFormRef = useRef(null);
  const otpInputRef = useRef(null);
  const emailFormRef = useRef(null);
  const profileFormRef = useRef(null);

  // Initialize post-interaction validation fallback on forms
  useEffect(() => {
    const cleanEmail = UserInvalidFallback.init(emailFormRef.current);
    const cleanProfile = UserInvalidFallback.init(profileFormRef.current);
    return () => {
      cleanEmail();
      cleanProfile();
    };
  }, [stage]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // WebOTP API progressive enhancement (`sms-otp-form` guide)
  useEffect(() => {
    if (stage !== "verifyOtp") return;
    if (typeof window === "undefined" || !("OTPCredential" in window)) return;

    const ac = new AbortController();
    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      })
      .then((otp) => {
        if (!otp?.code) return;
        setOtpValue(String(otp.code).replace(/\D/g, "").slice(0, 6));
        if (otpFormRef.current) {
          otpFormRef.current.requestSubmit();
        }
      })
      .catch((err) => {
        if (err && err.name === "AbortError") return;
      });

    return () => {
      ac.abort();
    };
  }, [stage, resendCooldown]);

  // Team & Department options from Harvesters Gbagada workforce directory
  const roleOptions = useMemo(() => getAllRoleOptions(), []);
  const teamOptions = useMemo(() => getAllTeamOptions(), []);
  const departmentOptions = useMemo(
    () => getDepartmentsForTeam(profileForm.team),
    [profileForm.team]
  );

  // Transition helper
  const transitionTo = (nextStage, direction = "forward") => {
    runStageTransition(() => {
      setStage(nextStage);
    }, direction);
  };

  // Step 1: Execute search by Name or Phone Number (returns 10 results)
  const executeSearch = async (queryOverride) => {
    const raw =
      typeof queryOverride === "string" ? queryOverride : searchQuery;
    const trimmed = raw.trim();
    if (!trimmed) {
      toast.error("Please enter your name or phone number to search.");
      return;
    }
    setSearchQuery(trimmed);
    setIsSearching(true);
    try {
      const results = await searchWorkersBallMock(trimmed);
      setSearchResults(results);
      setLastSearchedQuery(trimmed);
      transitionTo("results", "forward");
    } finally {
      setIsSearching(false);
    }
  };

  // Step 2: Select a worker from the 10 results
  const handleSelectWorker = (worker) => {
    setSelectedWorker(worker);
    const missingSet = new Set();
    if (!worker.firstName?.trim()) missingSet.add("firstName");
    if (!worker.lastName?.trim()) missingSet.add("lastName");
    if (!worker.phone?.trim()) missingSet.add("phone");
    if (!worker.role?.trim()) missingSet.add("role");
    if (!worker.team?.trim()) missingSet.add("team");
    if (!worker.department?.trim()) missingSet.add("department");
    setOriginallyMissing(missingSet);

    setOtpValue("");
    setOtpError("");

    const hasEmail = Boolean(worker.email && worker.email.includes("@"));
    if (hasEmail) {
      setEnteredEmail(worker.email);
      triggerOtpDispatch(worker, worker.email);
    } else {
      setEnteredEmail("");
      setEmailError("");
      transitionTo("collectEmail", "forward");
    }
  };

  // Dispatch OTP animation -> Verify OTP step
  const triggerOtpDispatch = () => {
    transitionTo("sendingOtp", "forward");
    setTimeout(() => {
      setResendCooldown(45);
      transitionTo("verifyOtp", "forward");
      setTimeout(() => {
        otpInputRef.current?.focus?.();
      }, 80);
    }, 850);
  };

  // Step 2A: Submit missing email to receive OTP
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    const cleaned = enteredEmail.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
    if (!valid) {
      setEmailError("Please enter a valid email address (e.g. you@example.com).");
      return;
    }
    setEmailError("");
    triggerOtpDispatch(selectedWorker, cleaned);
  };

  // Step 2B: Verify 6-digit OTP
  const verifyOtpCode = (codeToVerify) => {
    const cleaned = String(codeToVerify ?? otpValue)
      .replace(/\D/g, "")
      .slice(0, 6);
    if (cleaned.length !== 6) {
      setOtpError("Please enter all 6 digits of your verification code.");
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 360);
      return;
    }
    // Allow testing error shake with 000000
    if (cleaned === "000000") {
      setOtpError("Invalid verification code. Try 202688.");
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 360);
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    setTimeout(() => {
      setIsVerifyingOtp(false);
      // Populate profile form for review/update
      setProfileForm({
        firstName: selectedWorker?.firstName || "",
        lastName: selectedWorker?.lastName || "",
        phone: selectedWorker?.phone || "",
        email: enteredEmail.trim(),
        role: selectedWorker?.role || "",
        team: selectedWorker?.team || "",
        department: selectedWorker?.department || "",
      });
      setProfileErrors({});
      transitionTo("editProfile", "forward");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 550);
  };

  const handleOtpFormSubmit = (e) => {
    e.preventDefault();
    verifyOtpCode(otpValue);
  };

  const handleResendOtp = () => {
    if (resendCooldown > 0) return;
    setOtpValue("");
    setOtpError("");
    setResendCooldown(45);
    toast.info(`New verification code sent to ${enteredEmail}`);
  };

  // Step 3: Profile Form Field Updates & Completeness Calculation
  const updateProfileField = (field, value) => {
    setProfileForm((prev) => {
      const next = { ...prev, [field]: value };
      // Clear department if team changed and current department isn't in the new team
      if (field === "team" && prev.team !== value) {
        const nextDepts = getDepartmentsForTeam(value);
        if (!nextDepts.includes(prev.department)) {
          next.department = "";
        }
      }
      return next;
    });
    setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const requiredFieldsList = [
    "firstName",
    "lastName",
    "phone",
    "role",
    "team",
    "department",
  ];
  const completedCount = requiredFieldsList.filter((f) =>
    Boolean(String(profileForm[f] || "").trim())
  ).length;
  const completenessPct = Math.round(
    (completedCount / requiredFieldsList.length) * 100
  );

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const errs = {};
    if (!profileForm.firstName.trim()) {
      errs.firstName = "First name is required";
    }
    if (!profileForm.lastName.trim()) {
      errs.lastName = "Last name is required";
    }
    const cleanPhone = profileForm.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 11) {
      errs.phone = "Enter a valid 11-digit Nigerian phone number";
    }
    if (!profileForm.role.trim()) {
      errs.role = "Role must be selected";
    }
    if (!profileForm.team.trim()) {
      errs.team = "Team must be selected";
    }
    if (!profileForm.department.trim()) {
      errs.department = "Department must be selected";
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      toast.error("Please complete all required profile fields.");
      return;
    }

    const code = generateWorkersBallCode(profileForm);
    setAccessCode(code);
    transitionTo("mintingPass", "forward");
    setTimeout(() => {
      transitionTo("confirmed", "forward");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1050);
  };

  const handleCopyAccessCode = async () => {
    if (!accessCode) return;
    try {
      await navigator.clipboard.writeText(accessCode);
      setCodeCopied(true);
      toast.success("Workers Ball access code copied!");
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error("Could not copy code.");
    }
  };

  const handleDownloadPass = () => {
    downloadWorkersBallPassPng({
      ...profileForm,
      accessCode,
    });
    toast.success("Downloading your Workers Ball 2026 Pass...");
  };

  const handleStartOver = () => {
    setSelectedWorker(null);
    setOtpValue("");
    setOtpError("");
    setAccessCode("");
    transitionTo("search", "backward");
  };

  // Render Opening Greeting Sequence before the form loads
  if (showIntro) {
    return (
      <IntroCurtain
        onEnter={() => {
          runStageTransition(() => {
            setShowIntro(false);
          }, "forward");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col relative overflow-x-hidden">
      {/* Subtle Ambient Architectural Watermark */}
      <div
        className="pointer-events-none fixed -top-32 -right-32 opacity-35"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 360 360"
          fill="none"
          className="w-96 h-96 text-ink-200 wb26-orbit-slow"
        >
          <circle
            cx="180"
            cy="180"
            r="160"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="6 8"
          />
          <circle cx="180" cy="180" r="120" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      {/* Solid Cream Header (follows Lesson #2 & #3: solid bg-cream + mix-blend-multiply logo) */}
      <header className="border-b border-ink-200 bg-cream relative z-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.jpg"
              alt="Harvesters"
              className="h-12 w-auto select-none mix-blend-multiply shrink-0"
            />
            <span className="hidden sm:inline-block h-4 w-px bg-ink-200" />
            <div className="min-w-0">
              <span className="block text-xs font-mono uppercase tracking-tag text-ink-900 font-semibold truncate">
                Workers Ball ’26
              </span>
              <span className="hidden sm:block text-2xs font-mono text-ink-500">
                Harvesters Gbagada Campus
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEmailModalTab(stage === "confirmed" ? "confirm" : "otp");
                setEmailModalOpen(true);
              }}
              className="qc-btn-secondary min-h-0 py-1.5 px-3 text-xs font-mono cursor-pointer"
            >
              <EnvelopeIcon className="h-3.5 w-3.5 text-sienna" />
              <span className="hidden xs:inline">Email HTML</span>
              <span className="xs:hidden">Emails</span>
            </button>
            <button
              type="button"
              onClick={() => {
                runStageTransition(() => {
                  setShowIntro(true);
                }, "backward");
              }}
              className="qc-btn-ghost min-h-0 py-1.5 px-2.5 text-xs font-mono text-ink-600 cursor-pointer"
              title="Replay opening greeting animation"
            >
              <SparklesIcon className="h-3.5 w-3.5 text-sienna" />
              <span className="hidden sm:inline">Replay Intro</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Column */}
      <main className="flex-1 px-5 py-8 sm:px-8 sm:py-12 relative z-10">
        <div className="max-w-xl mx-auto">
          {/* Hero Eyebrow & Title */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-2xs font-mono uppercase tracking-tag text-sienna font-semibold mb-1.5">
                <span className="qc-live-dot" />
                <span>Workers Ball 2026 &middot; Harvesters Gbagada</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-ink-900 tracking-tight leading-snug">
                {stage === "confirmed"
                  ? "Your Gala Pass is Ready"
                  : stage === "editProfile"
                    ? "Verify & Update Your Profile"
                    : stage === "verifyOtp" || stage === "sendingOtp"
                      ? "Confirm Your Identity"
                      : stage === "collectEmail"
                        ? "Add Your Email Address"
                        : "Workforce Accreditation"}
              </h1>
            </div>
            <div className="hidden sm:flex flex-col items-end text-right shrink-0">
              <span className="text-2xs font-mono uppercase tracking-tag text-ink-400">
                EDITION
              </span>
              <span className="font-mono qc-num text-lg font-semibold text-ink-900">
                2026
              </span>
            </div>
          </div>

          {/* Step Progress Rail */}
          <StepProgressRail currentStage={stage} />

          {/* View-Transition Stage Wrapper */}
          <div className="wb26-transition-stage">
            {/* ============================================================
                STAGE 1A: SEARCH BY NAME OR PHONE NUMBER
               ============================================================ */}
            {stage === "search" && (
              <section className="wb26-panel qc-card p-6 sm:p-8 space-y-6">
                <div className="space-y-1.5">
                  <span className="qc-eyebrow">Step 01 &middot; Workforce Lookup</span>
                  <h2 className="text-xl font-semibold text-ink-900">
                    Find your name in the Gbagada registry
                  </h2>
                  <p className="text-sm text-ink-500 leading-relaxed">
                    Search using your <strong>first name</strong>,{" "}
                    <strong>surname</strong>, or{" "}
                    <strong>11-digit phone number</strong>. We’ll display the top
                    10 matching records.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    executeSearch();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor={`${uid}-search`}
                      className="block text-sm font-medium text-ink-900 mb-1"
                    >
                      Name or Phone Number <span className="text-sienna">*</span>
                    </label>
                    <p
                      id={`${uid}-search-hint`}
                      className="text-xs text-ink-500 mb-2"
                    >
                      Example: &ldquo;Adebayo Okafor&rdquo;, &ldquo;Mayowa&rdquo;, or
                      &ldquo;08034521908&rdquo;
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        id={`${uid}-search`}
                        name="query"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter name or phone number..."
                        aria-describedby={`${uid}-search-hint`}
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        enterKeyHint="search"
                        disabled={isSearching}
                        autoFocus
                        className="qc-input flex-1"
                      />
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="qc-btn-primary px-6 cursor-pointer shrink-0"
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        {isSearching ? "Scanning..." : "Search Registry"}
                      </button>
                    </div>
                  </div>

                  {/* Animated Radar Scan Indicator while searching */}
                  {isSearching && (
                    <div className="rounded-md border border-ink-200 bg-cream p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-2xs font-mono uppercase tracking-tag text-ink-600">
                        <span>Querying Harvesters Gbagada Workforce...</span>
                        <span className="text-sienna font-semibold">10 matches</span>
                      </div>
                      <div className="h-1 w-full bg-ink-200 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-sienna wb26-radar-bar rounded-full" />
                      </div>
                    </div>
                  )}
                </form>

                {/* Quick Demo Search Chips for instant exploration */}
                <div className="pt-4 border-t border-ink-200 space-y-2.5">
                  <p className="text-2xs font-mono uppercase tracking-tag text-ink-500">
                    Interactive Mock Scenarios &middot; Tap to test any branch:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        label: "Adebayo (Has Email + Complete)",
                        query: "Adebayo",
                      },
                      {
                        label: "Mayowa (No Email + Missing Dept)",
                        query: "Mayowa",
                      },
                      {
                        label: "Temitope (Has Email + Missing Role)",
                        query: "Temitope",
                      },
                      {
                        label: "Search by Phone (0803)",
                        query: "0803",
                      },
                    ].map((chip) => (
                      <button
                        key={chip.query}
                        type="button"
                        onClick={() => executeSearch(chip.query)}
                        disabled={isSearching}
                        className="rounded-md border border-ink-200 bg-cream px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:border-ink-900 hover:bg-white hover:text-ink-900 transition cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ============================================================
                STAGE 1B: 10 SEARCH RESULTS SHOWN (STAGGERED CASCADE)
               ============================================================ */}
            {stage === "results" && (
              <section className="wb26-panel space-y-4">
                <div className="qc-card p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => transitionTo("search", "backward")}
                      className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition cursor-pointer"
                    >
                      &larr; New Search
                    </button>
                    <span className="inline-flex items-center gap-1.5 rounded bg-ink-100 px-2.5 py-1 text-2xs font-mono uppercase tracking-tag text-ink-700 qc-num">
                      Showing {searchResults.length} of 10 Results
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-ink-900">
                        Select your name for &ldquo;{lastSearchedQuery}&rdquo;
                      </h2>
                      <p className="text-xs text-ink-500 mt-0.5">
                        Tap your profile below. We’ll verify your email with a
                        6-digit OTP before showing your full record.
                      </p>
                    </div>
                  </div>

                  {/* Inline quick refine search */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      executeSearch();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      aria-label="Refine search by name or phone number"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search another name or phone..."
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="qc-input min-h-0 py-2 text-sm flex-1"
                    />
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="qc-btn-secondary min-h-0 py-2 px-4 text-xs font-mono uppercase tracking-tag cursor-pointer"
                    >
                      {isSearching ? "..." : "Filter"}
                    </button>
                  </form>
                </div>

                {/* 10 Staggered Worker Cards */}
                <ul
                  className="divide-y divide-ink-200 rounded-md border border-ink-200 bg-white overflow-hidden shadow-sheet"
                  aria-label="Matching workers"
                >
                  {searchResults.map((w, index) => {
                    const hasEmail = Boolean(w.email && w.email.includes("@"));
                    const hasIncompleteFields =
                      !w.role || !w.team || !w.department;
                    const deptTeamLine = [w.role, w.department, w.team]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <li
                        key={w.id}
                        className="wb26-stagger-item"
                        style={{ "--stagger-index": index }}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectWorker(w)}
                          className="group w-full text-left px-4 sm:px-5 py-3.5 hover:bg-cream transition flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="font-mono qc-num text-xs font-semibold text-ink-400 group-hover:text-sienna w-6 shrink-0">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-ink-900 truncate">
                                  {w.firstName} {w.lastName}
                                </p>
                                <span className="text-xs font-mono qc-num text-ink-500">
                                  {maskPhone(w.phone)}
                                </span>
                              </div>
                              <p className="text-xs text-ink-500 truncate mt-0.5">
                                {deptTeamLine || "Workforce Member"}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                            {hasIncompleteFields && (
                              <span className="inline-flex items-center rounded bg-mustard-50 px-2 py-0.5 text-2xs font-mono font-medium text-mustard">
                                Update Needed
                              </span>
                            )}
                            {hasEmail ? (
                              <span className="inline-flex items-center gap-1 rounded bg-forest-50 px-2 py-0.5 text-2xs font-mono font-medium text-forest">
                                <EnvelopeIcon className="h-3 w-3" />
                                {maskEmail(w.email)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-sienna-50 px-2 py-0.5 text-2xs font-mono font-medium text-sienna">
                                + Add Email
                              </span>
                            )}
                            <span
                              className="hidden sm:inline-block text-ink-400 group-hover:text-ink-900 group-hover:translate-x-0.5 transition-transform ml-1"
                              aria-hidden="true"
                            >
                              &rarr;
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* ============================================================
                STAGE 2A: IF EMAIL DOES NOT EXIST, COLLECT EMAIL FIRST
               ============================================================ */}
            {stage === "collectEmail" && selectedWorker && (
              <section className="wb26-panel qc-card p-6 sm:p-8 space-y-6">
                <button
                  type="button"
                  onClick={() => transitionTo("results", "backward")}
                  className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition cursor-pointer"
                >
                  &larr; Back to 10 results
                </button>

                {/* Selected Worker Banner */}
                <div className="rounded-md border border-ink-200 bg-cream px-4 py-3 flex items-center gap-3">
                  <UserCircleIcon className="h-6 w-6 text-ink-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">
                      {selectedWorker.firstName} {selectedWorker.lastName}
                    </p>
                    <p className="text-xs font-mono qc-num text-ink-500">
                      {maskPhone(selectedWorker.phone)}
                    </p>
                  </div>
                  <span className="rounded bg-sienna-50 px-2 py-0.5 text-2xs font-mono font-semibold text-sienna">
                    Email Missing
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="qc-eyebrow">Step 02 &middot; Email Required</span>
                  <h2 className="text-xl font-semibold text-ink-900">
                    Where should we send your verification code?
                  </h2>
                  <p className="text-sm text-ink-500 leading-relaxed">
                    We didn’t find an email address on your workforce profile.
                    Enter your email below — we’ll send a 6-digit OTP to verify
                    it, and later deliver your{" "}
                    <strong>Workers Ball 2026 Pass</strong> there.
                  </p>
                </div>

                <form
                  ref={emailFormRef}
                  onSubmit={handleEmailSubmit}
                  noValidate
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor={`${uid}-collect-email`}
                      className="block text-sm font-medium text-ink-900 mb-1"
                    >
                      Your Active Email Address{" "}
                      <span className="text-sienna">*</span>
                    </label>
                    {/* Format hint placed ABOVE input per modern-web-guidance */}
                    <p
                      id={`${uid}-collect-email-hint`}
                      className="text-xs text-ink-500 mb-2"
                    >
                      Format: you@example.com — we will send a 6-digit OTP
                      immediately.
                    </p>
                    <input
                      id={`${uid}-collect-email`}
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={enteredEmail}
                      onChange={(e) => {
                        setEnteredEmail(e.target.value);
                        setEmailError("");
                      }}
                      placeholder="you@example.com"
                      aria-describedby={`${uid}-collect-email-hint`}
                      autoFocus
                      className="qc-input wb26-field-input"
                    />
                    {emailError && (
                      <p className="mt-1.5 text-xs text-brick font-medium" role="alert">
                        {emailError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="qc-btn-primary w-full py-3 cursor-pointer"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    Send Verification Code (OTP)
                  </button>
                </form>
              </section>
            )}

            {/* ============================================================
                STAGE 2B: DISPATCHING OTP MICRO-ANIMATION
               ============================================================ */}
            {stage === "sendingOtp" && (
              <section className="wb26-panel qc-card p-8 sm:p-10 text-center space-y-5">
                <div className="mx-auto w-14 h-14 rounded-full bg-sienna-50 border border-sienna/30 flex items-center justify-center">
                  <EnvelopeIcon className="h-7 w-7 text-sienna animate-bounce" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-2xs font-mono uppercase tracking-tag text-sienna font-semibold">
                    Dispatching Security Token
                  </p>
                  <h2 className="text-xl font-semibold text-ink-900">
                    Sending 6-digit OTP to your email...
                  </h2>
                  <p className="text-sm font-mono text-ink-600">{enteredEmail}</p>
                </div>
                <div className="max-w-xs mx-auto h-1.5 bg-ink-200 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-sienna wb26-radar-bar rounded-full" />
                </div>
              </section>
            )}

            {/* ============================================================
                STAGE 2C: VERIFY 6-DIGIT OTP
               ============================================================ */}
            {stage === "verifyOtp" && selectedWorker && (
              <section className="wb26-panel qc-card p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => transitionTo("results", "backward")}
                    className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition cursor-pointer"
                  >
                    &larr; Back to results
                  </button>
                  <button
                    type="button"
                    onClick={() => transitionTo("collectEmail", "backward")}
                    className="text-xs text-ink-600 hover:text-ink-900 underline underline-offset-2 cursor-pointer"
                  >
                    Use a different email
                  </button>
                </div>

                <div className="space-y-1.5">
                  <span className="qc-eyebrow">Step 02 &middot; OTP Confirmation</span>
                  <h2 className="text-xl font-semibold text-ink-900">
                    Enter the 6-digit code sent to your email
                  </h2>
                  <p className="text-sm text-ink-500 leading-relaxed">
                    We sent a one-time verification code to{" "}
                    <strong className="text-ink-900 font-mono text-xs">
                      {enteredEmail}
                    </strong>{" "}
                    for{" "}
                    <strong className="text-ink-900">
                      {selectedWorker.firstName} {selectedWorker.lastName}
                    </strong>
                    .
                  </p>
                </div>

                {/* Mock Experience Helper Banner */}
                <div className="rounded-md border border-sienna/30 bg-sienna-50/70 p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-2xs font-mono uppercase tracking-tag text-sienna font-semibold">
                      Mock Experience &middot; Instant OTP
                    </p>
                    <p className="text-xs text-ink-700">
                      Your mock OTP code is{" "}
                      <strong className="font-mono qc-num text-ink-900">
                        {MOCK_OTP_CODE}
                      </strong>{" "}
                      (or enter <code className="font-mono">000000</code> to test error shake).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpValue(MOCK_OTP_CODE);
                        verifyOtpCode(MOCK_OTP_CODE);
                      }}
                      className="rounded bg-ink-900 px-3 py-1.5 text-xs font-mono font-medium text-cream hover:bg-ink-800 transition cursor-pointer"
                    >
                      Auto-Fill {MOCK_OTP_CODE}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailModalTab("otp");
                        setEmailModalOpen(true);
                      }}
                      className="rounded border border-ink-300 bg-white px-2.5 py-1.5 text-xs font-mono text-ink-800 hover:bg-cream transition cursor-pointer"
                    >
                      View OTP Email
                    </button>
                  </div>
                </div>

                {/* Single Semantic OTP Input (`sms-otp-form` guide) with 6 Visual Slots */}
                <form
                  ref={otpFormRef}
                  onSubmit={handleOtpFormSubmit}
                  method="POST"
                  action="/wb26/verify-otp"
                  noValidate
                  className="space-y-5"
                >
                  <div>
                    <label
                      htmlFor={`${uid}-otp-input`}
                      className="block text-sm font-medium text-ink-900 mb-1"
                    >
                      6-Digit Verification Code <span className="text-sienna">*</span>
                    </label>
                    {/* Hint placed ABOVE input per sms-otp-form guide */}
                    <p
                      id={`${uid}-otp-hint`}
                      className="text-xs text-ink-500 mb-3"
                    >
                      Type or paste the 6-digit numeric code from your inbox.
                    </p>

                    <div
                      className={`relative t-input ${otpShake ? "is-shaking" : ""}`}
                    >
                      {/* Visual 6-box architectural display */}
                      <div
                        className="grid grid-cols-6 gap-2 sm:gap-3 pointer-events-none"
                        aria-hidden="true"
                      >
                        {Array.from({ length: 6 }).map((_, idx) => {
                          const digit = otpValue[idx] || "";
                          const isCurrentSlot =
                            idx === otpValue.length ||
                            (otpValue.length === 6 && idx === 5);
                          return (
                            <div
                              key={idx}
                              className={`h-14 sm:h-16 rounded-md border flex items-center justify-center font-mono qc-num text-xl sm:text-2xl font-semibold transition-all ${
                                digit
                                  ? "border-ink-900 bg-cream text-ink-900 scale-[1.02]"
                                  : isCurrentSlot
                                    ? "border-sienna bg-white text-ink-900 ring-2 ring-sienna/15"
                                    : "border-ink-200 bg-white text-ink-400"
                              }`}
                            >
                              {digit || "·"}
                            </div>
                          );
                        })}
                      </div>

                      {/* Real single <input> covering the visual slots for native accessibility, paste & autofill */}
                      <input
                        ref={otpInputRef}
                        type="text"
                        id={`${uid}-otp-input`}
                        name="otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        pattern="\d{6}"
                        maxLength={6}
                        required
                        aria-describedby={`${uid}-otp-hint`}
                        value={otpValue}
                        onChange={(e) => {
                          const digits = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setOtpValue(digits);
                          setOtpError("");
                          if (digits.length === 6) {
                            verifyOtpCode(digits);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-text font-mono text-xl"
                      />
                    </div>

                    {otpError && (
                      <p
                        className="mt-2 text-xs text-brick font-medium"
                        role="alert"
                        aria-live="polite"
                      >
                        {otpError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={isVerifyingOtp}
                      className="qc-btn-primary flex-1 py-3 cursor-pointer"
                    >
                      <LockClosedIcon className="h-4 w-4" />
                      {isVerifyingOtp
                        ? "Verifying Identity..."
                        : "Verify & Unlock Profile"}
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                      className="qc-btn-secondary py-3 px-4 text-xs font-mono cursor-pointer"
                    >
                      <ArrowPathIcon className="h-3.5 w-3.5" />
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend Code"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* ============================================================
                STAGE 3: REVIEW & UPDATE WORKER DETAILS
                (First Name, Last Name, Phone, Role, Department, Team)
               ============================================================ */}
            {stage === "editProfile" && (
              <section className="wb26-panel qc-card p-6 sm:p-8 space-y-6">
                {/* Verified Identity Header */}
                <div className="rounded-md border border-forest/30 bg-forest-50 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircleIcon className="h-5 w-5 text-forest shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-forest">
                        Email Verified via OTP
                      </p>
                      <p className="text-xs font-mono text-ink-600 truncate">
                        {profileForm.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => transitionTo("results", "backward")}
                    className="text-xs text-ink-600 hover:text-ink-900 underline underline-offset-2 shrink-0 cursor-pointer"
                  >
                    Not you?
                  </button>
                </div>

                {/* Live Profile Completeness Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono uppercase tracking-tag text-ink-500 text-2xs font-semibold">
                      Step 03 &middot; Profile Completeness
                    </span>
                    <span
                      className={`font-mono qc-num font-semibold ${
                        completedCount === 6 ? "text-forest" : "text-sienna"
                      }`}
                    >
                      {completedCount}/6 Fields Ready ({completenessPct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-ink-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        completedCount === 6 ? "bg-forest" : "bg-sienna"
                      }`}
                      style={{ width: `${completenessPct}%` }}
                    />
                  </div>
                  {originallyMissing.size > 0 && (
                    <p className="text-xs text-ink-500">
                      Fields marked{" "}
                      <span className="inline-block rounded bg-mustard-50 px-1.5 py-0.5 text-2xs font-mono font-semibold text-mustard">
                        Update Required
                      </span>{" "}
                      were empty on your record and must be updated before saving.
                    </p>
                  )}
                </div>

                <form
                  ref={profileFormRef}
                  onSubmit={handleSaveProfile}
                  noValidate
                  className="space-y-5"
                >
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor={`${uid}-firstName`}
                        className="block text-sm font-medium text-ink-900 mb-1"
                      >
                        First Name <span className="text-sienna">*</span>
                        {originallyMissing.has("firstName") && (
                          <MissingRequiredBadge
                            filled={Boolean(profileForm.firstName.trim())}
                          />
                        )}
                      </label>
                      <input
                        id={`${uid}-firstName`}
                        name="firstName"
                        type="text"
                        required
                        autoComplete="given-name"
                        value={profileForm.firstName}
                        onChange={(e) =>
                          updateProfileField("firstName", e.target.value)
                        }
                        className="qc-input wb26-field-input"
                      />
                      {profileErrors.firstName && (
                        <p className="mt-1 text-xs text-brick">
                          {profileErrors.firstName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`${uid}-lastName`}
                        className="block text-sm font-medium text-ink-900 mb-1"
                      >
                        Last Name <span className="text-sienna">*</span>
                        {originallyMissing.has("lastName") && (
                          <MissingRequiredBadge
                            filled={Boolean(profileForm.lastName.trim())}
                          />
                        )}
                      </label>
                      <input
                        id={`${uid}-lastName`}
                        name="lastName"
                        type="text"
                        required
                        autoComplete="family-name"
                        value={profileForm.lastName}
                        onChange={(e) =>
                          updateProfileField("lastName", e.target.value)
                        }
                        className="qc-input wb26-field-input"
                      />
                      {profileErrors.lastName && (
                        <p className="mt-1 text-xs text-brick">
                          {profileErrors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label
                      htmlFor={`${uid}-phone`}
                      className="block text-sm font-medium text-ink-900 mb-1"
                    >
                      Phone Number (11 Digits) <span className="text-sienna">*</span>
                      {originallyMissing.has("phone") && (
                        <MissingRequiredBadge
                          filled={
                            profileForm.phone.replace(/\D/g, "").length === 11
                          }
                        />
                      )}
                    </label>
                    <input
                      id={`${uid}-phone`}
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={11}
                      required
                      value={profileForm.phone}
                      onChange={(e) =>
                        updateProfileField(
                          "phone",
                          e.target.value.replace(/\D/g, "").slice(0, 11)
                        )
                      }
                      placeholder="08012345678"
                      className="qc-input qc-num wb26-field-input"
                    />
                    {profileErrors.phone && (
                      <p className="mt-1 text-xs text-brick">
                        {profileErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label
                      htmlFor={`${uid}-role`}
                      className="block text-sm font-medium text-ink-900 mb-1"
                    >
                      Workforce Role <span className="text-sienna">*</span>
                      {originallyMissing.has("role") && (
                        <MissingRequiredBadge
                          filled={Boolean(profileForm.role.trim())}
                        />
                      )}
                    </label>
                    <select
                      id={`${uid}-role`}
                      name="role"
                      required
                      value={profileForm.role}
                      onChange={(e) => updateProfileField("role", e.target.value)}
                      className="qc-input wb26-field-input"
                    >
                      <option value="">Select your role...</option>
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    {profileErrors.role && (
                      <p className="mt-1 text-xs text-brick">
                        {profileErrors.role}
                      </p>
                    )}
                  </div>

                  {/* Team & Department */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor={`${uid}-team`}
                        className="block text-sm font-medium text-ink-900 mb-1"
                      >
                        Team <span className="text-sienna">*</span>
                        {originallyMissing.has("team") && (
                          <MissingRequiredBadge
                            filled={Boolean(profileForm.team.trim())}
                          />
                        )}
                      </label>
                      <select
                        id={`${uid}-team`}
                        name="team"
                        required
                        value={profileForm.team}
                        onChange={(e) => updateProfileField("team", e.target.value)}
                        className="qc-input wb26-field-input"
                      >
                        <option value="">Select your team...</option>
                        {teamOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {profileErrors.team && (
                        <p className="mt-1 text-xs text-brick">
                          {profileErrors.team}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`${uid}-department`}
                        className="block text-sm font-medium text-ink-900 mb-1"
                      >
                        Department <span className="text-sienna">*</span>
                        {originallyMissing.has("department") && (
                          <MissingRequiredBadge
                            filled={Boolean(profileForm.department.trim())}
                          />
                        )}
                      </label>
                      <select
                        id={`${uid}-department`}
                        name="department"
                        required
                        disabled={!profileForm.team}
                        value={profileForm.department}
                        onChange={(e) =>
                          updateProfileField("department", e.target.value)
                        }
                        className="qc-input wb26-field-input"
                      >
                        <option value="">
                          {profileForm.team
                            ? "Select department..."
                            : "Select a team first"}
                        </option>
                        {departmentOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {profileErrors.department && (
                        <p className="mt-1 text-xs text-brick">
                          {profileErrors.department}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      className="qc-btn-primary w-full py-3.5 text-base cursor-pointer"
                    >
                      <TicketIcon className="h-5 w-5" />
                      Save &amp; Confirm Workers Ball Registration
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* ============================================================
                STAGE 4A: MINTING PASS MICRO-ANIMATION
               ============================================================ */}
            {stage === "mintingPass" && (
              <section className="wb26-panel qc-card p-8 sm:p-10 text-center space-y-5">
                <WorkersBallCrest className="h-20 w-20 mx-auto" />
                <div className="space-y-1.5">
                  <p className="text-2xs font-mono uppercase tracking-tag text-sienna font-semibold">
                    Generating Official Gala Pass
                  </p>
                  <h2 className="text-xl font-semibold text-ink-900">
                    Encoding your unique Workers Ball 2026 access code...
                  </h2>
                  <p className="text-xs font-mono text-ink-500">
                    {accessCode} &middot; Dispatching confirmation to{" "}
                    {profileForm.email}
                  </p>
                </div>
                <div className="max-w-xs mx-auto h-1.5 bg-ink-200 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-ink-900 wb26-radar-bar rounded-full" />
                </div>
              </section>
            )}

            {/* ============================================================
                STAGE 4B: REGISTRATION CONFIRMED + GALA PASS + DOWNLOAD
               ============================================================ */}
            {stage === "confirmed" && (
              <section className="wb26-panel space-y-6 relative">
                {/* Celebratory Confetti Burst */}
                <div
                  className="pointer-events-none absolute inset-x-0 -top-4 h-44 overflow-hidden z-20"
                  aria-hidden="true"
                >
                  {[
                    { left: "12%", dx: "-25px", rot: "210deg", bg: "#B5471F", delay: "0ms" },
                    { left: "24%", dx: "30px", rot: "-180deg", bg: "#A87B0F", delay: "60ms" },
                    { left: "38%", dx: "-15px", rot: "290deg", bg: "#4A6B3F", delay: "120ms" },
                    { left: "52%", dx: "22px", rot: "160deg", bg: "#0A0E1A", delay: "40ms" },
                    { left: "66%", dx: "-28px", rot: "-240deg", bg: "#B5471F", delay: "90ms" },
                    { left: "78%", dx: "18px", rot: "220deg", bg: "#A87B0F", delay: "150ms" },
                    { left: "88%", dx: "-20px", rot: "190deg", bg: "#4A6B3F", delay: "70ms" },
                  ].map((c, i) => (
                    <span
                      key={i}
                      style={{
                        left: c.left,
                        backgroundColor: c.bg,
                        animationDelay: c.delay,
                        "--confetti-dx": c.dx,
                        "--confetti-rot": c.rot,
                      }}
                      className="wb26-confetti-piece absolute top-0 w-2.5 h-2.5 rounded-xs"
                    />
                  ))}
                </div>

                {/* Confirmation Header Card */}
                <div className="qc-card p-6 sm:p-7 text-center space-y-3">
                  <SuccessMark className="mx-auto h-14 w-14 text-forest" />
                  <span className="block text-2xs font-mono uppercase tracking-tag text-forest font-semibold">
                    Registration Confirmed &middot; Workers Ball 2026
                  </span>
                  <h2 className="text-2xl font-semibold text-ink-900">
                    See you at Workers Ball, {profileForm.firstName}!
                  </h2>
                  <p className="text-sm text-ink-600 max-w-md mx-auto leading-relaxed">
                    Your workforce record has been updated and your registration
                    is confirmed. Your unique access code is{" "}
                    <strong className="font-mono qc-num text-ink-900">
                      {accessCode}
                    </strong>
                    .
                  </p>

                  {/* Email Notification Notice */}
                  <div className="mt-4 rounded-md border border-ink-200 bg-cream px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <EnvelopeIcon className="h-5 w-5 text-sienna shrink-0" />
                      <p className="text-xs text-ink-700 leading-relaxed">
                        A confirmation email with your access code and pass has
                        been sent to{" "}
                        <strong className="text-ink-900 font-mono">
                          {profileForm.email}
                        </strong>
                        .
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailModalTab("confirm");
                        setEmailModalOpen(true);
                      }}
                      className="shrink-0 rounded border border-ink-300 bg-white px-3 py-1.5 text-2xs font-mono uppercase tracking-tag font-semibold text-ink-800 hover:bg-cream-200 transition cursor-pointer"
                    >
                      Preview Email HTML
                    </button>
                  </div>
                </div>

                {/* Interactive 3D-Tilt Pass & Download */}
                <CeremonialPassCard
                  profile={profileForm}
                  accessCode={accessCode}
                  onDownload={handleDownloadPass}
                  onCopy={handleCopyAccessCode}
                  copied={codeCopied}
                />

                {/* Start Over / Edit Again Footer Actions */}
                <div className="flex items-center justify-between pt-2 text-xs text-ink-500">
                  <button
                    type="button"
                    onClick={() => transitionTo("editProfile", "backward")}
                    className="hover:text-ink-900 underline underline-offset-2 cursor-pointer"
                  >
                    &larr; Edit profile details
                  </button>
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="hover:text-ink-900 underline underline-offset-2 cursor-pointer"
                  >
                    Register another worker
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-200 py-5 px-5 sm:px-8 text-center text-xs text-ink-500 relative z-10 bg-cream">
        Harvesters International Christian Centre, Gbagada Campus &middot; Workers Ball 2026
      </footer>

      {/* Built-in Email HTML Studio Modal */}
      <EmailTemplatesModal
        key={emailModalTab}
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        initialTab={emailModalTab}
        workerProfile={profileForm.firstName ? profileForm : selectedWorker}
        accessCode={accessCode}
      />
    </div>
  );
}
