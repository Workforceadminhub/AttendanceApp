import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  QrCodeIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  UserCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { scanWorkersBallPass } from "../services/workersBall";
import { getUser } from "../utils/getUser";
import { getUserRole } from "../utils/getUserRole";

/**
 * Lightweight browser audio feedback synthesized via Web Audio API.
 * Ensures zero asset load latency and offline reliability.
 */
function playAudioFeedback(type = "success") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "success") {
      // Ascending C5 -> G5 chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === "warning") {
      // Warning double tone (A4 -> F4)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(349.23, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    } else {
      // Error buzz (Low sawtooth)
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch {
    // Non-blocking fallback
  }

  // Device haptic vibration if supported
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      if (type === "success") navigator.vibrate([70, 40, 70]);
      else if (type === "warning") navigator.vibrate([150, 60, 150]);
      else navigator.vibrate([220]);
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Main Page Component: Workers Ball 2026 Accreditation Scanner (`/scan/wb26` & `/workers-ball/scan`)
 */
export default function WorkersBallScanner() {
  const navigate = useNavigate();
  const location = useLocation();

  const authUser = getUser();
  const { isSuperAdmin, isChurchAdmin } = getUserRole(authUser);
  const isSuperAdminOrChurchAdmin = Boolean(
    isSuperAdmin ||
      isChurchAdmin ||
      authUser?.permissionLevel === "SUPER_ADMIN" ||
      authUser?.permissionLevel === "CHURCH_ADMIN" ||
      authUser?.department === "Super Admin"
  );
  const isLoggedIn = Boolean(authUser);

  const backHref =
    location.state?.from ||
    (isSuperAdminOrChurchAdmin
      ? "/admin/workers-ball-registrations"
      : isLoggedIn
        ? "/attendance/dashboard"
        : "/wb26");

  const backTitle = isSuperAdminOrChurchAdmin
    ? "Return to Workers Ball Tracking Dashboard"
    : isLoggedIn
      ? "Return to Dashboard"
      : "Return to Workers Ball Registration";

  const handleBack = (e) => {
    e.preventDefault();
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      window.history.state?.idx > 0
    ) {
      navigate(-1);
      return;
    }
    navigate(backHref);
  };

  const [activeTab, setActiveTab] = useState("camera"); // "camera" | "manual"
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraFacing, setCameraFacing] = useState("environment"); // "environment" | "user"
  const [cameraRetryCount, setCameraRetryCount] = useState(0);

  // Live scan result state
  const [lastScanResult, setLastScanResult] = useState(null);
  // { success: bool, attended: bool, alreadyAttended: bool, code: string, name: string, time: string, message: string }

  // Session history list
  const [history, setHistory] = useState([]);

  // Browser tab title for accreditation desk
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prevTitle = document.title;
    document.title = "Accreditation Scanner · Workers Ball 2026";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Camera video and canvas refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastScannedCodeRef = useRef("");
  const lastScannedTimeRef = useRef(0);
  const manualInputRef = useRef(null);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Process a scanned or typed code
  const handleProcessScan = useCallback(
    async (rawCode) => {
      const trimmed = String(rawCode || "").trim();
      if (!trimmed || isScanningRef.current) return;

      isScanningRef.current = true;
      setIsScanning(true);

      try {
        const result = await scanWorkersBallPass(trimmed);
        const timeStr = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const scanData = {
          success: true,
          attended: result.attended,
          alreadyAttended: result.alreadyAttended,
          code: result.code,
          name: result.name || "Accredited Worker",
          department: result.department,
          team: result.team,
          role: result.role,
          message: result.message,
          time: timeStr,
        };

        setLastScanResult(scanData);
        setHistory((prev) => [scanData, ...prev.slice(0, 49)]);

        if (soundEnabled) {
          playAudioFeedback(result.alreadyAttended ? "warning" : "success");
        }
      } catch (err) {
        const timeStr = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const errorData = {
          success: false,
          attended: false,
          alreadyAttended: false,
          code: trimmed.toUpperCase(),
          name: "",
          message: err?.message || "Invalid or unrecognized pass code.",
          time: timeStr,
        };

        setLastScanResult(errorData);
        if (soundEnabled) {
          playAudioFeedback("error");
        }
      } finally {
        isScanningRef.current = false;
        setIsScanning(false);
        setManualCode("");
      }
    },
    [soundEnabled]
  );

  // Manual Check-In form submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim() || isScanning) return;
    handleProcessScan(manualCode);
  };

  // Immediate "Scan Next" action to clear previous result
  const handleScanNext = () => {
    lastScannedCodeRef.current = "";
    lastScannedTimeRef.current = 0;
    setLastScanResult(null);
    if (activeTab === "manual" && manualInputRef.current) {
      manualInputRef.current.focus();
    }
  };

  // Manage camera lifecycle and frame QR detection via effect
  useEffect(() => {
    let active = true;

    if (activeTab !== "camera") {
      stopCamera();
      return () => stopCamera();
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => {
        if (active) {
          setCameraError("Camera access is not supported by this browser.");
        }
      });
      return () => stopCamera();
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      .then(async (stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play().catch(() => {});
        }
        setCameraError("");

        const jsQRModule = await import("jsqr");
        const jsQR = jsQRModule.default || jsQRModule;
        const canvas = document.createElement("canvas");
        const canvasCtx = canvas.getContext("2d", { willReadFrequently: true });

        const scanFrame = () => {
          if (!active) return;
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(scanFrame);
            return;
          }
          const video = videoRef.current;
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (width > 0 && height > 0) {
            canvas.width = width;
            canvas.height = height;
            canvasCtx.drawImage(video, 0, 0, width, height);
            const imageData = canvasCtx.getImageData(0, 0, width, height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
            if (qrCode?.data && !isScanningRef.current) {
              const now = Date.now();
              if (
                qrCode.data !== lastScannedCodeRef.current ||
                now - lastScannedTimeRef.current > 3000
              ) {
                lastScannedCodeRef.current = qrCode.data;
                lastScannedTimeRef.current = now;
                handleProcessScan(qrCode.data);
              }
            }
          }
          animFrameRef.current = requestAnimationFrame(scanFrame);
        };
        animFrameRef.current = requestAnimationFrame(scanFrame);
      })
      .catch((err) => {
        if (!active) return;
        setCameraError(
          err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
            ? "Camera permission denied. Please allow camera access in your browser settings, or use manual entry below."
            : "Could not start camera feed. Please verify camera availability."
        );
      });

    return () => {
      active = false;
      stopCamera();
    };
  }, [activeTab, cameraFacing, cameraRetryCount, handleProcessScan, stopCamera]);

  // Global barcode scanner gun listener (hardware wedges send keydown events ending in Enter)
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Don't capture when user is typing in a text field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const now = Date.now();
      // Hardware scanner guns type characters rapidly (< 50ms apart)
      if (now - lastKeyTime > 120) {
        buffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (buffer.length >= 4) {
          e.preventDefault();
          handleProcessScan(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleProcessScan]);

  const uniqueAttendeesCount = history.filter(
    (h) => h.success && !h.alreadyAttended
  ).length;

  return (
    <div className="min-h-screen bg-cream flex flex-col relative overflow-x-hidden selection:bg-sienna selection:text-cream">
      {/* Background Architectural Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 -right-32 opacity-30"
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

      {/* Top Accreditation Bar */}
      <header className="border-b border-ink-200 bg-cream/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={backHref}
              onClick={handleBack}
              className="p-1.5 -ml-1.5 rounded-lg text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition"
              title={backTitle}
              aria-label={backTitle}
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <img
              src="/logo.jpg"
              alt="Harvesters"
              className="h-10 w-auto select-none mix-blend-multiply shrink-0"
            />
            <span className="hidden sm:inline-block h-4 w-px bg-ink-200" />
            <div className="min-w-0">
              <span className="block text-xs font-mono uppercase tracking-tag text-ink-900 font-semibold truncate">
                Accreditation Scanner
              </span>
              <span className="hidden sm:block text-2xs font-mono text-ink-500">
                Workers Ball 2026 &middot; Gbagada
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Station Indicator */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/15 border border-forest/30 px-2.5 py-1 text-2xs font-mono uppercase tracking-tag text-forest-dark font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-forest animate-live-pulse" />
              Live Desk
            </span>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-2 rounded-lg border border-ink-200 bg-white text-ink-600 hover:text-ink-900 hover:bg-cream transition cursor-pointer"
              title={soundEnabled ? "Mute check-in sound" : "Enable check-in sound"}
              aria-label={soundEnabled ? "Mute audio" : "Enable audio"}
            >
              {soundEnabled ? (
                <SpeakerWaveIcon className="h-4 w-4 text-forest" />
              ) : (
                <SpeakerXMarkIcon className="h-4 w-4 text-ink-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Scanner Container */}
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 relative z-10 max-w-4xl mx-auto w-full">
        {/* Mode Selector & Quick Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="inline-flex rounded-lg bg-ink-100 p-1 border border-ink-200 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("camera")}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-mono uppercase tracking-tag transition cursor-pointer ${
                activeTab === "camera"
                  ? "bg-ink-900 text-cream font-semibold shadow-xs"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              <CameraIcon className="h-4 w-4" />
              Camera QR
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-mono uppercase tracking-tag transition cursor-pointer ${
                activeTab === "manual"
                  ? "bg-ink-900 text-cream font-semibold shadow-xs"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              <QrCodeIcon className="h-4 w-4" />
              Code Entry / Gun
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-ink-600">
            <span>
              Accredited this session:{" "}
              <strong className="text-ink-900 font-semibold text-sm qc-num">
                {uniqueAttendeesCount}
              </strong>
            </span>
          </div>
        </div>

        {/* Hero Scan Result Card (Shown immediately upon scanning) */}
        {lastScanResult && (
          <div
            role="region"
            aria-live="polite"
            className={`mb-6 rounded-xl border p-5 sm:p-6 transition-all duration-300 ${
              lastScanResult.success && !lastScanResult.alreadyAttended
                ? "bg-forest/10 border-forest/40 text-ink-900 shadow-md"
                : lastScanResult.alreadyAttended
                  ? "bg-amber-500/10 border-amber-500/40 text-ink-900 shadow-md"
                  : "bg-crimson/10 border-crimson/40 text-ink-900 shadow-md"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                {lastScanResult.success && !lastScanResult.alreadyAttended ? (
                  <div className="rounded-full bg-forest p-2 text-cream shrink-0">
                    <CheckCircleIcon className="h-7 w-7" />
                  </div>
                ) : lastScanResult.alreadyAttended ? (
                  <div className="rounded-full bg-amber-500 p-2 text-cream shrink-0">
                    <ExclamationTriangleIcon className="h-7 w-7" />
                  </div>
                ) : (
                  <div className="rounded-full bg-crimson p-2 text-cream shrink-0">
                    <XCircleIcon className="h-7 w-7" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-2xs font-mono uppercase tracking-tag font-semibold px-2 py-0.5 rounded ${
                        lastScanResult.success && !lastScanResult.alreadyAttended
                          ? "bg-forest/20 text-forest-dark"
                          : lastScanResult.alreadyAttended
                            ? "bg-amber-500/20 text-amber-800"
                            : "bg-crimson/20 text-crimson"
                      }`}
                    >
                      {lastScanResult.success && !lastScanResult.alreadyAttended
                        ? "Check-In Confirmed"
                        : lastScanResult.alreadyAttended
                          ? "Already Attended"
                          : "Verification Failed"}
                    </span>
                    <span className="text-2xs font-mono text-ink-500">
                      {lastScanResult.time}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-ink-900 mt-1 truncate">
                    {lastScanResult.name || lastScanResult.code}
                  </h3>

                  {lastScanResult.alreadyAttended ? (
                    <p className="text-sm text-amber-800 mt-1 font-medium">
                      Already attended &mdash; this pass was already scanned and checked in.
                    </p>
                  ) : lastScanResult.success ? (
                    <p className="text-sm text-forest-dark mt-1 font-medium">
                      Welcome to Workers Ball 2026! Accreditation successful.
                    </p>
                  ) : (
                    <p className="text-sm text-crimson mt-1 font-medium">
                      {lastScanResult.message}
                    </p>
                  )}

                  {(lastScanResult.department || lastScanResult.team) && (
                    <p className="text-xs text-ink-600 mt-1.5 font-mono">
                      {lastScanResult.department}
                      {lastScanResult.team ? ` · ${lastScanResult.team}` : ""}
                      {lastScanResult.role ? ` · ${lastScanResult.role}` : ""}
                    </p>
                  )}

                  <p className="text-xs font-mono text-ink-500 mt-1">
                    Pass Code:{" "}
                    <span className="font-semibold text-ink-900 qc-num">
                      {lastScanResult.code}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleScanNext}
                className="qc-btn-secondary py-1.5 px-3 text-xs font-mono shrink-0 cursor-pointer"
              >
                Scan Next
              </button>
            </div>
          </div>
        )}

        {/* Viewfinder or Manual Mode Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Main Viewfinder / Input */}
          <div className="md:col-span-2 space-y-4">
            {activeTab === "camera" ? (
              <div className="qc-card overflow-hidden bg-ink-900 border-ink-800 p-0 relative">
                {/* Camera Viewfinder View */}
                <div className="relative aspect-4/3 w-full bg-black overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                  />

                  {/* Targeting Reticle Overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative w-64 h-64 border-2 border-sienna/80 rounded-2xl shadow-[0_0_0_9999px_rgba(10,14,26,0.65)]">
                      {/* Corner Target Markers */}
                      <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-sienna rounded-tl-lg" />
                      <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-sienna rounded-tr-lg" />
                      <span className="absolute -bottom-1 -left-1 w-6 h-6 border-bottom-4 border-l-4 border-sienna rounded-bl-lg" />
                      <span className="absolute -bottom-1 -right-1 w-6 h-6 border-bottom-4 border-r-4 border-sienna rounded-br-lg" />

                      {/* Animated Radar Sweep Line */}
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-sienna to-transparent shadow-[0_0_12px_#B5471F] wb26-radar-bar" />
                    </div>
                  </div>

                  {/* Processing Badge */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-xs flex items-center justify-center z-20">
                      <div className="rounded-xl bg-ink-900 border border-ink-700 px-5 py-3 flex items-center gap-3 text-cream shadow-pop">
                        <ArrowPathIcon className="h-5 w-5 animate-spin text-sienna" />
                        <span className="text-xs font-mono font-medium">
                          Verifying pass...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Camera Error Message */}
                  {cameraError && (
                    <div className="absolute inset-0 p-6 bg-ink-900/90 text-center flex flex-col items-center justify-center text-cream z-20">
                      <ExclamationTriangleIcon className="h-10 w-10 text-sienna mb-2" />
                      <p className="text-sm font-medium max-w-sm mb-4">
                        {cameraError}
                      </p>
                      <button
                        type="button"
                        onClick={() => setCameraRetryCount((c) => c + 1)}
                        className="qc-btn-secondary min-h-0 py-2 px-4 text-xs font-mono"
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Viewfinder Controls Footer */}
                <div className="p-3 bg-ink-950 border-t border-ink-800 flex items-center justify-between text-xs font-mono text-ink-300">
                  <span className="flex items-center gap-1.5 text-2xs text-ink-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest animate-live-pulse" />
                    Point lens at Worker&rsquo;s QR Code
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCameraFacing((prev) =>
                        prev === "environment" ? "user" : "environment"
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-2xs text-ink-200 hover:text-cream transition cursor-pointer"
                  >
                    <ArrowPathIcon className="h-3.5 w-3.5" />
                    Flip Camera ({cameraFacing === "environment" ? "Back" : "Front"})
                  </button>
                </div>
              </div>
            ) : (
              /* Manual Input / Scanner Gun View */
              <div className="qc-card p-6 sm:p-7 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-ink-900 tracking-tight">
                    Barcode Gun &amp; Manual Accreditation
                  </h2>
                  <p className="text-xs text-ink-500 mt-1">
                    USB/Bluetooth scanner guns type directly into this station. You can also manually type an access code.
                  </p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="manual-pass-input"
                      className="block text-xs font-mono uppercase tracking-tag text-ink-700 font-semibold mb-1.5"
                    >
                      Workers Ball Access Code
                    </label>
                    <div className="relative">
                      <input
                        ref={manualInputRef}
                        id="manual-pass-input"
                        type="text"
                        placeholder="HGWB-XXXXXX"
                        autoFocus
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        disabled={isScanning}
                        className="qc-input font-mono uppercase text-lg tracking-wider"
                      />
                    </div>
                    <p className="text-2xs font-mono text-ink-400 mt-1">
                      Format: HGWB-XXXXXX (or full ticket URL)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!manualCode.trim() || isScanning}
                    className="qc-btn-primary w-full py-3 cursor-pointer text-sm font-mono"
                  >
                    {isScanning ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Checking In...
                      </>
                    ) : (
                      "Check In Worker"
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Col: Live Session History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-mono uppercase tracking-tag text-ink-500 font-semibold flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5" />
                Recent Scans ({history.length})
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-2xs font-mono text-ink-400 hover:text-ink-700 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="qc-card p-3 divide-y divide-ink-100 max-h-[460px] overflow-y-auto">
              {history.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-400 font-mono">
                  No passes scanned yet in this session.
                </div>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} className="py-2.5 first:pt-1 last:pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-900 truncate flex items-center gap-1.5">
                          <UserCircleIcon className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </p>
                        <p className="text-2xs font-mono text-ink-500 qc-num mt-0.5">
                          {item.code}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block text-[10px] font-mono uppercase tracking-tag px-1.5 py-0.5 rounded ${
                            item.success && !item.alreadyAttended
                              ? "bg-forest/20 text-forest-dark"
                              : item.alreadyAttended
                                ? "bg-amber-500/20 text-amber-800"
                                : "bg-crimson/20 text-crimson"
                          }`}
                        >
                          {item.alreadyAttended
                            ? "Already In"
                            : item.success
                              ? "Attended"
                              : "Failed"}
                        </span>
                        <p className="text-[10px] font-mono text-ink-400 mt-0.5">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-200 py-4 px-4 text-center text-xs text-ink-500 font-mono relative z-10 bg-cream">
        Harvesters Gbagada &middot; Workers Ball 2026 Accreditation Desk
      </footer>
    </div>
  );
}
