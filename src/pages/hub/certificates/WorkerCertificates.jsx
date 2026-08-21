import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import CertificatePreview from "../../../components/hub/certificates/CertificatePreview";
import { hubGet } from "../../../services/hub/client";
import { downloadCertificate } from "../../../services/hub/certificates";
import { getUser } from "../../../utils/getUser";

export default function WorkerCertificates() {
  const user = getUser();
  const [preview, setPreview] = useState(null);
  const workerId = user?.workerId ?? user?.worker_id ?? user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["hub-worker-certificates", workerId],
    queryFn: () => hubGet(`/users/${workerId}/certificates`),
    enabled: !!workerId,
  });
  const certificates = data?.data ?? [];

  const handleDownload = async (certNumber) => {
    try {
      const blob = await downloadCertificate(certNumber);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${certNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // PDF may not be available yet
    }
  };

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          <div>
            <div className="qc-eyebrow">Certificate Gallery</div>
            <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
              My Certificates
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Certificates earned through completed trainings and courses.
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-ink-500">Loading certificates...</div>
          ) : certificates.length === 0 ? (
            <div className="qc-card p-8 text-center">
              <div className="text-ink-500 text-sm">No certificates yet.</div>
              <p className="text-xs text-ink-400 mt-1">
                Complete a training or course to earn your first certificate.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert, i) => (
                <CertificateCard
                  key={cert.certificate_number ?? i}
                  cert={cert}
                  onDownload={handleDownload}
                  onPreview={() => setPreview(cert)}
                />
              ))}
            </div>
          )}
        </div>
      </Layout>

      {preview && <CertificatePreview certificate={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

function CertificateCard({ cert, onDownload, onPreview }) {
  const issuedDate = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="qc-card p-5 flex flex-col">
      {/* Certificate icon */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-forest/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-forest" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <Tag tone="success">Certified</Tag>
      </div>

      {/* Details */}
      <h3 className="text-sm font-medium text-ink-900 mb-1">
        {cert.title ?? cert.training_name ?? cert.course_title ?? "Certificate"}
      </h3>
      <p className="text-xs text-ink-500 capitalize mb-2">
        {cert.source_type ?? "training"}
      </p>

      <div className="mt-auto pt-3 border-t border-ink-100 flex items-center justify-between">
        <div>
          <div className="qc-num text-xs text-ink-500">{cert.certificate_number}</div>
          {issuedDate && (
            <div className="qc-num text-xs text-ink-400">{issuedDate}</div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="text-xs text-ink-600 hover:text-ink-900 underline"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => onDownload(cert.certificate_number)}
            className="text-xs text-ink-600 hover:text-ink-900 underline"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
