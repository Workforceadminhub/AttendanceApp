import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import LoadingState from "../components/LoadingState";
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
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  PowerIcon,
} from "@heroicons/react/24/outline";

// Color palette for charts
const BAR_COLORS = {
  total: "#3b82f6",
  active: "#22c55e",
  pending: "#eab308",
};

const DIRECTORATE_ROW_BACKGROUNDS = [
  "bg-blue-50",
  "bg-green-50",
  "bg-yellow-50",
  "bg-purple-50",
  "bg-pink-50",
  "bg-indigo-50",
  "bg-orange-50",
  "bg-teal-50",
];

export default function SuperAdminOverview() {
  const navigate = useNavigate();
  // Progressive loading: split into section-level loading states
  const [isWorkersLoading, setIsWorkersLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [workerData, setWorkerData] = useState(null);
  const [attendanceInfo, setAttendanceInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("team"); // 'team' or 'department'
  const [sortConfig, setSortConfig] = useState({ key: "total", direction: "desc" });
  
  // Attendance control state (persist to localStorage so status survives page refresh)
  const [attendanceEnabled, setAttendanceEnabled] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("attendanceEnabled") || "false");
    } catch {
      return false;
    }
  });
  const [isTogglingAttendance, setIsTogglingAttendance] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);


  // Check if user is super admin
  useEffect(() => {
    const authUser = JSON.parse(sessionStorage.getItem("authUser"));
    if (!authUser || authUser.department !== "Super Admin") {
      toast.error("Access denied. Super Admin access required.");
      navigate("/login");
      return;
    }
  }, [navigate]);

  // Progressive loading: fetch workers and attendance data independently
  // Workers data doesn't depend on date range, so only fetch once on mount
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

  // Attendance data always uses the current Sunday (via getNextSunday fallback)
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

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  // Sort data based on current config
  const getSortedData = (data) => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (sortConfig.direction === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ArrowUpIcon className="h-3 w-3 inline-block ml-1" />
    ) : (
      <ArrowDownIcon className="h-3 w-3 inline-block ml-1" />
    );
  };

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.fullName || label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Metric card: flex reserves space for text (min-w-0) so icons never overlap values
  const MetricCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold tabular-nums text-gray-900 sm:text-3xl">
            {value}
          </p>
          {subtext && <p className="mt-1 text-xs text-gray-500 sm:text-sm">{subtext}</p>}
        </div>
        <div className={`shrink-0 rounded-full p-2.5 sm:p-3 ${color}`} aria-hidden>
          <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );

  // Handle attendance toggle (persist to localStorage)
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

  // Confirmation Modal Component
  const ConfirmationModal = () => (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowConfirmModal(false)} />
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${attendanceEnabled ? "bg-red-100" : "bg-green-100"} sm:mx-0 sm:h-10 sm:w-10`}>
                <PowerIcon className={`h-6 w-6 ${attendanceEnabled ? "text-red-600" : "text-green-600"}`} aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  {attendanceEnabled ? "Disable Attendance" : "Enable Attendance"}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {attendanceEnabled
                      ? "Are you sure you want to disable attendance? Workers will not be able to mark attendance until it is enabled again."
                      : "Are you sure you want to enable attendance? Workers will be able to mark their attendance."}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={handleAttendanceToggle}
              disabled={isTogglingAttendance}
              className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${
                attendanceEnabled
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-green-600 hover:bg-green-500"
              } ${isTogglingAttendance ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isTogglingAttendance ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                attendanceEnabled ? "Disable" : "Enable"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              disabled={isTogglingAttendance}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Destructure worker data
  const { overallStats, teamStats, departmentStats, teamChartData } = workerData || {};
  // Destructure attendance data
  const { attendanceStats, directorateStats, grandTotals } = attendanceInfo || {};

  const breakdownList =
    getSortedData(activeTab === "team" ? teamStats : departmentStats) ?? [];
  const hasNoBreakdownData =
    (!teamStats || teamStats.length === 0) &&
    (!departmentStats || departmentStats.length === 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8 bg-gray-50 min-h-screen">
      <Header />
      <Layout>
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Harvesters Gbagada Workforce Overview
              </h1>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh Data
            </button>
          </div>

          {/* Attendance Control Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${attendanceEnabled ? "bg-green-500" : "bg-gray-400"}`}>
                  <PowerIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Attendance Control</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">Current Status:</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        attendanceEnabled
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {attendanceEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isTogglingAttendance}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  attendanceEnabled
                    ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                    : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                } ${isTogglingAttendance ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <PowerIcon className="h-5 w-5 mr-2" />
                {attendanceEnabled ? "Disable Attendance" : "Enable Attendance"}
              </button>
            </div>
          </div>

          {/* Confirmation Modal */}
          {showConfirmModal && <ConfirmationModal />}

          {/* Metric Cards — show spinners per section until data loads */}
          {isWorkersLoading || isAttendanceLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              <MetricCard
                title="Total Workforce"
                value={overallStats?.totalWorkers || 0}
                icon={UsersIcon}
                color="bg-blue-500"
              />
              <MetricCard
                title="Present Workers"
                value={attendanceStats?.totalPresent || 0}
                icon={CheckCircleIcon}
                color="bg-green-500"
                subtext={attendanceStats?.lastAttendanceDate || ""}
              />
              <MetricCard
                title="% of Present"
                value={attendanceStats?.attendanceRate || "0%"}
                icon={ChartBarIcon}
                color="bg-teal-500"
                subtext={attendanceStats?.lastAttendanceDate || ""}
              />
              <MetricCard
                title="Absent Workers"
                value={attendanceStats?.totalAbsent || 0}
                icon={ClockIcon}
                color="bg-gray-500"
                subtext={attendanceStats?.lastAttendanceDate || ""}
              />
              <MetricCard
                title="Pending Approvals"
                value={overallStats?.pendingApprovals || 0}
                icon={UserPlusIcon}
                color="bg-yellow-500"
              />
              <MetricCard
                title="Pending Deletions"
                value={overallStats?.pendingDeletions || 0}
                icon={UserMinusIcon}
                color="bg-red-500"
              />
            </div>
          )}

          {/* Directorate Attendance Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Attendance Report ({attendanceStats?.lastAttendanceDate || ""})
              </h3>
            </div>
            {isAttendanceLoading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingState />
              </div>
            ) : !directorateStats || directorateStats.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-500">
                <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium">No attendance data available</p>
                <p className="text-sm">Attendance data will appear here once loaded.</p>
              </div>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="sm:hidden p-4 space-y-3">
                  {directorateStats.map((directorate, dirIndex) => {
                    const bgColor =
                      DIRECTORATE_ROW_BACKGROUNDS[dirIndex % DIRECTORATE_ROW_BACKGROUNDS.length];
                    return directorate.teams.map((team) => (
                      <div
                        key={`${directorate.directorate}-${team.team}`}
                        className={`rounded-xl border border-gray-200/90 p-4 ${bgColor}`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {directorate.directorate}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{team.team}</p>
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <dt className="text-gray-500">Team strength</dt>
                            <dd className="mt-0.5 font-medium text-gray-900">{team.total}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Present</dt>
                            <dd className="mt-0.5">
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                {team.present}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">% Present</dt>
                            <dd className="mt-0.5">
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                {team.percentage}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Absent</dt>
                            <dd className="mt-0.5">
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                {team.absent}
                              </span>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ));
                  })}
                  {grandTotals && (
                    <div className="rounded-xl border-2 border-gray-300 bg-gray-100 p-4">
                      <p className="text-sm font-bold text-gray-900">TOTAL</p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-gray-600">Team strength</dt>
                          <dd className="mt-0.5 font-bold text-gray-900">{grandTotals.total}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-600">Present</dt>
                          <dd className="mt-0.5">
                            <span className="inline-flex items-center rounded-full bg-green-200 px-2.5 py-0.5 text-xs font-bold text-green-900">
                              {grandTotals.present}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-600">% Present</dt>
                          <dd className="mt-0.5">
                            <span className="inline-flex items-center rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-900">
                              {grandTotals.percentage}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-600">Absent</dt>
                          <dd className="mt-0.5">
                            <span className="inline-flex items-center rounded-full bg-red-200 px-2.5 py-0.5 text-xs font-bold text-red-900">
                              {grandTotals.absent}
                            </span>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>

                {/* sm+: table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Directorate
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Teams
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Team Strength
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Present
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % of Present
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Absent
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {directorateStats.map((directorate, dirIndex) => {
                        const bgColor =
                          DIRECTORATE_ROW_BACKGROUNDS[dirIndex % DIRECTORATE_ROW_BACKGROUNDS.length];
                        return directorate.teams.map((team, teamIndex) => (
                          <tr
                            key={`${directorate.directorate}-${team.team}`}
                            className={`${bgColor} hover:opacity-80`}
                          >
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {teamIndex === 0 ? directorate.directorate : ""}
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                              {team.team}
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-center font-medium">
                              {team.total}
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {team.present}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {team.percentage}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {team.absent}
                              </span>
                            </td>
                          </tr>
                        ));
                      })}
                      {grandTotals && (
                        <tr className="bg-gray-100 font-bold">
                          <td
                            className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900"
                            colSpan="2"
                          >
                            TOTAL
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-bold">
                            {grandTotals.total}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-200 text-green-900">
                              {grandTotals.present}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-200 text-blue-900">
                              {grandTotals.percentage}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-200 text-red-900">
                              {grandTotals.absent}
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6">
            {/* Bar Chart - Workers by Team */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                Workers by Team
              </h3>
              {isWorkersLoading ? (
                <div className="h-64 sm:h-80 flex items-center justify-center">
                  <LoadingState />
                </div>
              ) : teamChartData && teamChartData.length > 0 ? (
                <div className="h-[280px] w-full min-w-0 sm:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <BarChart
                    data={teamChartData}
                    margin={{ top: 12, right: 8, left: 4, bottom: 56 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar dataKey="active" name="Active" fill={BAR_COLORS.active} stackId="a" />
                    <Bar dataKey="pending" name="Pending" fill={BAR_COLORS.pending} stackId="a" />
                  </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 sm:h-80 flex items-center justify-center text-gray-500">
                  <p>No chart data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Tables */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav
                className="flex flex-wrap gap-x-3 gap-y-1 px-4 sm:px-6"
                aria-label="Tabs"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("team")}
                  className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === "team"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Team ({teamStats?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("department")}
                  className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === "department"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Department ({departmentStats?.length || 0})
                </button>
              </nav>
            </div>

            {isWorkersLoading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingState />
              </div>
            ) : hasNoBreakdownData ? (
              <div className="text-center py-12 px-4 text-gray-500">
                <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm">Worker data will appear here once loaded.</p>
              </div>
            ) : (
              <>
                <div className="sm:hidden space-y-3 p-4">
                  {breakdownList.map((item, index) => (
                    <div
                      key={`${item.team || ""}-${item.department || ""}-${index}`}
                      className="rounded-xl border border-gray-200 bg-gray-50/80 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {activeTab === "team" ? item.team : item.department}
                      </p>
                      {activeTab === "department" && (
                        <p className="mt-0.5 text-xs text-gray-600">
                          Team: <span className="font-medium">{item.team}</span>
                        </p>
                      )}
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-gray-500">Total</dt>
                          <dd className="mt-0.5 font-semibold text-gray-900">{item.total}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Active</dt>
                          <dd className="mt-0.5">
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              {item.active}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Pending add</dt>
                          <dd className="mt-0.5">
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                              {item.pendingAdd}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Pending delete</dt>
                          <dd className="mt-0.5">
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              {item.pendingDelete}
                            </span>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th
                          className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort(activeTab === "team" ? "team" : "department")}
                        >
                          {activeTab === "team" ? "Team" : "Department"}
                          {getSortIcon(activeTab === "team" ? "team" : "department")}
                        </th>
                        {activeTab === "department" && (
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
                          </th>
                        )}
                        <th
                          className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("total")}
                        >
                          Total {getSortIcon("total")}
                        </th>
                        <th
                          className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("active")}
                        >
                          Active {getSortIcon("active")}
                        </th>
                        <th
                          className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("pendingAdd")}
                        >
                          Pending Add {getSortIcon("pendingAdd")}
                        </th>
                        <th
                          className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("pendingDelete")}
                        >
                          Pending Delete {getSortIcon("pendingDelete")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {breakdownList.map((item, index) => (
                        <tr key={item.team || item.department} className="hover:bg-gray-50">
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {activeTab === "team" ? item.team : item.department}
                          </td>
                          {activeTab === "department" && (
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.team}
                            </td>
                          )}
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {item.total}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              {item.active}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                              {item.pendingAdd}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              {item.pendingDelete}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </Layout>
    </div>
  );
}
