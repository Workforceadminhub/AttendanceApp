import { useCallback, useEffect, useRef, useState } from "react";

const DECADE_YEARS = [2023, 2024, 2025, 2026];

/**
 * Year-by-year archive of Workers Ball media (videos & photography).
 * Each item has dedicated, comfortable viewing time (3.5s per photo, full 10s for the video reel).
 * Interactive controls allow pause, play, next/prev slide, and jumping to any year.
 */
const YEAR_PHOTOS = {
  2023: [
    {
      type: "video",
      src: "/wb23/reel-1.mp4",
      poster: "/wb23/photo-1.webp",
      alt: "Harvesters Gbagada Workers Ball 2023 — Red Carpet Reel",
      label: "Red Carpet Reel",
      durationMs: 10000,
    },
    {
      type: "image",
      src: "/wb23/photo-1.webp",
      alt: "Harvesters Gbagada Workers Ball 2023 — All White Edition stage moment",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb23/photo-2.webp",
      alt: "Harvesters Gbagada Workers Ball 2023 — Workforce celebrating in all white",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb23/photo-3.webp",
      alt: "Harvesters Gbagada Workers Ball 2023 — Joyful laughter at the banquet table",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb23/photo-4.webp",
      alt: "Harvesters Gbagada Workers Ball 2023 — Applause in white",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb23/photo-5.webp",
      alt: "Harvesters Gbagada Workers Ball 2023 — Special Recognition Award presentation",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb23/photo-6.webp",
      alt: "Harvesters Gbagada Workers Ball 2023 — Workforce celebration in all white",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb23/photo-7.webp",
      alt: "Harvesters Gbagada Workers Ball 2023 — Red carpet arrivals and laughter",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb23/photo-8.webp",
      alt: "Harvesters Gbagada Workers Ball 2023 — Workers Ball 2023 stage celebration",
      durationMs: 3500,
    },
  ],
  2024: [
    {
      type: "video",
      src: "/wb24/reel-1.mp4",
      poster: "/wb24/photo-1.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Owambe Glitz & Glamour Celebration Reel",
      label: "Owambe Celebration Reel",
      durationMs: 10000,
    },
    {
      type: "image",
      src: "/wb24/photo-1.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Applause in gold and black agbada",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb24/photo-2.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Couple in white agbada and orange gown",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb24/photo-3.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Stage performance",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb24/photo-4.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Joyful celebration in blue and gold lace",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb24/photo-5.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Shimmering aso-oke portrait",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb24/photo-6.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Owambe glamour portrait in gold",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb24/photo-7.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Smiling worker celebration moment",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb24/photo-8.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Workforce celebration at the banquet",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb24/photo-9.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Glamorous agbada and lace portrait",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb24/photo-10.webp",
      alt: "Harvesters Gbagada Workers Ball 2024 — Elegance on the Workers Ball red carpet",
      durationMs: 3500,
    },
  ],
  2025: [
    {
      type: "video",
      src: "/wb25/reel-1.mp4",
      poster: "/wb25/photo-1.webp",
      alt: "Harvesters Gbagada Workers Ball 2025 — Denim & Diamonds Workers Ball Reel",
      label: "Workers Ball Reel",
      durationMs: 10000,
    },
    {
      type: "image",
      src: "/wb25/photo-1.webp",
      alt: "Harvesters Gbagada Workers Ball 2025 — Squad in Denim and Diamonds",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb25/photo-2.webp",
      alt: "Harvesters Gbagada Workers Ball 2025 — Red carpet portrait",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb25/photo-3.webp",
      alt: "Harvesters Gbagada Workers Ball 2025 — Family moment on the carpet",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb25/photo-4.webp",
      alt: "Harvesters Gbagada Workers Ball 2025 — Workforce fashion",
      durationMs: 3500,
    },
    {
      type: "image",
      src: "/wb25/photo-5.webp",
      alt: "Harvesters Gbagada Workers Ball 2025 — Worker portrait",
      durationMs: 3500,
    },
  ],
  2026: [
    {
      type: "image",
      src: "/wb26/official-flyer.jpg",
      alt: "Harvesters Gbagada Workers Ball 2026 — All Stars: Jersey and Jazz",
      label: "All Stars: Jersey & Jazz",
      durationMs: 7000,
    },
  ],
};

/**
 * Robust video renderer ensuring cross-browser muted autoplay and clean fallback.
 */
function ShowcaseVideo({ src, poster, isActive, label = "Workers Ball Reel" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;

    el.defaultMuted = true;
    el.muted = true;
    el.playsInline = true;

    if (!isActive) {
      el.pause();
      return undefined;
    }

    const controller = new AbortController();
    try {
      el.currentTime = 0;
    } catch {
      // Seeking before metadata loads throws in some browsers; playback still starts at 0.
    }
    el.play()?.catch(() => {
      if (controller.signal.aborted) return;
      // Autoplay was blocked: retry on the first interaction, released on cleanup.
      const retry = () => {
        controller.abort();
        el.play().catch(() => {});
      };
      const options = { signal: controller.signal };
      window.addEventListener("touchstart", retry, options);
      window.addEventListener("click", retry, options);
      window.addEventListener("keydown", retry, options);
    });
    return () => controller.abort();
  }, [isActive]);

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-black flex items-center justify-center">
      {/* Ambient background glow: fills widescreen displays with rich matching atmosphere */}
      <img
        src={poster}
        alt=""
        className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-40 pointer-events-none select-none"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/40 pointer-events-none" aria-hidden="true" />

      {/* Foreground video: displayed uncropped with object-contain so heads/awards are never cut off */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="relative z-10 max-h-[100dvh] max-w-[100vw] h-full w-auto object-contain mx-auto shadow-2xl drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
      />
      {/* Video Reel live indicator badge */}
      <div className="absolute top-20 left-5 sm:left-10 z-20 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-mono tracking-wider uppercase border border-white/20 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {label}
        </span>
      </div>
    </div>
  );
}

/**
 * Pre-Form Complete Full-Screen Opening Sequence ("Before the form even loads").
 * Edge-to-edge 100vw x 100dvh full-bleed canvas counting from 2023 -> 2026.
 * Shows ONE full-screen image/video at a time with generous, unhurried time per slide (3.5s / photo, 10s / video).
 * Includes interactive playback controls: Next/Prev, Pause/Play, and Year jump buttons.
 */
export default function IntroCurtain({ onEnter }) {
  const [yearIdx, setYearIdx] = useState(0); // 0 -> 2023, 1 -> 2024, 2 -> 2025, 3 -> 2026
  const [slideIdx, setSlideIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);

  const currentYear = DECADE_YEARS[yearIdx];
  const currentYearPhotos = YEAR_PHOTOS[currentYear] || [];
  const hasPhotosForYear = currentYearPhotos.length > 0;
  const currentItem = hasPhotosForYear ? currentYearPhotos[slideIdx] : null;

  // Warm only the slide after the current one; preloading every reel and photo cost ~10 MB on mount.
  useEffect(() => {
    const next = currentYearPhotos[slideIdx + 1] ?? (YEAR_PHOTOS[DECADE_YEARS[yearIdx + 1]] || [])[0];
    if (!next) return;
    const img = new Image();
    img.src = next.type === "video" ? next.poster : next.src;
  }, [currentYearPhotos, slideIdx, yearIdx]);

  const goToNextSlide = useCallback(() => {
    if (!hasPhotosForYear) {
      if (yearIdx + 1 < DECADE_YEARS.length) {
        setYearIdx((y) => y + 1);
        setSlideIdx(0);
        setSlideProgress(0);
      } else {
        onEnter();
      }
      return;
    }

    if (slideIdx + 1 < currentYearPhotos.length) {
      setSlideIdx((s) => s + 1);
      setSlideProgress(0);
    } else if (yearIdx + 1 < DECADE_YEARS.length) {
      setYearIdx((y) => y + 1);
      setSlideIdx(0);
      setSlideProgress(0);
    } else {
      onEnter();
    }
  }, [hasPhotosForYear, slideIdx, currentYearPhotos.length, yearIdx, onEnter]);

  const goToPrevSlide = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx((s) => s - 1);
      setSlideProgress(0);
    } else if (yearIdx > 0) {
      const prevYear = DECADE_YEARS[yearIdx - 1];
      const prevPhotos = YEAR_PHOTOS[prevYear] || [];
      setYearIdx((y) => y - 1);
      setSlideIdx(Math.max(0, prevPhotos.length - 1));
      setSlideProgress(0);
    }
  }, [slideIdx, yearIdx]);

  const goToYear = useCallback((targetYearIdx) => {
    setYearIdx(targetYearIdx);
    setSlideIdx(0);
    setSlideProgress(0);
  }, []);

  // Keyboard navigation: Left/Right arrows and Space to pause/play
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        goToNextSlide();
      } else if (e.key === "ArrowLeft") {
        goToPrevSlide();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextSlide, goToPrevSlide]);

  const progressRef = useRef(0);

  // Slide playback timer with smooth progress updates
  useEffect(() => {
    progressRef.current = 0;

    if (currentYear === 2026) {
      const timer = setTimeout(() => {
        onEnter();
      }, 2400);
      return () => clearTimeout(timer);
    }

    if (!currentItem) return;

    const duration =
      currentItem.durationMs ||
      (currentItem.type === "video" ? 10000 : 3500);

    let start = performance.now();
    let animId;

    const step = (now) => {
      if (isPaused) {
        start = now - progressRef.current * duration;
        animId = requestAnimationFrame(step);
        return;
      }

      const elapsed = now - start;
      const progress = Math.min(1, Math.max(0, elapsed / duration));
      progressRef.current = progress;
      setSlideProgress(progress);

      if (progress >= 1) {
        goToNextSlide();
      } else {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [currentYear, currentItem, isPaused, goToNextSlide, onEnter]);

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
      {/* TRUE 100% FULL-SCREEN SINGLE-SLIDE/VIDEO SHOWCASE (2023, 2024, 2025) */}
      {hasPhotosForYear && (
        <div
          key={`media-stage-${currentYear}`}
          className="absolute inset-0 w-screen h-dvh bg-ink-900 overflow-hidden"
        >
          {currentYearPhotos.map((item, idx) => {
            const isActive = idx === slideIdx;
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
                  <ShowcaseVideo
                    src={item.src}
                    poster={item.poster}
                    isActive={isActive}
                    label={item.label || "Workers Ball Reel"}
                  />
                ) : (
                  <div className="relative w-screen h-dvh overflow-hidden bg-black flex items-center justify-center">
                    {/* Ambient blurred backdrop: fills widescreen viewports with the photo's matching tones */}
                    <img
                      src={item.src}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-40 pointer-events-none select-none"
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-black/40 pointer-events-none" aria-hidden="true" />

                    {/* Uncropped foreground photo: full head-to-toe view */}
                    <img
                      src={item.src}
                      alt={item.alt}
                      style={{
                        transform: isActive ? "scale(1.03)" : "scale(1.0)",
                        transition:
                          "transform 4000ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                      className="relative z-10 max-h-[100dvh] max-w-[100vw] h-full w-auto object-contain mx-auto shadow-2xl drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Previous / Next side navigation chevrons */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevSlide();
            }}
            aria-label="Previous photo"
            className="pointer-events-auto absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-black/45 hover:bg-black/75 text-white/80 hover:text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-2xl"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToNextSlide();
            }}
            aria-label="Next photo"
            className="pointer-events-auto absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-black/45 hover:bg-black/75 text-white/80 hover:text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-2xl"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

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

      {/* Full-Viewport Cream Editorial Canvas (for 2026 finale) */}
      {!hasPhotosForYear && (
        <div className="absolute inset-0 w-screen h-dvh bg-cream flex flex-col items-center justify-center px-6">
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            aria-hidden="true"
          >
            <span
              key={`wm-${currentYear}`}
              className="wb26-year-tick font-mono qc-num font-bold text-[30vw] leading-none tracking-tighter text-ink-900/[0.06]"
            >
              {currentYear}
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
                key={currentYear}
                className="wb26-year-tick inline-block qc-num font-mono font-bold text-sienna"
              >
                {currentYear}
              </span>
            </h1>
          </div>
        </div>
      )}

      {/* Top Bar: Transparent Official Logo (Top-Left) + Pause & Skip Controls (Top-Right) */}
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

        <div className="flex items-center gap-2 pointer-events-auto">
          {hasPhotosForYear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused((p) => !p);
              }}
              className="px-3.5 py-2 rounded-full text-xs font-mono uppercase tracking-tag transition-colors cursor-pointer flex items-center gap-1.5 bg-black/45 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-md"
              title={isPaused ? "Resume slideshow (Space)" : "Pause slideshow (Space)"}
            >
              {isPaused ? (
                <>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Play</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                  <span>Pause</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onEnter}
            className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-tag transition-colors cursor-pointer ${
              hasPhotosForYear
                ? "bg-cream/95 text-ink-900 hover:bg-cream shadow-sheet"
                : "bg-ink-900/10 text-ink-800 hover:bg-ink-900/15 hover:text-ink-900"
            }`}
          >
            Skip Intro &rarr;
          </button>
        </div>
      </div>

      {/* Bottom Full-Width Overlay: Year Title + Story-Style Progress Pills + Decade Timeline Strip */}
      <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-5 sm:px-10 sm:pb-8 pointer-events-none">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          {hasPhotosForYear && (
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-white leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.75)]">
                  Workers Ball{" "}
                  <span
                    key={currentYear}
                    className="wb26-year-tick inline-block qc-num font-mono font-bold text-[#F6B042]"
                  >
                    {currentYear}
                  </span>
                </h1>
                {currentYear === 2026 && (
                  <p className="mt-2 text-sm sm:text-base font-medium text-[#F6B042] tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
                    All Stars: Jersey &amp; Jazz &middot; Sunday 29th Nov &middot; 3PM
                  </p>
                )}
              </div>

              {/* Story-style individual slide progress pills */}
              <div className="flex items-center gap-1.5 sm:pb-2 pointer-events-auto">
                {currentYearPhotos.map((item, idx) => {
                  const isCurrent = idx === slideIdx;
                  const isDone = idx < slideIdx;
                  const fillPct = isDone
                    ? 100
                    : isCurrent
                      ? Math.round(slideProgress * 100)
                      : 0;
                  return (
                    <button
                      key={item.src}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSlideIdx(idx);
                        setSlideProgress(0);
                      }}
                      className="h-2 rounded-full overflow-hidden bg-white/25 hover:bg-white/45 transition-all cursor-pointer relative"
                      style={{ width: isCurrent ? "2.5rem" : "1.25rem" }}
                      title={`Photo ${idx + 1} of ${currentYearPhotos.length}`}
                    >
                      <div
                        className="h-full bg-[#F6B042] transition-none"
                        style={{ width: `${fillPct}%` }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Decade Timeline Strip (2023 -> 2026) with clickable year buttons */}
          <div
            className={`w-full px-4 py-2.5 rounded-2xl transition-colors duration-500 pointer-events-auto ${
              hasPhotosForYear
                ? "bg-black/55 backdrop-blur-md border border-white/15 shadow-xl"
                : "bg-cream/90 border border-ink-200/70"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              {DECADE_YEARS.map((yr, idx) => {
                const reached = yearIdx >= idx;
                const isCurrent = yearIdx === idx;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToYear(idx);
                    }}
                    className="flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-transform hover:scale-105"
                    title={`Jump to ${yr}`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
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
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
