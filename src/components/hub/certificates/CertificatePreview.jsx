import { useEffect } from "react";
import { Tag } from "../../ui";
import { downloadCertificate } from "../../../services/hub/certificates";
import { formatDate, display } from "../../../utils/training";

/**
 * FE-C4 Certificate preview.
 *
 * One component, two callers: the worker's own gallery and the admin
 * inventory. It renders the certificate face from its metadata so a worker can
 * check it before downloading, and links out to the public verification page.
 */
export default function CertificatePreview({ certificate, template, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!certificate) return null;

  const layout = template?.layout ?? certificate.layout ?? {};
  const accent = layout.accent_color || "#0A0E1A";
  const title =
    certificate.title ?? certificate.training_name ?? certificate.course_title ?? "Certificate";

  const handleDownload = async () => {
    try {
      const blob = await downloadCertificate(certificate.certificate_number);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${certificate.certificate_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // The PDF may not have been generated yet; the face above still shows.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Certificate preview"
        className="bg-cream w-full max-w-2xl max-h-full overflow-y-auto rounded-md border border-ink-200"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 bg-cream border-b border-ink-200 px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="qc-section-title">Certificate Preview</div>
            <div className="qc-num text-sm text-ink-900 mt-0.5 truncate">
              {certificate.certificate_number}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="text-ink-500 hover:text-ink-900 p-1"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* The certificate face */}
          <div
            className="bg-white border-2 rounded-md px-8 py-10 text-center"
            style={{ borderColor: accent }}
          >
            {layout.logo_url && (
              <img
                src={layout.logo_url}
                alt=""
                className="h-12 w-auto mx-auto mb-4 object-contain"
              />
            )}
            <div className="qc-eyebrow" style={{ color: accent }}>
              Harvesters International Christian Centre
            </div>
            <h2 className="mt-3 text-2xl font-medium text-ink-900 tracking-tight">
              {layout.headline || "Certificate of Completion"}
            </h2>
            <p className="mt-4 text-sm text-ink-500">{layout.subtitle || "This certifies that"}</p>
            <p className="mt-2 text-xl font-medium text-ink-900">
              {display(certificate.recipient_name, "Recipient name")}
            </p>
            <p className="mt-3 text-sm text-ink-600 max-w-md mx-auto">
              {layout.body || "has successfully completed"}
            </p>
            <p className="mt-2 text-base font-medium text-ink-900">{title}</p>

            <div className="mt-8 flex items-end justify-between gap-6">
              <div className="text-left">
                <div className="qc-num text-xs text-ink-700">
                  {formatDate(certificate.issued_at)}
                </div>
                <div className="mt-1 pt-1 border-t border-ink-200 qc-eyebrow text-ink-400">
                  Date issued
                </div>
              </div>
              <div className="text-right">
                {layout.signature_url ? (
                  <img
                    src={layout.signature_url}
                    alt=""
                    className="h-10 w-auto ml-auto object-contain"
                  />
                ) : (
                  <div className="h-10" />
                )}
                <div className="mt-1 pt-1 border-t border-ink-200 qc-eyebrow text-ink-400">
                  {layout.signatory || "Leadership & Development"}
                </div>
              </div>
            </div>

            <div className="mt-6 qc-num text-2xs text-ink-400">
              {certificate.certificate_number}
            </div>
          </div>

          {/* Metadata */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <dt className="qc-label">Recipient</dt>
              <dd className="text-sm text-ink-900">{display(certificate.recipient_name)}</dd>
            </div>
            <div>
              <dt className="qc-label">Unique ID</dt>
              <dd className="qc-num text-sm text-ink-900">{certificate.certificate_number}</dd>
            </div>
            <div>
              <dt className="qc-label">Issued</dt>
              <dd className="qc-num text-sm text-ink-900">{formatDate(certificate.issued_at)}</dd>
            </div>
            <div>
              <dt className="qc-label">Source</dt>
              <dd className="text-sm text-ink-900 capitalize">
                {display(certificate.source_type, "training")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="sticky bottom-0 bg-cream border-t border-ink-200 px-5 py-4 flex flex-wrap justify-end gap-2">
          <a
            href={`/verify/${certificate.certificate_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="qc-btn-secondary"
          >
            Public verification
          </a>
          <button type="button" onClick={handleDownload} className="qc-btn-primary">
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small status chip reused by the gallery and inventory rows. */
export function CertificateTag() {
  return <Tag tone="success">Certified</Tag>;
}
