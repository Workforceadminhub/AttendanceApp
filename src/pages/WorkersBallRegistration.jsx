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
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import SuccessMark from "../components/ui/SuccessMark";
import {
  MOCK_OTP_CODE,
  downloadWorkersBallPassPng,
} from "../utils/workersBallMock";
import {
  confirmWorkersBallRegistration,
  requestWorkersBallOtp,
  searchWorkersBall,
  updateWorkersBallEmail,
} from "../services/workersBall";
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
 * Ceremonial Harvesters Emblem for Workers Ball 2026 (uses official /logo.jpg).
 */
function WorkersBallCrest({ className = "h-20 w-20" }) {
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

const DECADE_YEARS = [2023, 2024, 2025, 2026];

/**
 * Year-by-year archive of Workers Ball media (videos & photography).
 * Starts at 2023 -> 2024 -> 2025 (10 full seconds dedicated per year) -> lands on 2026.
 */
const YEAR_PHOTOS = {
  2023: [
    {
      type: "video",
      src: "/wb23/reel-1.mp4",
      poster: "/wb23/photo-1.jpg",
      alt: "Harvesters Gbagada Workers Ball 2023 — Red Carpet Reel",
    },
    {
      type: "image",
      src: "/wb23/photo-1.jpg",
      alt: "Harvesters Gbagada Workers Ball 2023 — All White Edition stage moment",
    },
    {
      type: "image",
      src: "/wb23/photo-2.jpg",
      alt: "Harvesters Gbagada Workers Ball 2023 — Workforce celebrating in all white",
    },
    {
      type: "image",
      src: "/wb23/photo-3.jpg",
      alt: "Harvesters Gbagada Workers Ball 2023 — Joyful laughter at the banquet table",
    },
    {
      type: "image",
      src: "/wb23/photo-4.jpg",
      alt: "Harvesters Gbagada Workers Ball 2023 — Applause in white",
    },
    {
      type: "image",
      src: "/wb23/photo-5.jpg",
      alt: "Harvesters Gbagada Workers Ball 2023 — Special Recognition Award presentation",
    },
  ],
  2024: [
    {
      type: "image",
      src: "/wb24/photo-1.jpg",
      alt: "Harvesters Gbagada Workers Ball 2024 — Applause in gold and black agbada",
    },
    {
      type: "image",
      src: "/wb24/photo-2.jpg",
      alt: "Harvesters Gbagada Workers Ball 2024 — Couple in white agbada and orange gown",
    },
    {
      type: "image",
      src: "/wb24/photo-3.jpg",
      alt: "Harvesters Gbagada Workers Ball 2024 — Stage performance",
    },
    {
      type: "image",
      src: "/wb24/photo-4.jpg",
      alt: "Harvesters Gbagada Workers Ball 2024 — Joyful celebration in blue and gold lace",
    },
    {
      type: "image",
      src: "/wb24/photo-5.jpg",
      alt: "Harvesters Gbagada Workers Ball 2024 — Shimmering aso-oke portrait",
    },
  ],
  2025: [
    {
      type: "image",
      src: "/wb25/photo-1.jpg",
      alt: "Harvesters Gbagada Workers Ball 2025 — Squad in Denim and Diamonds",
    },
    {
      type: "image",
      src: "/wb25/photo-2.jpg",
      alt: "Harvesters Gbagada Workers Ball 2025 — Red carpet portrait",
    },
    {
      type: "image",
      src: "/wb25/photo-3.jpg",
      alt: "Harvesters Gbagada Workers Ball 2025 — Family moment on the carpet",
    },
    {
      type: "image",
      src: "/wb25/photo-4.jpg",
      alt: "Harvesters Gbagada Workers Ball 2025 — Workforce fashion",
    },
    {
      type: "image",
      src: "/wb25/photo-5.jpg",
      alt: "Harvesters Gbagada Workers Ball 2025 — Worker portrait",
    },
  ],
  2026: [],
};

const DECADE_SCHEDULE = (() => {
  let cursor = 0;
  return DECADE_YEARS.map((yr) => {
    const photos = YEAR_PHOTOS[yr] || [];
    // Dedicated 10.0 seconds (10000ms) for each showcase year (2023, 2024, 2025);
    // 2026 finale gets 1.8s.
    const duration =
      yr === 2026 ? 1800 : photos.length > 0 ? 10000 : 350;
    const entry = {
      year: yr,
      photos,
      startMs: cursor,
      endMs: cursor + duration,
      durationMs: duration,
    };
    cursor += duration;
    return entry;
  });
})();

const TOTAL_INTRO_MS =
  DECADE_SCHEDULE[DECADE_SCHEDULE.length - 1]?.endMs || 31800;

/**
 * Pre-Form Complete Full-Screen Opening Sequence ("Before the form even loads").
 * Edge-to-edge 100vw x 100dvh full-bleed canvas counting from 2023 -> 2026.
 * Shows ONE full-screen image/video at a time (no grid, no tiny images, no center box blocking the view),
 * with 10 full seconds dedicated to each of 2023, 2024, and 2025 before landing on 2026.
 */
function IntroCurtain({ onEnter }) {
  const [yearCounter, setYearCounter] = useState(2023);
  const [yearProgress, setYearProgress] = useState(0);

  // Preload all year photos immediately so full-screen transitions are instant
  useEffect(() => {
    Object.values(YEAR_PHOTOS)
      .flat()
      .forEach((item) => {
        if (item.type !== "video" && typeof Image !== "undefined") {
          const img = new Image();
          img.src = item.src;
        }
      });
  }, []);

  useEffect(() => {
    const start = performance.now();
    let rafId;
    let timerId;

    const step = (now) => {
      const elapsed = now - start;

      if (elapsed < TOTAL_INTRO_MS) {
        const currentSlot =
          DECADE_SCHEDULE.find(
            (slot) => elapsed >= slot.startMs && elapsed < slot.endMs
          ) || DECADE_SCHEDULE[DECADE_SCHEDULE.length - 1];

        setYearCounter(currentSlot.year);
        const localRatio = Math.min(
          1,
          Math.max(0, (elapsed - currentSlot.startMs) / currentSlot.durationMs)
        );
        setYearProgress(localRatio);
        rafId = requestAnimationFrame(step);
      } else {
        setYearCounter(2026);
        setYearProgress(1);
        timerId = setTimeout(() => {
          onEnter();
        }, 400);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      if (timerId) clearTimeout(timerId);
    };
  }, [onEnter]);

  const currentYearPhotos = YEAR_PHOTOS[yearCounter] || [];
  const hasPhotosForYear = currentYearPhotos.length > 0;
  const activePhotoIdx = hasPhotosForYear
    ? Math.min(
        currentYearPhotos.length - 1,
        Math.floor(yearProgress * currentYearPhotos.length)
      )
    : -1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
      }}
      className="fixed inset-0 z-[100] w-screen h-dvh bg-ink-900 text-ink-900 overflow-hidden select-none"
    >
      {/* TRUE 100% FULL-SCREEN SINGLE-SLIDE/VIDEO SHOWCASE (2022, 2023, 2024, 2025) */}
      {hasPhotosForYear && (
        <div
          key={`media-stage-${yearCounter}`}
          className="absolute inset-0 w-screen h-dvh bg-ink-900 overflow-hidden"
        >
          {currentYearPhotos.map((item, idx) => {
            const isActive = idx === activePhotoIdx;
            return (
              <div
                key={item.src}
                className={`absolute inset-0 w-screen h-dvh transition-opacity duration-700 ease-out ${
                  isActive
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                {item.type === "video" ? (
                  <video
                    src={item.src}
                    poster={item.poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="w-screen h-dvh object-cover object-center"
                  />
                ) : (
                  <img
                    src={item.src}
                    alt={item.alt}
                    style={{
                      transform: isActive ? "scale(1.05)" : "scale(1.0)",
                      transition:
                        "transform 3500ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                    className="w-screen h-dvh object-cover object-[center_20%]"
                  />
                )}
              </div>
            );
          })}

          {/* Subtle top & bottom cinema gradients for legibility without covering the center */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 via-black/20 to-transparent z-20"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 via-black/45 to-transparent z-20"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Full-Viewport Cream Editorial Canvas (for 2016..2021 fast tick & 2026 finale) */}
      {!hasPhotosForYear && (
        <div className="absolute inset-0 w-screen h-dvh bg-cream flex flex-col items-center justify-center px-6">
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            aria-hidden="true"
          >
            <span
              key={`wm-${yearCounter}`}
              className="wb26-year-tick font-mono qc-num font-bold text-[30vw] leading-none tracking-tighter text-ink-900/[0.06]"
            >
              {yearCounter}
            </span>
          </div>

          <div className="relative z-20 text-center">
            <img
              src="/logo-transparent.png"
              alt="Harvesters"
              className="h-14 sm:h-20 w-auto mx-auto mb-5 select-none"
            />
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-semibold tracking-tight text-ink-900 leading-none">
              Workers Ball{" "}
              <span
                key={yearCounter}
                className={`wb26-year-tick inline-block qc-num font-mono font-bold ${
                  yearCounter === 2026 ? "text-sienna" : "text-ink-800"
                }`}
              >
                {yearCounter}
              </span>
            </h1>
          </div>
        </div>
      )}

      {/* Top Bar: Transparent Official Logo (Top-Left on media years) + Skip Intro (Top-Right) */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7 pointer-events-none">
        {hasPhotosForYear ? (
          <img
            src="/logo-transparent.png"
            alt="Harvesters"
            className="h-8 sm:h-11 w-auto object-contain select-none drop-shadow-[0_1px_10px_rgba(255,255,255,0.75)]"
          />
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onEnter}
          className={`pointer-events-auto px-4 py-2 rounded-full text-xs font-mono uppercase tracking-tag transition-colors cursor-pointer ${
            hasPhotosForYear
              ? "bg-cream/95 text-ink-900 hover:bg-cream shadow-sheet"
              : "bg-ink-900/10 text-ink-800 hover:bg-ink-900/15 hover:text-ink-900"
          }`}
        >
          Skip Intro &rarr;
        </button>
      </div>

      {/* Bottom Full-Width Overlay: Year Title (on media years) + Decade Timeline Strip */}
      <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-5 sm:px-10 sm:pb-8 pointer-events-none">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          {hasPhotosForYear && (
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-white leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.75)]">
                  Workers Ball{" "}
                  <span
                    key={yearCounter}
                    className="wb26-year-tick inline-block qc-num font-mono font-bold text-[#F6B042]"
                  >
                    {yearCounter}
                  </span>
                </h1>
              </div>

              {/* Per-slide progress pills for the 10-second showcase */}
              <div className="flex items-center gap-1.5 sm:pb-2">
                {currentYearPhotos.map((item, idx) => {
                  const isActive = idx === activePhotoIdx;
                  const isPast = idx < activePhotoIdx;
                  return (
                    <span
                      key={item.src}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isActive
                          ? "w-8 bg-[#F6B042]"
                          : isPast
                            ? "w-3 bg-white/85"
                            : "w-3 bg-white/30"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Decade Timeline Strip (2016 -> 2026) with 10s progress bar */}
          <div
            className={`w-full px-4 py-2.5 rounded-2xl transition-colors duration-500 ${
              hasPhotosForYear
                ? "bg-black/55 backdrop-blur-md border border-white/15"
                : "bg-cream/90 border border-ink-200/70"
            }`}
          >
            {hasPhotosForYear && (
              <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-[#F6B042] transition-all duration-100 ease-linear"
                  style={{ width: `${Math.round(yearProgress * 100)}%` }}
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-1">
              {DECADE_YEARS.map((yr) => {
                const reached = yearCounter >= yr;
                const isCurrent = yearCounter === yr;
                return (
                  <div
                    key={yr}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <span
                      className={`h-2 w-2 rounded-full transition-all duration-300 ${
                        isCurrent
                          ? hasPhotosForYear
                            ? "bg-[#F6B042] scale-150 ring-4 ring-[#F6B042]/30"
                            : "bg-sienna scale-150 ring-4 ring-sienna/20"
                          : reached
                            ? hasPhotosForYear
                              ? "bg-white"
                              : "bg-ink-900"
                            : hasPhotosForYear
                              ? "bg-white/30"
                              : "bg-ink-300"
                      }`}
                    />
                    <span
                      className={`text-[10px] sm:text-2xs font-mono qc-num transition-colors duration-300 ${
                        isCurrent
                          ? hasPhotosForYear
                            ? "text-[#F6B042] font-bold"
                            : "text-sienna font-bold"
                          : reached
                            ? hasPhotosForYear
                              ? "text-white font-medium"
                              : "text-ink-900 font-medium"
                            : hasPhotosForYear
                              ? "text-white/40 hidden sm:inline"
                              : "text-ink-400 hidden sm:inline"
                      }`}
                    >
                      {yr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
  { id: "pass", num: "03", label: "Gala Pass" },
];

function StepProgressRail({ currentStage }) {
  const stageToIndex = {
    search: 0,
    results: 0,
    collectEmail: 1,
    sendingOtp: 1,
    verifyOtp: 1,
    mintingPass: 2,
    confirmed: 2,
    alreadyRegistered: 2,
  };
  const activeIdx = stageToIndex[currentStage] ?? 0;

  return (
    <nav aria-label="Registration progress" className="mb-8">
      <ol className="grid grid-cols-3 gap-2">
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
  // "search" | "results" | "collectEmail" | "sendingOtp" | "verifyOtp" | "mintingPass" | "confirmed" | "alreadyRegistered"
  const [stage, setStage] = useState("search");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [lastSearchedQuery, setLastSearchedQuery] = useState("");

  // Selected worker & email/OTP state
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [enteredEmail, setEnteredEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [otpDestination, setOtpDestination] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpShake, setOtpShake] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Confirmed Pass state (returned by POST /api/workers-ball/register/confirm)
  const [accessCode, setAccessCode] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Email HTML Studio Modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalTab, setEmailModalTab] = useState("otp");

  const otpFormRef = useRef(null);
  const otpInputRef = useRef(null);
  const emailFormRef = useRef(null);
  const verifyingRef = useRef(false);

  // Pass profile derived from the selected worker (the API has no profile-update endpoint)
  const profileForm = {
    firstName: selectedWorker?.firstName || "",
    lastName: selectedWorker?.lastName || "",
    phone: selectedWorker?.phone || "",
    email: otpDestination || selectedWorker?.email || "",
    role: selectedWorker?.role || "Worker",
    team: selectedWorker?.team || "",
    department: selectedWorker?.department || "",
  };

  // Initialize post-interaction validation fallback on forms
  useEffect(() => {
    const cleanEmail = UserInvalidFallback.init(emailFormRef.current);
    return () => {
      cleanEmail();
    };
  }, [stage, isEditingEmail]);

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

  // Transition helper
  const transitionTo = (nextStage, direction = "forward") => {
    runStageTransition(() => {
      setStage(nextStage);
    }, direction);
  };

  // 409 Conflict (or "already registered" message) means this worker already has a pass
  const isAlreadyRegisteredError = (err) =>
    err?.status === 409 || /already\s+registered/i.test(err?.message || "");

  const shakeOtp = () => {
    setOtpShake(true);
    setTimeout(() => setOtpShake(false), 360);
  };

  // Step 1: Search by name — GET /api/workers-ball/search?name=...
  const executeSearch = async (queryOverride) => {
    const raw =
      typeof queryOverride === "string" ? queryOverride : searchQuery;
    const trimmed = raw.trim();
    if (!trimmed) {
      toast.error("Please enter your name to search.");
      return;
    }
    setSearchQuery(trimmed);
    setIsSearching(true);
    try {
      const results = await searchWorkersBall(trimmed);
      setSearchResults(results);
      setLastSearchedQuery(trimmed);
      transitionTo("results", "forward");
    } catch (err) {
      toast.error(
        err?.message || "We couldn't search the registry. Please try again."
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Step 2: Select a worker from the results
  const handleSelectWorker = (worker) => {
    setSelectedWorker(worker);
    setOtpValue("");
    setOtpError("");
    setEmailError("");
    setEnteredEmail("");
    setAccessCode("");
    setQrCode(null);

    if (worker.registered) {
      transitionTo("alreadyRegistered", "forward");
      return;
    }
    // No email on record → must enter one before an OTP can be sent
    setIsEditingEmail(!worker.email);
    transitionTo("collectEmail", "forward");
  };

  // Request the 6-digit OTP — POST /api/workers-ball/register { workerId }
  const dispatchOtp = async (worker, destinationLabel) => {
    transitionTo("sendingOtp", "forward");
    try {
      await requestWorkersBallOtp(worker.id);
      setOtpDestination(destinationLabel);
      setOtpValue("");
      setOtpError("");
      setResendCooldown(45);
      transitionTo("verifyOtp", "forward");
      setTimeout(() => {
        otpInputRef.current?.focus?.();
      }, 80);
    } catch (err) {
      if (isAlreadyRegisteredError(err)) {
        transitionTo("alreadyRegistered", "forward");
        return;
      }
      toast.error(
        err?.message || "We couldn't send your verification code. Please try again."
      );
      transitionTo("collectEmail", "backward");
    }
  };

  // Step 2A: Use email on record, or save a new one — PUT /api/workers-ball/workers/{id}/email
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorker || isSubmittingEmail) return;

    if (!isEditingEmail && selectedWorker.email) {
      await dispatchOtp(selectedWorker, selectedWorker.email);
      return;
    }

    const cleaned = enteredEmail.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
    if (!valid) {
      setEmailError("Please enter a valid email address (e.g. you@example.com).");
      return;
    }
    setEmailError("");
    setIsSubmittingEmail(true);
    try {
      await updateWorkersBallEmail(selectedWorker.id, cleaned);
      const updated = { ...selectedWorker, email: cleaned };
      setSelectedWorker(updated);
      setIsEditingEmail(false);
      await dispatchOtp(updated, cleaned);
    } catch (err) {
      if (isAlreadyRegisteredError(err)) {
        transitionTo("alreadyRegistered", "forward");
        return;
      }
      setEmailError(
        err?.message || "We couldn't update your email. Please try again."
      );
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Step 2B: Confirm OTP — POST /api/workers-ball/register/confirm { workerId, otp }
  const verifyOtpCode = async (codeToVerify) => {
    if (verifyingRef.current || !selectedWorker) return;
    const cleaned = String(codeToVerify ?? otpValue)
      .replace(/\D/g, "")
      .slice(0, 6);
    if (cleaned.length !== 6) {
      setOtpError("Please enter all 6 digits of your verification code.");
      shakeOtp();
      return;
    }

    verifyingRef.current = true;
    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const result = await confirmWorkersBallRegistration(
        selectedWorker.id,
        cleaned
      );
      setAccessCode(result.accessCode || "");
      setQrCode(result.qrCode || null);
      setSelectedWorker((prev) => (prev ? { ...prev, registered: true } : prev));
      transitionTo("mintingPass", "forward");
      setTimeout(() => {
        transitionTo("confirmed", "forward");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 900);
    } catch (err) {
      if (isAlreadyRegisteredError(err)) {
        transitionTo("alreadyRegistered", "forward");
        return;
      }
      setOtpError(err?.message || "Invalid or expired verification code.");
      shakeOtp();
    } finally {
      verifyingRef.current = false;
      setIsVerifyingOtp(false);
    }
  };

  const handleOtpFormSubmit = (e) => {
    e.preventDefault();
    verifyOtpCode(otpValue);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResendingOtp || !selectedWorker) return;
    setIsResendingOtp(true);
    try {
      await requestWorkersBallOtp(selectedWorker.id);
      setOtpValue("");
      setOtpError("");
      setResendCooldown(45);
      toast.info(`New verification code sent to ${otpDestination}`);
    } catch (err) {
      if (isAlreadyRegisteredError(err)) {
        transitionTo("alreadyRegistered", "forward");
        return;
      }
      toast.error(err?.message || "We couldn't resend the code. Please try again.");
    } finally {
      setIsResendingOtp(false);
    }
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
    setOtpDestination("");
    setEnteredEmail("");
    setIsEditingEmail(false);
    setAccessCode("");
    setQrCode(null);
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
                  : stage === "alreadyRegistered"
                    ? "You're Already Registered"
                    : stage === "verifyOtp" || stage === "sendingOtp"
                      ? "Confirm Your Identity"
                      : stage === "collectEmail"
                        ? "Confirm Your Email"
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
                STAGE 1A: SEARCH BY NAME
               ============================================================ */}
            {stage === "search" && (
              <section className="wb26-panel qc-card p-6 sm:p-8 space-y-6">
                <div className="space-y-1.5">
                  <span className="qc-eyebrow">Step 01 &middot; Workforce Lookup</span>
                  <h2 className="text-xl font-semibold text-ink-900">
                    Find your name in the Gbagada registry
                  </h2>
                  <p className="text-sm text-ink-500 leading-relaxed">
                    Search using your <strong>first name</strong> or{" "}
                    <strong>surname</strong>, then pick your record from the list.
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
                      Your Name <span className="text-sienna">*</span>
                    </label>
                    <p
                      id={`${uid}-search-hint`}
                      className="text-xs text-ink-500 mb-2"
                    >
                      Example: &ldquo;Adebayo Okafor&rdquo; or &ldquo;Mayowa&rdquo;
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        id={`${uid}-search`}
                        name="name"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter your name..."
                        aria-describedby={`${uid}-search-hint`}
                        autoComplete="name"
                        autoCorrect="off"
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
                        {isSearching ? "Searching..." : "Search Registry"}
                      </button>
                    </div>
                  </div>

                  {isSearching && (
                    <div className="rounded-md border border-ink-200 bg-cream p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-2xs font-mono uppercase tracking-tag text-ink-600">
                        <span>Querying Harvesters Gbagada Workforce...</span>
                      </div>
                      <div className="h-1 w-full bg-ink-200 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-sienna wb26-radar-bar rounded-full" />
                      </div>
                    </div>
                  )}
                </form>
              </section>
            )}

            {/* ============================================================
                STAGE 1B: SEARCH RESULTS (STAGGERED CASCADE)
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
                      {searchResults.length}{" "}
                      {searchResults.length === 1 ? "Result" : "Results"}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-ink-900">
                      Select your name for &ldquo;{lastSearchedQuery}&rdquo;
                    </h2>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Tap your record. We&rsquo;ll email you a 6-digit code to
                      confirm it&rsquo;s you.
                    </p>
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
                      aria-label="Search another name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search another name..."
                      autoCorrect="off"
                      spellCheck={false}
                      className="qc-input min-h-0 py-2 text-sm flex-1"
                    />
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="qc-btn-secondary min-h-0 py-2 px-4 text-xs font-mono uppercase tracking-tag cursor-pointer"
                    >
                      {isSearching ? "..." : "Search"}
                    </button>
                  </form>
                </div>

                {searchResults.length === 0 ? (
                  <div className="qc-card p-6 text-center space-y-1.5">
                    <p className="text-sm font-semibold text-ink-900">
                      No workers found for &ldquo;{lastSearchedQuery}&rdquo;
                    </p>
                    <p className="text-xs text-ink-500">
                      Try your first name only, or check the spelling. If you
                      still can&rsquo;t find yourself, speak to your HOD.
                    </p>
                  </div>
                ) : (
                  <ul
                    className="divide-y divide-ink-200 rounded-md border border-ink-200 bg-white overflow-hidden shadow-sheet"
                    aria-label="Matching workers"
                  >
                    {searchResults.map((w, index) => {
                      const deptTeamLine = [w.department, w.team]
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
                                    {w.name || `${w.firstName} ${w.lastName}`}
                                  </p>
                                  {w.phone && (
                                    <span className="text-xs font-mono qc-num text-ink-500">
                                      {w.phone}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-ink-500 truncate mt-0.5">
                                  {deptTeamLine || "Workforce Member"}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                              {w.registered ? (
                                <span className="inline-flex items-center gap-1 rounded bg-forest-50 px-2 py-0.5 text-2xs font-mono font-medium text-forest">
                                  ✓ Registered
                                </span>
                              ) : w.email ? (
                                <span className="inline-flex items-center gap-1 rounded bg-cream-200 px-2 py-0.5 text-2xs font-mono font-medium text-ink-700">
                                  <EnvelopeIcon className="h-3 w-3" />
                                  {w.email}
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
                )}
              </section>
            )}

            {/* ============================================================
                STAGE 2A: CONFIRM OR UPDATE EMAIL, THEN SEND OTP
               ============================================================ */}
            {stage === "collectEmail" && selectedWorker && (
              <section className="wb26-panel qc-card p-6 sm:p-8 space-y-6">
                <button
                  type="button"
                  onClick={() => transitionTo("results", "backward")}
                  className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition cursor-pointer"
                >
                  &larr; Back to results
                </button>

                {/* Selected Worker Banner */}
                <div className="rounded-md border border-ink-200 bg-cream px-4 py-3 flex items-center gap-3">
                  <UserCircleIcon className="h-6 w-6 text-ink-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">
                      {selectedWorker.name ||
                        `${selectedWorker.firstName} ${selectedWorker.lastName}`}
                    </p>
                    <p className="text-xs text-ink-500 truncate">
                      {[selectedWorker.department, selectedWorker.team]
                        .filter(Boolean)
                        .join(" · ") || "Workforce Member"}
                    </p>
                  </div>
                  {!selectedWorker.email && (
                    <span className="rounded bg-sienna-50 px-2 py-0.5 text-2xs font-mono font-semibold text-sienna">
                      Email Missing
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="qc-eyebrow">Step 02 &middot; Email</span>
                  <h2 className="text-xl font-semibold text-ink-900">
                    {isEditingEmail
                      ? "Where should we send your code?"
                      : "Send your code to this email?"}
                  </h2>
                  <p className="text-sm text-ink-500 leading-relaxed">
                    We&rsquo;ll email a 6-digit code to confirm it&rsquo;s you.
                    Your Workers Ball pass goes to the same address.
                  </p>
                </div>

                <form
                  ref={emailFormRef}
                  onSubmit={handleEmailSubmit}
                  noValidate
                  className="space-y-4"
                >
                  {isEditingEmail ? (
                    <div>
                      <label
                        htmlFor={`${uid}-collect-email`}
                        className="block text-sm font-medium text-ink-900 mb-1"
                      >
                        Email Address <span className="text-sienna">*</span>
                      </label>
                      <p
                        id={`${uid}-collect-email-hint`}
                        className="text-xs text-ink-500 mb-2"
                      >
                        Format: you@example.com
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
                        disabled={isSubmittingEmail}
                        autoFocus
                        className="qc-input wb26-field-input"
                      />
                      {selectedWorker.email && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingEmail(false);
                            setEmailError("");
                          }}
                          className="mt-2 text-xs text-ink-600 hover:text-ink-900 underline underline-offset-2 cursor-pointer"
                        >
                          Use {selectedWorker.email} instead
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border border-ink-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <EnvelopeIcon className="h-5 w-5 text-sienna shrink-0" />
                        <span className="font-mono text-sm text-ink-900 truncate">
                          {selectedWorker.email}
                        </span>
                      </div>
                      {selectedWorker.emailEditable && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingEmail(true);
                            setEnteredEmail("");
                          }}
                          className="text-xs text-ink-600 hover:text-ink-900 underline underline-offset-2 cursor-pointer"
                        >
                          Change email
                        </button>
                      )}
                    </div>
                  )}

                  {emailError && (
                    <p className="text-xs text-brick font-medium" role="alert">
                      {emailError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingEmail}
                    className="qc-btn-primary w-full py-3 cursor-pointer"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    {isSubmittingEmail
                      ? "Saving email..."
                      : "Send Verification Code"}
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
                    Sending Code
                  </p>
                  <h2 className="text-xl font-semibold text-ink-900">
                    Emailing your 6-digit code...
                  </h2>
                  <p className="text-sm font-mono text-ink-600">
                    {selectedWorker?.email}
                  </p>
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
                  {selectedWorker.emailEditable && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingEmail(true);
                        setEnteredEmail("");
                        transitionTo("collectEmail", "backward");
                      }}
                      className="text-xs text-ink-600 hover:text-ink-900 underline underline-offset-2 cursor-pointer"
                    >
                      Use a different email
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="qc-eyebrow">Step 02 &middot; Verification</span>
                  <h2 className="text-xl font-semibold text-ink-900">
                    Enter the 6-digit code
                  </h2>
                  <p className="text-sm text-ink-500 leading-relaxed">
                    We sent it to{" "}
                    <strong className="text-ink-900 font-mono text-xs">
                      {otpDestination}
                    </strong>
                    . Check your spam folder if you don&rsquo;t see it.
                  </p>
                </div>

                {/* Single Semantic OTP Input (`sms-otp-form` guide) with 6 Visual Slots */}
                <form
                  ref={otpFormRef}
                  onSubmit={handleOtpFormSubmit}
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
                      Type or paste the code from your inbox.
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
                        disabled={isVerifyingOtp}
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
                        ? "Confirming..."
                        : "Confirm Registration"}
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isResendingOtp}
                      className="qc-btn-secondary py-3 px-4 text-xs font-mono cursor-pointer"
                    >
                      <ArrowPathIcon className="h-3.5 w-3.5" />
                      {isResendingOtp
                        ? "Sending..."
                        : resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : "Resend Code"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* ============================================================
                STAGE 2D: ALREADY REGISTERED (409)
               ============================================================ */}
            {stage === "alreadyRegistered" && selectedWorker && (
              <section className="wb26-panel qc-card p-6 sm:p-8 text-center space-y-4">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-forest" />
                <span className="block text-2xs font-mono uppercase tracking-tag text-forest font-semibold">
                  Already Registered
                </span>
                <h2 className="text-xl font-semibold text-ink-900">
                  {selectedWorker.firstName}, you&rsquo;re already on the list.
                </h2>
                <p className="text-sm text-ink-600 max-w-md mx-auto leading-relaxed">
                  Your Workers Ball 2026 pass (HGWB code and QR) was sent to
                  your email when you registered. Search your inbox for
                  &ldquo;Workers Ball&rdquo;.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => transitionTo("results", "backward")}
                    className="qc-btn-secondary py-2.5 px-4 text-sm cursor-pointer"
                  >
                    &larr; Back to results
                  </button>
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="qc-btn-primary py-2.5 px-4 text-sm cursor-pointer"
                  >
                    Register another worker
                  </button>
                </div>
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
                    Code Verified
                  </p>
                  <h2 className="text-xl font-semibold text-ink-900">
                    Issuing your Workers Ball 2026 pass...
                  </h2>
                  <p className="text-xs font-mono text-ink-500">
                    {accessCode ? `${accessCode} · ` : ""}Sending confirmation to{" "}
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
                    You&rsquo;re registered.
                    {accessCode ? (
                      <>
                        {" "}Your access code is{" "}
                        <strong className="font-mono qc-num text-ink-900">
                          {accessCode}
                        </strong>
                        .
                      </>
                    ) : (
                      " Your HGWB access code is in your email."
                    )}
                  </p>

                  {qrCode && (
                    <img
                      src={qrCode}
                      alt={`QR code for ${accessCode || "your Workers Ball pass"}`}
                      className="mx-auto h-40 w-40 rounded-md border border-ink-200 bg-white p-2"
                    />
                  )}

                  {/* Email Notification Notice */}
                  <div className="mt-4 rounded-md border border-ink-200 bg-cream px-4 py-3 flex items-center gap-3 text-left">
                    <EnvelopeIcon className="h-5 w-5 text-sienna shrink-0" />
                    <p className="text-xs text-ink-700 leading-relaxed">
                      We&rsquo;ve emailed your access code and QR code to{" "}
                      <strong className="text-ink-900 font-mono">
                        {profileForm.email}
                      </strong>
                      . Show it at the accreditation desk.
                    </p>
                  </div>
                </div>

                {/* Interactive 3D-Tilt Pass & Download (only when the API returned the code) */}
                {accessCode && (
                  <CeremonialPassCard
                    profile={profileForm}
                    accessCode={accessCode}
                    onDownload={handleDownloadPass}
                    onCopy={handleCopyAccessCode}
                    copied={codeCopied}
                  />
                )}

                {/* Start Over Footer Action */}
                <div className="flex items-center justify-end pt-2 text-xs text-ink-500">
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
