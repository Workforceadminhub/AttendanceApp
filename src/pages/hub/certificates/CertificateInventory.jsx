import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Layout from "../../../components/Layout";
import { Stat, Tag } from "../../../components/ui";
import CertificatePreview from "../../../components/hub/certificates/CertificatePreview";
import { fetchAllTrainings, fetchTrainingCertificates } from "../../../services/hub/trainings";
import { asDate, display, formatDate, unwrapData } from "../../../utils/training";
import { mapWithConcurrency } from "../../../hooks/useSundayAttendance";
import { queryKeys } from "../../../queries/queryKeys";

/**
 * FE-C6 Admin certificate inventory.
 *
 * The API exposes certificates per training rather than as one global list, so
 * this page fans out across every training and merges the results. The list
 * grows without bound, hence filters by training, worker and issue date.
 */
export default function CertificateInventory() {
  const [trainingFilter, setTrainingFilter] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [preview, setPreview] = useState(null);

  const { data: trainingsData, isLoading: trainingsLoading } = useQuery({
    queryKey: ["hub-trainings", "certificate-inventory"],
    queryFn: () => fetchAllTrainings(),
  });
  const trainings = trainingsData?.data ?? [];

  // One request per training, four at a time. A training that fails is
  // counted and reported rather than blanking the whole inventory.
  const trainingIds = trainings.map((training) => training.id);
  const { data: certificateResults, isLoading: certificatesLoading } = useQuery({
    queryKey: queryKeys.hub.trainingCertificates("inventory", trainingIds.join(",")),
    queryFn: () =>
      mapWithConcurrency(
        trainingIds,
        (id) => fetchTrainingCertificates(id).catch(() => null),
        4
      ),
    enabled: trainingIds.length > 0,
  });
  const failedCount = (certificateResults ?? []).filter((result) => result === null).length;

  const isLoading = trainingsLoading || certificatesLoading;

  const certificates = useMemo(() => {
    const merged = [];
    (certificateResults ?? []).forEach((result, index) => {
      const training = trainings[index];
      (unwrapData(result) ?? []).forEach((certificate) => {
        merged.push({
          ...certificate,
          training_id: training?.id,
          training_name: certificate.training_name ?? training?.name,
        });
      });
    });
    return merged.sort((a, b) =>
      String(b.issued_at ?? "").localeCompare(String(a.issued_at ?? ""))
    );
    // `trainings` is a new array each render; the results only change with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificateResults]);

  const filtered = useMemo(() => {
    const worker = workerFilter.trim().toLowerCase();
    return certificates.filter((certificate) => {
      if (trainingFilter && String(certificate.training_id) !== String(trainingFilter)) return false;
      if (worker) {
        const haystack = `${certificate.recipient_name ?? ""} ${certificate.certificate_number ?? ""}`.toLowerCase();
        if (!haystack.includes(worker)) return false;
      }
      const issued = asDate(certificate.issued_at);
      if (fromDate && (!issued || issued < fromDate)) return false;
      if (toDate && (!issued || issued > toDate)) return false;
      return true;
    });
  }, [certificates, trainingFilter, workerFilter, fromDate, toDate]);

  const trainingsWithCertificates = new Set(
    certificates.map((certificate) => String(certificate.training_id))
  ).size;

  const clearFilters = () => {
    setTrainingFilter("");
    setWorkerFilter("");
    setFromDate("");
    setToDate("");
  };

  const hasFilters = trainingFilter || workerFilter || fromDate || toDate;

  return (
    <>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="qc-eyebrow">Certificate Engine</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                Certificate Inventory
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Every certificate issued across all trainings, for browsing and audit.
              </p>
            </div>
            <Link to="/hub/certificates/templates" className="qc-btn-secondary shrink-0">
              Certificate Templates
            </Link>
          </div>

          {failedCount > 0 && (
            <p role="alert" className="text-sm text-brick">
              Certificates for {failedCount} training{failedCount === 1 ? "" : "s"} could not be loaded.
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Certificates Issued" value={certificates.length} loading={isLoading} />
            <Stat label="Trainings Certified" value={trainingsWithCertificates} loading={isLoading} />
            <Stat label="Showing" value={filtered.length} loading={isLoading} />
          </div>

          {/* Filters - this list grows indefinitely */}
          <div className="qc-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="qc-label" htmlFor="inventory-training">Training</label>
              <select
                id="inventory-training"
                className="qc-input text-sm"
                value={trainingFilter}
                onChange={(e) => setTrainingFilter(e.target.value)}
              >
                <option value="">All trainings</option>
                {trainings.map((training) => (
                  <option key={training.id} value={training.id}>{training.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="qc-label" htmlFor="inventory-worker">Worker or ID</label>
              <input
                id="inventory-worker"
                className="qc-input text-sm"
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                placeholder="Name or certificate number"
              />
            </div>
            <div>
              <label className="qc-label" htmlFor="inventory-from">Issued from</label>
              <input
                id="inventory-from"
                type="date"
                className="qc-input text-sm qc-num"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="qc-label" htmlFor="inventory-to">Issued to</label>
              <input
                id="inventory-to"
                type="date"
                className="qc-input text-sm qc-num"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-ink-500 hover:text-ink-900 underline underline-offset-2 justify-self-start"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="qc-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading certificates...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-500">
                {certificates.length === 0
                  ? "No certificates have been issued yet."
                  : "No certificates match these filters."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 bg-cream-200">
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Certificate</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Worker</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Training</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Issued</th>
                      <th className="text-right px-4 py-3 font-medium text-ink-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {filtered.map((certificate, index) => (
                      <tr key={certificate.certificate_number ?? index} className="hover:bg-cream-200 transition-colors">
                        <td className="px-4 py-3">
                          <div className="qc-num text-ink-900">{certificate.certificate_number}</div>
                          <Tag tone="success">Issued</Tag>
                        </td>
                        <td className="px-4 py-3 text-ink-900">{display(certificate.recipient_name)}</td>
                        <td className="px-4 py-3 text-ink-600">{display(certificate.training_name)}</td>
                        <td className="px-4 py-3 qc-num text-ink-500">{formatDate(certificate.issued_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setPreview(certificate)}
                            className="text-xs font-medium text-ink-700 hover:text-ink-900 underline underline-offset-2"
                          >
                            Preview
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Layout>

      {preview && <CertificatePreview certificate={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
