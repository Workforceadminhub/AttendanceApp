import GenericModal from "../GenericModal";
import { Link } from "react-router-dom";
import { CheckIcon, ClipboardDocumentIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { formatDateSafe } from "./adminUtils";

export default function BallRegistrationModal(props) {
  const {
    selectedWorker,
    setSelectedWorker,
    handleCopyCode,
    copiedCode,
    inviteUrlByWorkerId,
    handleCopyInviteUrl,
    copiedInviteUrl,
    handleQuickResendInvite,
    resendingWorkerId,
  } = props;
  return (
    <>
        {selectedWorker && (
          <GenericModal
            isOpen={Boolean(selectedWorker)}
            onClose={() => setSelectedWorker(null)}
            title="Workers Ball Registration Record"
            size="medium"
          >
            <div className="space-y-5">
              {/* Luxury Pass Card Preview */}
              <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#1A1714] via-[#121110] to-[#0A0908] p-5 text-amber-50 shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-3xs font-mono uppercase tracking-widest text-amber-400">
                      OFFICIAL GALA PASS • 2026
                    </span>
                    <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                      {selectedWorker.name}
                    </h3>
                    <p className="text-xs text-amber-200/80">
                      {selectedWorker.role} • {selectedWorker.department}
                    </p>
                  </div>
                  {/* Status Indicator */}
                  {selectedWorker.attended ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      ACCREDITED
                    </span>
                  ) : selectedWorker.status === "pending" ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      PENDING
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      REGISTERED
                    </span>
                  )}
                </div>

                {/* Pass Code Barcode Stub */}
                <div className="mt-4 pt-4 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-3xs font-mono uppercase tracking-widest text-amber-300/70">
                      ACCREDITATION CODE
                    </span>
                    <div className="font-mono text-xl font-extrabold text-amber-300 tracking-wider">
                      {selectedWorker.code || (selectedWorker.status === "pending" ? "PENDING" : "-")}
                    </div>
                  </div>
                  {selectedWorker.code && (
                    <button
                      type="button"
                      onClick={() => handleCopyCode(selectedWorker.code)}
                      className="inline-flex items-center self-start sm:self-center px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-mono transition"
                    >
                      {copiedCode === selectedWorker.code ? "Copied" : "Copy Code"}
                    </button>
                  )}
                </div>
              </div>

              {/* Data Fields Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-ink-50/50 p-4 rounded-xl border border-ink-100">
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Department
                  </span>
                  <div className="font-semibold text-ink mt-0.5">
                    {selectedWorker.department || "Unassigned"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Team
                  </span>
                  <div className="font-semibold text-ink mt-0.5">
                    {selectedWorker.team || "Unassigned"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Email
                  </span>
                  <div className="font-mono text-ink mt-0.5 truncate">
                    {selectedWorker.email || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Phone
                  </span>
                  <div className="font-mono text-ink mt-0.5">
                    {selectedWorker.phone || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Registered
                  </span>
                  <div className="font-mono text-ink-700 mt-0.5">
                    {formatDateSafe(selectedWorker.registeredAt)}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Attended
                  </span>
                  <div className="font-mono text-ink-700 mt-0.5">
                    {selectedWorker.attended
                      ? formatDateSafe(selectedWorker.attendedAt)
                      : "Not attended"}
                  </div>
                </div>
              </div>

              {/* Personal Invite Link (if available) */}
              {(selectedWorker.inviteUrl ||
                inviteUrlByWorkerId[
                  String(selectedWorker.workerId ?? selectedWorker.id)
                ]) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xs font-mono uppercase tracking-wider text-amber-800 font-semibold">
                      Personal Invite Link
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyInviteUrl(
                          selectedWorker.inviteUrl ||
                            inviteUrlByWorkerId[
                              String(selectedWorker.workerId ?? selectedWorker.id)
                            ]
                        )
                      }
                      className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-2xs font-mono font-semibold text-amber-900 border border-amber-200 hover:bg-amber-100/60 transition cursor-pointer"
                    >
                      {copiedInviteUrl ===
                      (selectedWorker.inviteUrl ||
                        inviteUrlByWorkerId[
                          String(selectedWorker.workerId ?? selectedWorker.id)
                        ]) ? (
                        <>
                          <CheckIcon className="h-3 w-3 text-forest" />
                          Copied
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="h-3 w-3" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-2xs font-mono text-ink-700 break-all">
                    {selectedWorker.inviteUrl ||
                      inviteUrlByWorkerId[
                        String(selectedWorker.workerId ?? selectedWorker.id)
                      ]}
                  </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {selectedWorker.status === "pending" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-amber-700 font-medium">
                      Pending confirmation
                    </span>
                    {(selectedWorker.workerId || selectedWorker.id) && (
                      <button
                        type="button"
                        onClick={() => handleQuickResendInvite(selectedWorker)}
                        disabled={
                          resendingWorkerId ===
                          (selectedWorker.workerId ?? selectedWorker.id)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-sienna px-3 py-1.5 text-xs font-semibold text-white hover:bg-sienna-dark transition disabled:opacity-50 cursor-pointer"
                      >
                        <PaperAirplaneIcon className="h-3.5 w-3.5" />
                        {resendingWorkerId ===
                        (selectedWorker.workerId ?? selectedWorker.id)
                          ? "Sending..."
                          : "Send / Resend Invite"}
                      </button>
                    )}
                  </div>
                ) : !selectedWorker.attended ? (
                  <Link
                    to="/scan/wb26"
                    state={{ from: "/admin/workers-ball-registrations" }}
                    className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
                  >
                    Scanner Desk
                  </Link>
                ) : (
                  <span className="text-xs text-emerald-700 font-medium">
                    Attended
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedWorker(null)}
                  className="w-full sm:w-auto rounded-lg border border-ink-200 px-4 py-2 text-xs font-medium text-ink hover:bg-ink-100 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </GenericModal>
        )}
    </>
  );
}
