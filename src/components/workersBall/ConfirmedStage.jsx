import SuccessMark from "../ui/SuccessMark";
import CeremonialPassCard from "./CeremonialPassCard";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

export default function ConfirmedStage(props) {
  const {
    stage,
    profileForm,
    effectiveAccessCode,
    qrCode,
    handleDownloadPass,
    handleCopyAccessCode,
    codeCopied,
    handleStartOver,
  } = props;
  return (
    <>
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

                {/* Confirmation Header Banner */}
                <div className="qc-card p-6 sm:p-7 text-center space-y-2">
                  <SuccessMark className="mx-auto h-12 w-12 text-forest" />
                  <span className="block text-2xs font-mono uppercase tracking-tag text-forest font-semibold">
                    Accreditation Confirmed &middot; Workers Ball 2026
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-ink-900 tracking-tight">
                    See you at Workers Ball, {profileForm.firstName}!
                  </h2>
                  <p className="text-sm text-ink-600 max-w-lg mx-auto leading-relaxed">
                    Your official Gala Pass is ready. Present this pass or your access code at the accreditation desk on the night of the ball.
                  </p>
                </div>

                {/* Hero Interactive 3D-Tilt Gala Pass & Download */}
                <CeremonialPassCard
                  profile={profileForm}
                  accessCode={effectiveAccessCode}
                  qrCode={qrCode}
                  onDownload={handleDownloadPass}
                  onCopy={handleCopyAccessCode}
                  copied={codeCopied}
                />

                {/* Email Delivery Confirmation Card */}
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
                      ) and scannable QR pass to{" "}
                      <strong className="text-ink-900 font-mono">
                        {profileForm.email}
                      </strong>
                      . Save your pass to your photos or take a screenshot for seamless check-in.
                    </p>
                  </div>
                </div>

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
    </>
  );
}
