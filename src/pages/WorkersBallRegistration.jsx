import { useEffect, useId, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  CheckCircleIcon,
  EnvelopeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { downloadWorkersBallPassPng } from "../utils/workersBallPass";
import { applyPageMeta, resolvePageMeta } from "../utils/pageMeta";
import {
  confirmWorkersBallRegistration,
  decodeQrCodeDataUrl,
  requestWorkersBallOtp,
  searchWorkersBall,
  updateWorkersBallEmail,
} from "../services/workersBall";
import { runStageTransition, UserInvalidFallback } from "../components/workersBall/stageTransition";
import WorkersBallCrest from "../components/workersBall/WorkersBallCrest";
import IntroCurtain from "../components/workersBall/IntroCurtain";
import SearchStage from "../components/workersBall/SearchStage";
import ResultsStage from "../components/workersBall/ResultsStage";
import CollectEmailStage from "../components/workersBall/CollectEmailStage";
import VerifyOtpStage from "../components/workersBall/VerifyOtpStage";
import ConfirmedStage from "../components/workersBall/ConfirmedStage";

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

  // Set dynamic browser tab title and OG metadata based on registration stage
  useEffect(() => {
    if (typeof document === "undefined") return;
    let title = "Workers Ball 2026 · Harvesters Gbagada";
    if (stage === "confirmed") {
      title = profileForm.firstName
        ? `Gala Pass: ${profileForm.firstName} · Workers Ball 2026`
        : "Your Gala Pass is Ready · Workers Ball 2026";
    } else if (stage === "alreadyRegistered") {
      title = "Already Registered · Workers Ball 2026";
    } else if (stage === "verifyOtp" || stage === "sendingOtp") {
      title = "Verify Identity · Workers Ball 2026";
    }
    const baseMeta = resolvePageMeta("/wb26");
    applyPageMeta({ ...baseMeta, title, ogTitle: title }, "/wb26");
  }, [stage, profileForm.firstName]);

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
      const code =
        result.accessCode ||
        `HGWB-${String(selectedWorker.id).padStart(6, "0")}`;
      setAccessCode(code);
      setQrCode(result.qrCode || null);
      setSelectedWorker((prev) =>
        prev
          ? {
              ...prev,
              registered: true,
              ...(result.role ? { role: result.role } : {}),
            }
          : prev
      );

      // Asynchronously attempt to decode the true access code from the QR code data URL
      if (result.qrCode && typeof decodeQrCodeDataUrl === "function") {
        decodeQrCodeDataUrl(result.qrCode)
          .then((decoded) => {
            if (decoded && /^HGWB-[A-Z0-9]+$/i.test(decoded.trim())) {
              setAccessCode(decoded.trim().toUpperCase());
            }
          })
          .catch(() => {});
      }

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

  const effectiveAccessCode =
    accessCode ||
    (selectedWorker?.id
      ? `HGWB-${String(selectedWorker.id).padStart(6, "0")}`
      : "HGWB-2026");

  const handleCopyAccessCode = async () => {
    const codeToCopy = effectiveAccessCode;
    if (!codeToCopy) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCodeCopied(true);
      toast.success("Workers Ball access code copied!");
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error("Could not copy code.");
    }
  };

  const handleDownloadPass = async () => {
    try {
      await downloadWorkersBallPassPng({
        ...profileForm,
        accessCode: effectiveAccessCode,
        qrCode,
      });
      toast.success("Downloading your Workers Ball 2026 Pass...");
    } catch {
      toast.error("Could not generate pass download.");
    }
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
                        : "Registration Temporarily Paused"}
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

          {/* View-Transition Stage Wrapper */}
          <div className="wb26-transition-stage">
            {/* ============================================================
                STAGE 1A: REGISTRATION PAUSED / BACK UP SOON (SEARCH REMOVED)
               ============================================================ */}
            <SearchStage
              stage={stage}
            />

            {/* ============================================================
                STAGE 1B: SEARCH RESULTS (STAGGERED CASCADE)
               ============================================================ */}
            <ResultsStage
              stage={stage}
              transitionTo={transitionTo}
              searchResults={searchResults}
              lastSearchedQuery={lastSearchedQuery}
              executeSearch={executeSearch}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isSearching={isSearching}
              handleSelectWorker={handleSelectWorker}
            />

            {/* ============================================================
                STAGE 2A: CONFIRM OR UPDATE EMAIL, THEN SEND OTP
               ============================================================ */}
            <CollectEmailStage
              stage={stage}
              selectedWorker={selectedWorker}
              transitionTo={transitionTo}
              isEditingEmail={isEditingEmail}
              emailFormRef={emailFormRef}
              handleEmailSubmit={handleEmailSubmit}
              uid={uid}
              enteredEmail={enteredEmail}
              setEnteredEmail={setEnteredEmail}
              setEmailError={setEmailError}
              isSubmittingEmail={isSubmittingEmail}
              setIsEditingEmail={setIsEditingEmail}
              emailError={emailError}
            />

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
            <VerifyOtpStage
              stage={stage}
              selectedWorker={selectedWorker}
              transitionTo={transitionTo}
              setIsEditingEmail={setIsEditingEmail}
              setEnteredEmail={setEnteredEmail}
              otpDestination={otpDestination}
              otpFormRef={otpFormRef}
              handleOtpFormSubmit={handleOtpFormSubmit}
              uid={uid}
              otpShake={otpShake}
              otpValue={otpValue}
              otpInputRef={otpInputRef}
              isVerifyingOtp={isVerifyingOtp}
              setOtpValue={setOtpValue}
              setOtpError={setOtpError}
              verifyOtpCode={verifyOtpCode}
              otpError={otpError}
              handleResendOtp={handleResendOtp}
              resendCooldown={resendCooldown}
              isResendingOtp={isResendingOtp}
            />

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
            <ConfirmedStage
              stage={stage}
              profileForm={profileForm}
              effectiveAccessCode={effectiveAccessCode}
              qrCode={qrCode}
              handleDownloadPass={handleDownloadPass}
              handleCopyAccessCode={handleCopyAccessCode}
              codeCopied={codeCopied}
              handleStartOver={handleStartOver}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-200 py-5 px-5 sm:px-8 text-center text-xs text-ink-500 relative z-10 bg-cream">
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <span>
            Harvesters International Christian Centre, Gbagada Campus &middot; Workers Ball 2026
          </span>
        </div>
      </footer>
    </div>
  );
}
