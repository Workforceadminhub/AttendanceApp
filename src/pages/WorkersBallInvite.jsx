import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import SuccessMark from "../components/ui/SuccessMark";
import { downloadWorkersBallPassPng } from "../utils/workersBallPass";
import { applyPageMeta, resolvePageMeta } from "../utils/pageMeta";
import {
  confirmWorkersBallInvite,
  decodeQrCodeDataUrl,
  fetchWorkersBallInvite,
} from "../services/workersBall";
import {
  CeremonialPassCard,
  WorkersBallCrest,
} from "./WorkersBallRegistration";

export default function WorkersBallInvite() {
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("token") || paramToken || "").trim();

  // Stages: "loading" | "ready" | "confirming" | "confirmed" | "alreadyConfirmed" | "error"
  const [stage, setStage] = useState(token ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "This invitation link is missing a valid invite token."
  );

  const [worker, setWorker] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const confirmingRef = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    let title = "Workers Ball 2026 Invitation · Harvesters Gbagada";
    if (stage === "confirmed") {
      title = worker?.firstName
        ? `Gala Pass: ${worker.firstName} · Workers Ball 2026`
        : "Your Gala Pass is Ready · Workers Ball 2026";
    } else if (stage === "alreadyConfirmed") {
      title = "Invitation Confirmed · Workers Ball 2026";
    }
    const baseMeta = resolvePageMeta("/workers-ball/invite");
    applyPageMeta({ ...baseMeta, title, ogTitle: title }, "/workers-ball/invite");
  }, [stage, worker?.firstName]);

  useEffect(() => {
    if (!token) {
      setStage("error");
      setErrorMessage("This invitation link is missing a valid invite token.");
      return;
    }

    let cancelled = false;
    setStage("loading");
    setErrorMessage("");

    fetchWorkersBallInvite(token)
      .then((inviteData) => {
        if (cancelled) return;
        setWorker(inviteData);
        if (inviteData.code) {
          setAccessCode(inviteData.code);
        }
        if (inviteData.qrCode) {
          setQrCode(inviteData.qrCode);
        }

        if (inviteData.confirmed || inviteData.registered) {
          setStage(inviteData.code ? "confirmed" : "alreadyConfirmed");
        } else {
          setStage("ready");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 409 || /already\s+(confirmed|registered)/i.test(err?.message || "")) {
          setStage("alreadyConfirmed");
          return;
        }
        setErrorMessage(
          err?.message ||
            "We could not load this Workers Ball invitation. The link may have expired or already been used."
        );
        setStage("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleConfirmInvite = async () => {
    if (confirmingRef.current || !token) return;
    confirmingRef.current = true;
    setStage("confirming");

    try {
      const result = await confirmWorkersBallInvite(token);
      const nextCode =
        result.accessCode ||
        worker?.code ||
        (worker?.id ? `HGWB-${String(worker.id).padStart(6, "0")}` : "HGWB-2026");

      setAccessCode(nextCode);
      if (result.qrCode) {
        setQrCode(result.qrCode);
      }
      setWorker((prev) => ({
        ...(prev || {}),
        ...(result.worker || {}),
        id: result.worker?.id ?? prev?.id,
        name: result.worker?.name || prev?.name || "",
        firstName: result.worker?.firstName || prev?.firstName || "",
        lastName: result.worker?.lastName || prev?.lastName || "",
        phone: result.worker?.phone || prev?.phone || "",
        email: result.worker?.email || prev?.email || "",
        team: result.worker?.team || prev?.team || "",
        department: result.worker?.department || prev?.department || "",
        role: result.role || result.worker?.role || prev?.role || "Worker",
        registered: true,
        confirmed: true,
      }));

      if (result.qrCode && typeof decodeQrCodeDataUrl === "function") {
        decodeQrCodeDataUrl(result.qrCode)
          .then((decoded) => {
            if (decoded && /^HGWB-[A-Z0-9]+$/i.test(decoded.trim())) {
              setAccessCode(decoded.trim().toUpperCase());
            }
          })
          .catch(() => {});
      }

      setStage("confirmed");
      if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      if (err?.status === 409 || /already\s+(confirmed|registered)/i.test(err?.message || "")) {
        setStage("alreadyConfirmed");
        return;
      }
      toast.error(
        err?.message || "We couldn't confirm your invitation. Please try again."
      );
      setStage("ready");
    } finally {
      confirmingRef.current = false;
    }
  };

  const profileForm = {
    firstName: worker?.firstName || "",
    lastName: worker?.lastName || "",
    phone: worker?.phone || "",
    email: worker?.email || "",
    role: worker?.role || "Worker",
    team: worker?.team || "",
    department: worker?.department || "",
  };

  const effectiveAccessCode =
    accessCode ||
    worker?.code ||
    (worker?.id ? `HGWB-${String(worker.id).padStart(6, "0")}` : "HGWB-2026");

  const handleCopyAccessCode = async () => {
    if (!effectiveAccessCode) return;
    try {
      await navigator.clipboard.writeText(effectiveAccessCode);
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

      {/* Header */}
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sienna/10 border border-sienna/20 px-3 py-1 text-2xs font-mono uppercase tracking-tag text-sienna font-semibold">
              <SparklesIcon className="h-3.5 w-3.5" />
              Personal Invitation
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 py-8 sm:px-8 sm:py-12 relative z-10">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Hero Eyebrow & Title */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-2xs font-mono uppercase tracking-tag text-sienna font-semibold mb-1.5">
                <span className="qc-live-dot" />
                <span>Workers Ball 2026 &middot; Harvesters Gbagada</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-ink-900 tracking-tight leading-snug">
                {stage === "confirmed"
                  ? "Your Gala Pass is Ready"
                  : stage === "alreadyConfirmed"
                    ? "Invitation Already Confirmed"
                    : stage === "error"
                      ? "Invitation Unavailable"
                      : "You're Invited to Workers Ball"}
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

          {/* Official 2026 Gala Event Banner (shown on loading / ready / error) */}
          {(stage === "loading" || stage === "ready" || stage === "error") && (
            <aside
              aria-label="Event Details"
              className="wb26-panel overflow-hidden rounded-2xl border border-ink-800 bg-[#0A0E1A] text-cream shadow-xl"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-stretch">
                <div className="w-full sm:w-44 md:w-48 shrink-0 bg-black/40 flex items-center justify-center p-3 border-b sm:border-b-0 sm:border-r border-ink-800">
                  <img
                    src="/wb26/official-flyer.jpg"
                    alt="Harvesters Gbagada Workers Ball 2026: All Stars Jersey and Jazz"
                    className="w-full h-auto max-h-56 sm:max-h-none object-cover rounded-lg shadow-md select-none"
                  />
                </div>
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-2xs font-mono uppercase tracking-widest text-[#F6B042] font-semibold mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F6B042] animate-pulse" />
                      <span>Harvesters Gbagada Gala</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      All Stars Workers Ball
                    </h2>
                    <p className="text-sm font-semibold text-[#F6B042] mt-0.5">
                      Theme: Jersey &amp; Jazz
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ink-800/80 text-xs">
                    <div>
                      <span className="block text-2xs font-mono uppercase tracking-wider text-ink-400">
                        Date &amp; Time
                      </span>
                      <span className="font-semibold text-cream">
                        Sun 29th Nov &middot; 3PM
                      </span>
                    </div>
                    <div>
                      <span className="block text-2xs font-mono uppercase tracking-wider text-ink-400">
                        Dress Code
                      </span>
                      <span className="font-semibold text-[#F6B042]">Jersey</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-2xs font-mono uppercase tracking-wider text-ink-400">
                        Venue
                      </span>
                      <span className="font-medium text-ink-200">
                        Main Auditorium, Harvesters Gbagada
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* STAGE: LOADING */}
          {stage === "loading" && (
            <section className="wb26-panel qc-card p-8 sm:p-10 text-center space-y-4">
              <WorkersBallCrest className="h-20 w-20 mx-auto" />
              <div className="space-y-1">
                <p className="text-2xs font-mono uppercase tracking-tag text-sienna font-semibold">
                  Verifying Invite Token
                </p>
                <h2 className="text-lg font-semibold text-ink-900">
                  Loading your invitation details...
                </h2>
              </div>
              <div className="max-w-xs mx-auto h-1.5 bg-ink-200 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-sienna wb26-radar-bar rounded-full" />
              </div>
            </section>
          )}

          {/* STAGE: READY — DISPLAY WORKER'S DATA & ONE-CLICK CONFIRM */}
          {stage === "ready" && worker && (
            <section className="wb26-panel qc-card p-6 sm:p-8 space-y-6">
              <div className="space-y-1.5">
                <span className="qc-eyebrow">Official Workforce Invitation</span>
                <h2 className="text-xl font-semibold text-ink-900">
                  Welcome{worker.firstName ? `, ${worker.firstName}` : ""}! Confirm your attendance
                </h2>
                <p className="text-sm text-ink-500 leading-relaxed">
                  Review your workforce details below and confirm your invitation to receive your official{" "}
                  <strong className="text-ink-900 font-mono text-xs">HGWB</strong> Gala Pass and QR code.
                </p>
              </div>

              {/* Worker Profile Card */}
              <div className="rounded-xl border border-ink-200 bg-cream p-5 space-y-4">
                <div className="flex items-start gap-3.5 pb-4 border-b border-ink-200/80">
                  <div className="h-11 w-11 rounded-full bg-ink-900 text-cream flex items-center justify-center shrink-0">
                    <UserCircleIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xs font-mono uppercase tracking-tag text-sienna font-semibold">
                      Invited Worker
                    </p>
                    <h3 className="text-lg font-semibold text-ink-900 truncate">
                      {worker.name || `${worker.firstName} ${worker.lastName}`.trim() || "Workforce Member"}
                    </h3>
                    <p className="text-xs text-ink-500">
                      {worker.role || "Worker"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-2xs font-mono uppercase tracking-tag text-ink-400">
                      Department
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-ink-900">
                      {worker.department || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-2xs font-mono uppercase tracking-tag text-ink-400">
                      Team
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-ink-900">
                      {worker.team || "Unassigned"}
                    </span>
                  </div>
                  {worker.email && (
                    <div>
                      <span className="block text-2xs font-mono uppercase tracking-tag text-ink-400">
                        Email Address
                      </span>
                      <span className="mt-0.5 block text-sm font-mono text-ink-800 truncate">
                        {worker.email}
                      </span>
                    </div>
                  )}
                  {worker.phone && (
                    <div>
                      <span className="block text-2xs font-mono uppercase tracking-tag text-ink-400">
                        Phone Number
                      </span>
                      <span className="mt-0.5 block text-sm font-mono text-ink-800">
                        {worker.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmInvite}
                className="qc-btn-primary w-full py-3.5 text-sm font-semibold cursor-pointer"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Confirm Invitation &amp; Claim Gala Pass
              </button>
            </section>
          )}

          {/* STAGE: CONFIRMING / MINTING PASS */}
          {stage === "confirming" && (
            <section className="wb26-panel qc-card p-8 sm:p-10 text-center space-y-5">
              <WorkersBallCrest className="h-20 w-20 mx-auto" />
              <div className="space-y-1.5">
                <p className="text-2xs font-mono uppercase tracking-tag text-sienna font-semibold">
                  Confirming Invitation
                </p>
                <h2 className="text-xl font-semibold text-ink-900">
                  Issuing your Workers Ball 2026 pass...
                </h2>
                {worker?.email && (
                  <p className="text-xs font-mono text-ink-500">
                    Sending confirmation email to {worker.email}
                  </p>
                )}
              </div>
              <div className="max-w-xs mx-auto h-1.5 bg-ink-200 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-ink-900 wb26-radar-bar rounded-full" />
              </div>
            </section>
          )}

          {/* STAGE: CONFIRMED + GALA PASS */}
          {stage === "confirmed" && (
            <section className="wb26-panel space-y-6 relative">
              <div className="qc-card p-6 sm:p-7 text-center space-y-2">
                <SuccessMark className="mx-auto h-12 w-12 text-forest" />
                <span className="block text-2xs font-mono uppercase tracking-tag text-forest font-semibold">
                  Invitation Confirmed &middot; Workers Ball 2026
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold text-ink-900 tracking-tight">
                  See you at Workers Ball{profileForm.firstName ? `, ${profileForm.firstName}` : ""}!
                </h2>
                <p className="text-sm text-ink-600 max-w-lg mx-auto leading-relaxed">
                  Your official Gala Pass is ready. Present this pass or your access code at the accreditation desk on the night of the ball.
                </p>
              </div>

              <CeremonialPassCard
                profile={profileForm}
                accessCode={effectiveAccessCode}
                qrCode={qrCode}
                onDownload={handleDownloadPass}
                onCopy={handleCopyAccessCode}
                copied={codeCopied}
              />

              <div className="rounded-xl border border-ink-200 bg-cream p-4 sm:p-5 flex items-start sm:items-center gap-3.5 shadow-xs">
                <div className="rounded-full bg-sienna/10 p-2 text-sienna shrink-0">
                  <EnvelopeIcon className="h-5 w-5" />
                </div>
                <div className="text-xs text-ink-700 leading-relaxed">
                  <p className="font-semibold text-ink-900">
                    Pass Sent to Your Inbox
                  </p>
                  <p className="mt-0.5">
                    We&rsquo;ve dispatched your unique access code (
                    <span className="font-mono font-semibold text-ink-900">
                      {effectiveAccessCode}
                    </span>
                    ) and scannable QR pass
                    {profileForm.email ? (
                      <>
                        {" "}
                        to{" "}
                        <strong className="text-ink-900 font-mono">
                          {profileForm.email}
                        </strong>
                      </>
                    ) : null}
                    . Save your pass to your photos or take a screenshot for seamless check-in.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* STAGE: ALREADY CONFIRMED */}
          {stage === "alreadyConfirmed" && (
            <section className="wb26-panel qc-card p-6 sm:p-8 text-center space-y-4">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-forest" />
              <span className="block text-2xs font-mono uppercase tracking-tag text-forest font-semibold">
                Already Confirmed
              </span>
              <h2 className="text-xl font-semibold text-ink-900">
                {worker?.firstName
                  ? `${worker.firstName}, your invitation is already confirmed.`
                  : "This invitation has already been confirmed."}
              </h2>
              <p className="text-sm text-ink-600 max-w-md mx-auto leading-relaxed">
                Your Workers Ball 2026 pass (HGWB code and QR) was sent to your email when you confirmed. Search your inbox for &ldquo;Workers Ball&rdquo;.
              </p>
              <div className="pt-2">
                <Link
                  to="/wb26"
                  className="qc-btn-secondary inline-flex items-center justify-center py-2.5 px-5 text-sm"
                >
                  Go to Workers Ball Portal
                </Link>
              </div>
            </section>
          )}

          {/* STAGE: ERROR */}
          {stage === "error" && (
            <section className="wb26-panel qc-card p-6 sm:p-8 text-center space-y-4">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-brick" />
              <span className="block text-2xs font-mono uppercase tracking-tag text-brick font-semibold">
                Invitation Link Issue
              </span>
              <h2 className="text-xl font-semibold text-ink-900">
                We couldn&rsquo;t open this invitation
              </h2>
              <p className="text-sm text-ink-600 max-w-md mx-auto leading-relaxed" role="alert">
                {errorMessage}
              </p>
              <div className="pt-2">
                <Link
                  to="/wb26"
                  className="qc-btn-primary inline-flex items-center justify-center py-2.5 px-5 text-sm"
                >
                  Register via Workforce Lookup
                </Link>
              </div>
            </section>
          )}
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
