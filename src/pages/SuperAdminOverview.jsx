import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import LoadingState from "../components/LoadingState";
import Stat from "../components/ui/Stat";
import Tag from "../components/ui/Tag";
import MobileSheet from "../components/ui/MobileSheet";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchWorkerStats, fetchAttendanceData } from "../services/overview";
import { enableAttendance } from "../services/enableAttendance";
import { disableAttendance } from "../services/disableAttendance";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

// Quiet Cockpit chart palette — ink primary, forest for "active/present",
// mustard for "pending", brick for "pending delete". No saturated blues.
const CHART_COLORS = {
  active: "#4A6B3F",
  pending: "#A87B0F",
  ink: "#0A0E1A",
};

export default function SuperAdminOverview() {
  const navigate = useNavigate();
  const [isWorkersLoading, setIsWorkersLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [workerData, setWorkerData] = useState(null);
  const [attendanceInfo, setAttendanceInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("team");
  const [sortConfig, setSortConfig] = useState({ key: "total", direction: "desc" });

  const [attendanceEnabled, setAttendanceEnabled] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("attendanceEnabled") || "false");
    } catch {
      return false;
    }
  });
  const [isTogglingAttendance, setIsTogglingAttendance] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const authUser = JSON.parse(sessionStorage.getItem("authUser"));
    if (!authUser || authUser.department !== "Super Admin") {
      toast.error("Access denied. Super Admin access required.");
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const loadWorkers = async () => {
      setIsWorkersLoading(true);
      try {
        const data = await fetchWorkerStats();
        setWorkerData(data);
      } catch (error) {
        toast.error("Failed to load worker data");
      } finally {
        setIsWorkersLoading(false);
      }
    };
    loadWorkers();
  }, []);

  useEffect(() => {
    const loadAttendance = async () => {
      setIsAttendanceLoading(true);
      try {
        const data = await fetchAttendanceData();
        setAttendanceInfo(data);
      } catch (error) {
        toast.error("Failed to load attendance data");
      } finally {
        setIsAttendanceLoading(false);
      }
    };
    loadAttendance();
  }, []);

  const handleSort = (key) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));

  const getSortedData = (data) => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (sortConfig.direction === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  };

  const handleAttendanceToggle = async () => {
    setIsTogglingAttendance(true);
    try {
      if (attendanceEnabled) {
        await disableAttendance();
        setAttendanceEnabled(false);
        localStorage.setItem("attendanceEnabled", "false");
        toast.success("Attendance has been disabled successfully");
      } else {
        await enableAttendance();
        setAttendanceEnabled(true);
        localStorage.setItem("attendanceEnabled", "true");
        toast.success("Attendance has been enabled successfully");
      }
    } catch (error) {
      toast.error(`Failed to ${attendanceEnabled ? "disable" : "enable"} attendance`);
    } finally {
      setIsTogglingAttendance(false);
      setShowConfirmModal(false);
    }
  };

  const { overallStats, teamStats, departmentStats, teamChartData } = workerData || {};
  const { attendanceStats, directorateStats, grandTotals } = attendanceInfo || {};

  const breakdownList =
    getSortedData(activeTab === "team" ? teamStats : departmentStats) ?? [];
  const hasNoBreakdownData =
    (!teamStats || teamStats.length === 0) &&
    (!departmentStats || departmentStats.length === 0);

  const lastDate = attendanceStats?.lastAttendanceDate || "—";

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        {/* Page heading */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="qc-eyebrow">Overview · Super Admin</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
              Workforce
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Last attendance recorded{" "}
              <span className="qc-num text-ink-900">{lastDate}</span>
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="qc-btn-secondary"
          >
            Refresh
          </button>
        </div>

        {/* Attendance control — sienna means LIVE */}
        <div
          className={`qc-card mb-8 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
            attendanceEnabled ? "border-sienna/40 bg-sienna/[0.03]" : ""
          }`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex flex-col">
              <div className="qc-eyebrow">Attendance window</div>
              <div className="mt-1 flex items-center gap-3">
                <Tag tone={attendanceEnabled ? "live" : "neutral"} live={attendanceEnabled}>
                  {attendanceEnabled ? "Live · Accepting" : "Closed"}
                </Tag>
                {attendanceEnabled && (
                  <span className="qc-num text-2xs uppercase tracking-tag text-sienna-dark">
                    Workers can mark
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isTogglingAttendance}
            className={attendanceEnabled ? "qc-btn-secondary" : "qc-btn-live"}
          >
            {attendanceEnabled ? "Close window" : "Open window"}
          </button>
        </div>

        {/* Stats grid: 1 → 2 → 3 → 6 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 mb-8">
          <Stat
            eyebrow="Total workforce"
            value={(overallStats?.totalWorkers ?? 0).toLocaleString()}
            loading={isWorkersLoading}
          />
          <Stat
            eyebrow="Present"
            value={(attendanceStats?.totalPresent ?? 0).toLocaleString()}
            footnote={lastDate !== "—" ? lastDate : null}
            loading={isAttendanceLoading}
          />
          <Stat
            eyebrow="Attendance rate"
            value={attendanceStats?.attendanceRate || "0%"}
            loading={isAttendanceLoading}
          />
          <Stat
            eyebrow="Absent"
            value={(attendanceStats?.totalAbsent ?? 0).toLocaleString()}
            footnote={lastDate !== "—" ? lastDate : null}
            loading={isAttendanceLoading}
          />
          <Stat
            eyebrow="Pending approvals"
            value={(overallStats?.pendingApprovals ?? 0).toLocaleString()}
            loading={isWorkersLoading}
          />
          <Stat
            eyebrow="Pending deletions"
            value={(overallStats?.pendingDeletions ?? 0).toLocaleString()}
            loading={isWorkersLoading}
          />
        </section>

        {/* Directorate attendance */}
        <section className="qc-card mb-8 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-ink-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="qc-section-title">Attendance report</div>
              <div className="qc-num text-2xs uppercase tracking-tag text-ink-400 mt-0.5">
                {lastDate}
              </div>
            </div>
            {grandTotals && (
              <div className="qc-num text-xs text-ink-500">
                <span className="text-ink-900 font-medium">
                  {grandTotals.percentage}
                </span>{" "}
                overall
              </div>
            )}
          </div>

          {isAttendanceLoading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingState />
            </div>
          ) : !directorateStats || directorateStats.length === 0 ? (
            <EmptyState
              title="No attendance data"
              hint="Attendance data will appear here once recorded."
            />
          ) : (
            <>
              {/* Mobile: card list */}
              <ul className="lg:hidden divide-y divide-ink-200">
                {directorateStats.flatMap((directorate) =>
                  directorate.teams.map((team) => (
                    <li
                      key={`${directorate.directorate}-${team.team}`}
                      className="px-4 py-3"
                    >
                      <div className="qc-num text-2xs uppercase tracking-tag text-ink-500">
                        {directorate.directorate}
                      </div>
                      <div className="text-sm font-medium text-ink-900 mt-0.5">
                        {team.team}
                      </div>
                      <dl className="mt-2 grid grid-cols-4 gap-2 text-xs">
                        <Cell label="Total" value={team.total} />
                        <Cell label="Present" value={team.present} tone="forest" />
                        <Cell label="%" value={team.percentage} />
                        <Cell label="Absent" value={team.absent} tone="brick" />
                      </dl>
                    </li>
                  ))
                )}
                {grandTotals && (
                  <li className="px-4 py-3 bg-cream-200">
                    <div className="qc-section-title">Total</div>
                    <dl className="mt-2 grid grid-cols-4 gap-2 text-xs">
                      <Cell label="Total" value={grandTotals.total} bold />
                      <Cell label="Present" value={grandTotals.present} tone="forest" bold />
                      <Cell label="%" value={grandTotals.percentage} bold />
                      <Cell label="Absent" value={grandTotals.absent} tone="brick" bold />
                    </dl>
                  </li>
                )}
              </ul>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-cream-200 border-b border-ink-200">
                      <th className="qc-section-title px-4 py-2.5 text-left">Directorate</th>
                      <th className="qc-section-title px-4 py-2.5 text-left">Team</th>
                      <th className="qc-section-title px-4 py-2.5 text-right">Strength</th>
                      <th className="qc-section-title px-4 py-2.5 text-right">Present</th>
                      <th className="qc-section-title px-4 py-2.5 text-right">% Present</th>
                      <th className="qc-section-title px-4 py-2.5 text-right">Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directorateStats.map((directorate) =>
                      directorate.teams.map((team, teamIndex) => (
                        <tr
                          key={`${directorate.directorate}-${team.team}`}
                          className="border-b border-ink-100 last:border-b-0 hover:bg-cream-200/60"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-ink-900 whitespace-nowrap">
                            {teamIndex === 0 ? directorate.directorate : ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-ink-700 whitespace-nowrap">
                            {team.team}
                          </td>
                          <td className="px-4 py-3 qc-num text-sm text-ink-900 text-right">
                            {team.total}
                          </td>
                          <td className="px-4 py-3 qc-num text-sm text-forest font-medium text-right">
                            {team.present}
                          </td>
                          <td className="px-4 py-3 qc-num text-sm text-ink-900 font-medium text-right">
                            {team.percentage}
                          </td>
                          <td className="px-4 py-3 qc-num text-sm text-brick text-right">
                            {team.absent}
                          </td>
                        </tr>
                      ))
                    )}
                    {grandTotals && (
                      <tr className="bg-cream-200 border-t border-ink-200">
                        <td
                          className="px-4 py-3 text-sm font-semibold text-ink-900 whitespace-nowrap"
                          colSpan={2}
                        >
                          Total
                        </td>
                        <td className="px-4 py-3 qc-num text-sm font-semibold text-ink-900 text-right">
                          {grandTotals.total}
                        </td>
                        <td className="px-4 py-3 qc-num text-sm font-semibold text-forest text-right">
                          {grandTotals.present}
                        </td>
                        <td className="px-4 py-3 qc-num text-sm font-semibold text-ink-900 text-right">
                          {grandTotals.percentage}
                        </td>
                        <td className="px-4 py-3 qc-num text-sm font-semibold text-brick text-right">
                          {grandTotals.absent}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Workers by Team chart */}
        <section className="qc-card mb-8 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="qc-section-title">Workers by team</div>
            <div className="flex items-center gap-3 qc-num text-2xs uppercase tracking-tag text-ink-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 bg-forest" /> Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 bg-mustard" /> Pending
              </span>
            </div>
          </div>
          {isWorkersLoading ? (
            <div className="h-64 sm:h-80 flex items-center justify-center">
              <LoadingState />
            </div>
          ) : teamChartData && teamChartData.length > 0 ? (
            <div className="h-[280px] sm:h-[340px] w-full min-w-0 -mx-2">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <BarChart
                  data={teamChartData}
                  margin={{ top: 8, right: 8, left: 4, bottom: 56 }}
                >
                  <CartesianGrid strokeDasharray="2 4" stroke="#E5E5E0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6B6B66", fontFamily: "Geist Sans" }}
                    angle={-35}
                    textAnchor="end"
                    height={70}
                    tickLine={false}
                    axisLine={{ stroke: "#E5E5E0" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B6B66", fontFamily: "Geist Mono" }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip content={<CockpitTooltip />} cursor={{ fill: "rgba(10,14,26,0.04)" }} />
                  <Legend wrapperStyle={{ display: "none" }} />
                  <Bar
                    dataKey="active"
                    name="Active"
                    fill={CHART_COLORS.active}
                    stackId="a"
                  />
                  <Bar
                    dataKey="pending"
                    name="Pending"
                    fill={CHART_COLORS.pending}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No chart data" />
          )}
        </section>

        {/* Breakdown table */}
        <section className="qc-card overflow-hidden">
          <div className="border-b border-ink-200 px-4 sm:px-5">
            <nav className="flex gap-1" aria-label="Breakdown">
              <TabButton
                active={activeTab === "team"}
                onClick={() => setActiveTab("team")}
                count={teamStats?.length ?? 0}
              >
                Team
              </TabButton>
              <TabButton
                active={activeTab === "department"}
                onClick={() => setActiveTab("department")}
                count={departmentStats?.length ?? 0}
              >
                Department
              </TabButton>
            </nav>
          </div>

          {isWorkersLoading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingState />
            </div>
          ) : hasNoBreakdownData ? (
            <EmptyState title="No data available" hint="Worker data will appear here once loaded." />
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="sm:hidden divide-y divide-ink-200">
                {breakdownList.map((item, index) => (
                  <li
                    key={`${item.team || ""}-${item.department || ""}-${index}`}
                    className="px-4 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm font-medium text-ink-900 truncate">
                        {activeTab === "team" ? item.team : item.department}
                      </div>
                      <span className="qc-num text-2xs uppercase tracking-tag text-ink-400">
                        #{index + 1}
                      </span>
                    </div>
                    {activeTab === "department" && (
                      <div className="qc-num text-2xs uppercase tracking-tag text-ink-500 mt-0.5">
                        {item.team}
                      </div>
                    )}
                    <dl className="mt-2 grid grid-cols-4 gap-2 text-xs">
                      <Cell label="Total" value={item.total} bold />
                      <Cell label="Active" value={item.active} tone="forest" />
                      <Cell label="P. Add" value={item.pendingAdd} tone="mustard" />
                      <Cell label="P. Del" value={item.pendingDelete} tone="brick" />
                    </dl>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-cream-200 border-b border-ink-200">
                      <th className="qc-section-title px-4 py-2.5 text-left w-12">#</th>
                      <SortableTh
                        active={sortConfig}
                        keyName={activeTab === "team" ? "team" : "department"}
                        onSort={handleSort}
                      >
                        {activeTab === "team" ? "Team" : "Department"}
                      </SortableTh>
                      {activeTab === "department" && (
                        <th className="qc-section-title px-4 py-2.5 text-left">Team</th>
                      )}
                      <SortableTh
                        active={sortConfig}
                        keyName="total"
                        onSort={handleSort}
                        align="right"
                      >
                        Total
                      </SortableTh>
                      <SortableTh
                        active={sortConfig}
                        keyName="active"
                        onSort={handleSort}
                        align="right"
                      >
                        Active
                      </SortableTh>
                      <SortableTh
                        active={sortConfig}
                        keyName="pendingAdd"
                        onSort={handleSort}
                        align="right"
                      >
                        Pending Add
                      </SortableTh>
                      <SortableTh
                        active={sortConfig}
                        keyName="pendingDelete"
                        onSort={handleSort}
                        align="right"
                      >
                        Pending Del
                      </SortableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownList.map((item, index) => (
                      <tr
                        key={`${item.team || ""}-${item.department || ""}-${index}`}
                        className="border-b border-ink-100 last:border-b-0 hover:bg-cream-200/60"
                      >
                        <td className="px-4 py-3 qc-num text-sm text-ink-400">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-ink-900 whitespace-nowrap">
                          {activeTab === "team" ? item.team : item.department}
                        </td>
                        {activeTab === "department" && (
                          <td className="px-4 py-3 text-sm text-ink-500 whitespace-nowrap">
                            {item.team}
                          </td>
                        )}
                        <td className="px-4 py-3 qc-num text-sm text-ink-900 font-medium text-right">
                          {item.total}
                        </td>
                        <td className="px-4 py-3 qc-num text-sm text-forest text-right">
                          {item.active}
                        </td>
                        <td className="px-4 py-3 qc-num text-sm text-mustard text-right">
                          {item.pendingAdd}
                        </td>
                        <td className="px-4 py-3 qc-num text-sm text-brick text-right">
                          {item.pendingDelete}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </Layout>

      {/* Attendance toggle confirmation */}
      <MobileSheet
        open={showConfirmModal}
        onClose={() => !isTogglingAttendance && setShowConfirmModal(false)}
        title={attendanceEnabled ? "Close attendance window" : "Open attendance window"}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              disabled={isTogglingAttendance}
              className="qc-btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAttendanceToggle}
              disabled={isTogglingAttendance}
              className={`flex-1 ${
                attendanceEnabled ? "qc-btn-danger" : "qc-btn-live"
              }`}
            >
              {isTogglingAttendance
                ? "Working…"
                : attendanceEnabled
                ? "Close"
                : "Open"}
            </button>
          </div>
        }
      >
        <p className="text-sm text-ink-700 leading-relaxed">
          {attendanceEnabled
            ? "Workers will not be able to mark attendance until you reopen the window."
            : "Workers will be able to mark their attendance immediately. The "}
          {!attendanceEnabled && (
            <Tag tone="live" live>
              Live
            </Tag>
          )}
          {!attendanceEnabled && " indicator will appear app-wide while open."}
        </p>
      </MobileSheet>
    </div>
  );
}

function Cell({ label, value, tone, bold }) {
  const toneClass =
    tone === "forest"
      ? "text-forest"
      : tone === "brick"
      ? "text-brick"
      : tone === "mustard"
      ? "text-mustard"
      : "text-ink-900";
  return (
    <div>
      <dt className="qc-eyebrow">{label}</dt>
      <dd
        className={`mt-0.5 qc-num text-sm ${toneClass} ${
          bold ? "font-semibold" : "font-medium"
        }`}
      >
        {value ?? 0}
      </dd>
    </div>
  );
}

function TabButton({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-3 py-3.5 text-sm font-medium transition-colors min-h-touch ${
        active
          ? "text-ink-900"
          : "text-ink-500 hover:text-ink-700"
      }`}
      aria-pressed={active}
    >
      {children}
      <span className="qc-num text-2xs uppercase tracking-tag text-ink-400 ml-1.5">
        {count}
      </span>
      {active && (
        <span
          className="absolute left-2 right-2 -bottom-px h-0.5 bg-ink-900"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function SortableTh({ active, keyName, onSort, children, align = "left" }) {
  const isActive = active.key === keyName;
  return (
    <th
      onClick={() => onSort(keyName)}
      className={`qc-section-title px-4 py-2.5 cursor-pointer select-none hover:text-ink-900 transition-colors ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive ? (
          active.direction === "asc" ? (
            <ArrowUpIcon className="h-3 w-3" />
          ) : (
            <ArrowDownIcon className="h-3 w-3" />
          )
        ) : (
          <span className="opacity-0 group-hover:opacity-30">·</span>
        )}
      </span>
    </th>
  );
}

function CockpitTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-ink-200 rounded-md p-3 min-w-[140px]">
      <div className="text-xs font-medium text-ink-900">
        {data.fullName || label}
      </div>
      <div className="mt-1.5 space-y-0.5">
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-3 qc-num text-2xs uppercase tracking-tag"
          >
            <span className="flex items-center gap-1.5 text-ink-500">
              <span
                className="inline-block w-2 h-2"
                style={{ background: entry.color }}
              />
              {entry.name}
            </span>
            <span className="text-ink-900 font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="qc-eyebrow text-ink-400">No data</div>
      <p className="mt-2 text-base font-medium text-ink-900">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}
