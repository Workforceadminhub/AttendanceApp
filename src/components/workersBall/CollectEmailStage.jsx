import { EnvelopeIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export default function CollectEmailStage(props) {
  const {
    stage,
    selectedWorker,
    transitionTo,
    isEditingEmail,
    emailFormRef,
    handleEmailSubmit,
    uid,
    enteredEmail,
    setEnteredEmail,
    setEmailError,
    isSubmittingEmail,
    setIsEditingEmail,
    emailError,
  } = props;
  return (
    <>
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
                        className="block text-sm font-medium text-ink-900 mb-2"
                      >
                        Email Address <span className="text-sienna">*</span>
                      </label>
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
    </>
  );
}
