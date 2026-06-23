import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Stat, Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import { fetchTrainings } from "../../../services/hub/trainings";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "ongoing", label: "Ongoing" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "leadership", label: "Leadership" },
  { value: "orientation", label: "Orientation" },
  { value: "skills", label: "Skills" },
];

const STATUS_TONE = {
  ongoing: "live",
  upcoming: "info",
  completed: "success",
};

export default function TrainingList() {
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const canCreate = useCanAction("create_training");

  const { data, isLoading } = useQuery({
    queryKey: ["hub-trainings", { status, category, search, page }],
    queryFn: () => fetchTrainings({ status, category, search, page, per_page: 20 }),
  });

  const trainings = data?.data ?? [];
  const metrics = data?.metrics ?? {};
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="qc-eyebrow">Training Management</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                Trainings
              </h1>
            </div>
            {canCreate && (
              <Link to="/hub/trainings/create" className="qc-btn-primary shrink-0">
                Create Training
              </Link>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total Trainings" value={metrics.total_trainings ?? 0} />
            <Stat label="Ongoing" value={metrics.ongoing_trainings ?? 0} />
            <Stat label="Certificates Issued" value={metrics.total_certificates_issued ?? 0} />
            <Stat label="Enrollees" value={total} />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status tabs */}
            <div className="flex gap-1 border border-ink-200 rounded-md p-0.5 bg-white">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setStatus(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    status === tab.key
                      ? "bg-ink-900 text-cream"
                      : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="qc-input w-auto"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search trainings..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="qc-input flex-1"
            />
          </div>

          {/* Table */}
          <div className="qc-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading trainings...</div>
            ) : trainings.length === 0 ? (
              <div className="p-8 text-center text-ink-500">No trainings found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 bg-cream-200">
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Mode</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-ink-700">Enrollees</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {trainings.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-cream-200 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/hub/trainings/${t.id}`}
                      >
                        <td className="px-4 py-3 font-medium text-ink-900">{t.name}</td>
                        <td className="px-4 py-3">
                          <Tag tone="neutral">{t.category}</Tag>
                        </td>
                        <td className="px-4 py-3 text-ink-600 capitalize">{t.mode}</td>
                        <td className="px-4 py-3">
                          <Tag tone={STATUS_TONE[t.status] ?? "neutral"} live={t.status === "ongoing"}>
                            {t.status}
                          </Tag>
                        </td>
                        <td className="px-4 py-3 text-right qc-num">{t.number_of_enrollees ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-500">
                Page <span className="qc-num">{page}</span> of <span className="qc-num">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="qc-btn-secondary"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="qc-btn-secondary"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
