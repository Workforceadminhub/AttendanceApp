import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Tag } from "../../../components/ui";
import { verifyCertificate, downloadCertificate } from "../../../services/hub/certificates";

export default function VerifyCertificate() {
  const { certificateNumber: urlCertNumber } = useParams();
  const [certNumber, setCertNumber] = useState(urlCertNumber ?? "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const doVerify = async (number) => {
    if (!number.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await verifyCertificate(number.trim());
      if (res?.data) {
        setResult(res.data);
      } else if (res?.valid !== undefined) {
        setResult(res);
      } else {
        setResult({ valid: false });
      }
    } catch {
      setError("Could not verify certificate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlCertNumber) doVerify(urlCertNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCertNumber]);

  const handleSubmit = (e) => {
    e.preventDefault();
    doVerify(certNumber);
  };

  const handleDownload = async () => {
    try {
      const blob = await downloadCertificate(result.certificate_number);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.certificate_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // download may fail if PDF not generated yet
    }
  };

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Brand bar */}
      <header className="border-b border-ink-200 bg-cream">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Harvesters"
              className="h-12 w-auto select-none mix-blend-multiply"
            />
            <span className="hidden sm:inline-block h-4 w-px bg-ink-200" />
            <span className="hidden sm:inline-block qc-section-title">
              HICC-GBAGADA
            </span>
          </div>
          <span className="qc-num text-2xs uppercase tracking-tag text-ink-500">
            {todayLabel}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-5 sm:px-8 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="qc-eyebrow">Certificate Verification</div>
            <h1 className="mt-2 text-3xl font-medium text-ink-900 tracking-tight">
              Verify a Certificate
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              Enter a certificate number to verify its authenticity.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              placeholder="e.g. HRV-M5XYZ-ABC123"
              className="qc-input qc-num flex-1"
            />
            <button
              type="submit"
              disabled={loading || !certNumber.trim()}
              className="qc-btn-primary shrink-0"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          {error && (
            <div className="mt-6 qc-card p-4 border-l-4 border-brick">
              <p className="text-sm text-brick">{error}</p>
            </div>
          )}

          {result && (
            <div className={`mt-6 qc-card p-6 border-l-4 ${result.valid ? "border-forest" : "border-brick"}`}>
              <div className="flex items-center gap-2 mb-4">
                <Tag tone={result.valid ? "success" : "danger"}>
                  {result.valid ? "Valid" : "Not Found"}
                </Tag>
              </div>

              {result.valid ? (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-ink-500">Certificate Number</dt>
                    <dd className="qc-num font-medium text-ink-900">{result.certificate_number}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Recipient</dt>
                    <dd className="font-medium text-ink-900">{result.recipient_name}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Training / Course</dt>
                    <dd className="font-medium text-ink-900">{result.title}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Type</dt>
                    <dd className="text-ink-700 capitalize">{result.source_type}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Issued</dt>
                    <dd className="qc-num text-ink-700">
                      {result.issued_at
                        ? new Date(result.issued_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </dd>
                  </div>
                  <div className="pt-2">
                    <button type="button" onClick={handleDownload} className="qc-btn-secondary">
                      Download PDF
                    </button>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-ink-600">
                  No certificate found with this number. Please check the number and try again.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-ink-200 bg-cream">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between text-2xs uppercase tracking-tag text-ink-500">
          <span>Harvesters International Christian Centre</span>
          <span className="qc-num">v2.0</span>
        </div>
      </footer>
    </div>
  );
}
