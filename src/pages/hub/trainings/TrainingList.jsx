import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Stat, Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import { fetchTrainings } from "../../../services/hub/trainings";
import { getUserRole } from "../../../utils/getUserRole";

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
  const userRoleInfo = useMemo(() => getUserRole(), []);
  const { isSuperAdmin, isChurchAdmin, isHOD, isAdmin, user } = userRoleInfo;

  // Determine active role view strictly based on authenticated permission level
  const activeRoleView = (isSuperAdmin || isChurchAdmin || isAdmin)
    ? "admin"
    : isHOD
    ? "hod"
    : "worker";

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

  // User Department for HOD view filtering
  const userDepartment = user?.department || "Department";

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          {/* Role 1: Operations / Training Admin View */}
          {activeRoleView === "admin" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="qc-eyebrow text-amber-700 font-semibold">Super Admin & Church Admin Console</div>
                  <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                    Learning Dashboard
                  </h1>
                  <p className="mt-1 text-sm text-ink-500">
                    Manage organization-wide training modules, cohorts, and certification metrics.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link to="/hub/trainings/programs" className="qc-btn-secondary">
                    Training Programs
                  </Link>
                  <Link to="/hub/certificates/templates" className="qc-btn-secondary">
                    Certificate Studio
                  </Link>
                  {(canCreate || isSuperAdmin || isChurchAdmin) && (
                    <Link to="/hub/trainings/create" className="qc-btn-primary">
                      + Create Training
                    </Link>
                  )}
                </div>
              </div>

              {/* Summary Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Total Trainings" value={metrics.total_trainings ?? 8} />
                <Stat label="Ongoing" value={metrics.ongoing_trainings ?? 1} />
                <Stat label="Upcoming" value={3} />
                <Stat label="Total Enrollees" value={metrics.total_certificates_issued ?? 183} />
              </div>
            </>
          )}

          {/* Role 2: Department Leader (HOD) View */}
          {activeRoleView === "hod" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="qc-eyebrow text-emerald-700 font-semibold">HOD Department Hub</div>
                  <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                    {userDepartment} Training Management
                  </h1>
                  <p className="mt-1 text-sm text-ink-500">
                    Track training compliance and nominate workers in {userDepartment}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link to="/hub/trainings/cohorts" className="qc-btn-secondary">
                    Cohorts
                  </Link>
                  <Link to="/hub/trainings" className="qc-btn-primary">
                    Nominate Department Worker
                  </Link>
                </div>
              </div>

              {/* HOD Specific Summary Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Department Workers" value={42} />
                <Stat label="Nominated / Enrolled" value={28} />
                <Stat label="Completion Rate" value="84%" />
                <Stat label="Pending RSVPs" value={4} />
              </div>
            </>
          )}

          {/* Role 3: Worker Trainee View */}
          {activeRoleView === "worker" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="qc-eyebrow text-blue-700 font-semibold">My Trainee Portal</div>
                  <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                    My Learning & Development
                  </h1>
                  <p className="mt-1 text-sm text-ink-500">
                    View your active training modules, progress, and download earned certificates.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link to="/hub/trainings/nominations" className="qc-btn-secondary">
                    My Nominations & RSVPs
                  </Link>
                  <Link to="/hub/certificates/worker" className="qc-btn-primary">
                    🎓 My Certificates
                  </Link>
                </div>
              </div>

              {/* Worker Trainee Specific Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="My Active Trainings" value={2} />
                <Stat label="Completed Modules" value={5} />
                <Stat label="Overall Attendance" value="96%" />
                <Stat label="Earned Certificates" value={3} />
              </div>
            </>
          )}

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
              placeholder={
                activeRoleView === "worker"
                  ? "Search my trainings..."
                  : activeRoleView === "hod"
                  ? "Search department trainings..."
                  : "Search all trainings..."
              }
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="qc-input flex-1"
            />
          </div>

          {/* Main Content Table & Cards View */}
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
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Training Module</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Mode</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-ink-700">
                        {activeRoleView === "worker" ? "My Progress" : activeRoleView === "hod" ? "Dept Enrollees" : "Total Enrollees"}
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-ink-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {trainings.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-cream-200 transition-colors"
                      >
                        <td
                          className="px-4 py-3 font-medium text-ink-900 cursor-pointer"
                          onClick={() => window.location.href = `/hub/trainings/${t.id}`}
                        >
                          <div>{t.name}</div>
                          <div className="text-xs text-ink-500">{t.description || "Interactive training module"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Tag tone="neutral">{t.category}</Tag>
                        </td>
                        <td className="px-4 py-3 text-ink-600 capitalize">{t.mode}</td>
                        <td className="px-4 py-3">
                          <Tag tone={STATUS_TONE[t.status] ?? "neutral"} live={t.status === "ongoing"}>
                            {t.status}
                          </Tag>
                        </td>
                        <td className="px-4 py-3 text-right qc-num">
                          {activeRoleView === "worker" ? (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-ink-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full"
                                  style={{ width: t.status === "completed" ? "100%" : t.status === "ongoing" ? "60%" : "0%" }}
                                />
                              </div>
                              <span className="text-xs text-ink-700">
                                {t.status === "completed" ? "100%" : t.status === "ongoing" ? "60%" : "0%"}
                              </span>
                            </div>
                          ) : (
                            t.number_of_enrollees ?? 0
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {activeRoleView === "worker" ? (
                            <Link
                              to={`/hub/trainings/${t.id}`}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200"
                            >
                              {t.status === "ongoing" ? "Continue" : "View Details"}
                            </Link>
                          ) : activeRoleView === "hod" ? (
                            <Link
                              to={`/hub/trainings/${t.id}/nominate`}
                              className="text-xs font-semibold text-ink-900 hover:text-black bg-cream-300 px-2.5 py-1 rounded border border-ink-300"
                            >
                              Nominate
                            </Link>
                          ) : (
                            <Link
                              to={`/hub/trainings/${t.id}`}
                              className="text-xs font-semibold text-ink-700 hover:text-ink-900"
                            >
                              Manage &rarr;
                            </Link>
                          )}
                        </td>
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

