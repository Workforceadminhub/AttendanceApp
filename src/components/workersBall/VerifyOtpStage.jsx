import { ArrowPathIcon, LockClosedIcon } from "@heroicons/react/24/outline";

export default function VerifyOtpStage(props) {
  const {
    stage,
    selectedWorker,
    transitionTo,
    setIsEditingEmail,
    setEnteredEmail,
    otpDestination,
    otpFormRef,
    handleOtpFormSubmit,
    uid,
    otpShake,
    otpValue,
    otpInputRef,
    isVerifyingOtp,
    setOtpValue,
    setOtpError,
    verifyOtpCode,
    otpError,
    handleResendOtp,
    resendCooldown,
    isResendingOtp,
  } = props;
  return (
    <>
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
    </>
  );
}
