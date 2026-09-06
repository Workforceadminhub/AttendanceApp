import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  calculateTotals,
  fetchAdminAttendance,
  fetchAttendance,
} from "../../services/attendance";
import Header from "../Header";
import { getNextSunday, getSundayDisplayDate, getSundaysInYear } from "../../utils/getDate";
import { Link, useLocation } from "react-router-dom";
import { getDepartmentByUser } from "../../utils/getDepartment";
import LoadingState from "../LoadingState";
import Layout from "../Layout";
import { toast } from "react-toastify";
import { ADMIN_ENUMS } from "../../utils/enums";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import ReactSelectDropdown from "../ReactSelect";
import { getRouteContext } from "../../utils/routeObject";
import { useAdminSelectOptions } from "../../contexts/DepartmentsContext";
import { filterByUserPermissions } from "../../utils/filterByPermissions";
import { expandPermissions } from "../../utils/expandPermissions";
import { getUser } from "../../utils/getUser";
import { getUserRole } from "../../utils/getUserRole";
import { debounce } from "lodash";
import { DEBOUNCE_INTERVAL } from "../../utils/constants";
import { getActiveMeeting } from "../../utils/meetingConfig";
import BirthdayWidget from "../BirthdayWidget";
import SundayWorkersAttendanceTable from "./SundayWorkersAttendanceTable";
import Stat from "../ui/Stat";
import Tag from "../ui/Tag";
import MobileSheet from "../ui/MobileSheet";
import { enableAttendance } from "../../services/enableAttendance";
import { disableAttendance } from "../../services/disableAttendance";
import {
  ClipboardDocumentCheckIcon,
  TableCellsIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

/**
 * Window status: open Sunday 00:00–18:00 WAT (Africa/Lagos, UTC+1, no DST).
 * Anchored to WAT so the countdown is identical for viewers in any timezone.
 */
function getAttendanceWindowStatus() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  })
    .formatToParts(now)
    .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});

  const watYear = parseInt(parts.year, 10);
  const watMonth = parseInt(parts.month, 10) - 1;
  const watDay = parseInt(parts.day, 10);
  const watHour = parseInt(parts.hour === "24" ? "0" : parts.hour, 10);
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const watDow = weekdayMap[parts.weekday];

  if (watDow === 0 && watHour < 18) {
    // 18:00 WAT == 17:00 UTC (WAT is fixed UTC+1).
    const closesAt = new Date(Date.UTC(watYear, watMonth, watDay, 17, 0, 0));
    const diffMs = closesAt - now;
    const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
    const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      isOpen: true,
      message: `Open - closes 6:00 PM WAT today`,
      remaining: `${hoursLeft}h ${minsLeft}m`,
    };
  }

  const daysUntilSunday = watDow === 0 ? 7 : 7 - watDow;
  // Synthesize the next-Sunday WAT calendar date via UTC arithmetic on WAT components.
  const nextSundayWat = new Date(Date.UTC(watYear, watMonth, watDay + daysUntilSunday));
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    isOpen: false,
    message: `Closed - opens Sunday`,
    remaining: `${nextSundayWat.getUTCDate()} ${months[nextSundayWat.getUTCMonth()]} · 00:00`,
  };
}

export default function Dashboard() {
  const [activeGroup, setActiveGroup] = useState("All");
  const location = useLocation();
  const pathname = location.pathname;
  const team = getDepartmentByUser(pathname);
  const { isSubTeamAdmin, isTeamAdmin, isSuperAdmin, isChurchAdmin: isChurchAdminRole } = getUserRole();
  // Super Admin gets the campus-wide (Church Admin) dashboard: same data, same layout.
  const isChurchAdmin = isChurchAdminRole || isSuperAdmin;
  const isAdminMember = isChurchAdmin || checkAdminStatus(pathname);
  const authUser = useMemo(() => getUser(), []);
  const options = useAdminSelectOptions(isChurchAdmin, team, authUser);

  const departmentInfo = useMemo(
    () => getRouteContext(pathname, authUser),
    [pathname, authUser]
  );
  const summaryHref = authUser?.route
    ? `/department/${authUser.route.replace(/^\//, "").replace(/^admin\//, "")}`
    : departmentInfo?.route
    ? `/department/${departmentInfo.route.replace(/^\//, "").replace(/^admin\//, "")}`
    : "/summary";

  const defaultDate = getNextSunday();
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  const [attendanceStatus, setAttendanceStatus] = useState(getAttendanceWindowStatus);
  useEffect(() => {
    const interval = setInterval(() => {
      setAttendanceStatus(getAttendanceWindowStatus());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Super Admin can manually open/close the attendance window; other roles
  // only see the schedule-based status banner.
  const [attendanceEnabled, setAttendanceEnabled] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("attendanceEnabled") || "false");
    } catch {
      return false;
    }
  });
  const [isTogglingAttendance, setIsTogglingAttendance] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  const sundayOptions = useMemo(() => {
    const sundays = getSundaysInYear();
    return sundays.map((s) => ({
      value: s,
      label: getSundayDisplayDate(s),
    }));
  }, []);

  const permissions = useMemo(() => expandPermissions(authUser), [authUser]);
  const permissionsKey = useMemo(() => permissions.join(","), [permissions]);

  const {
    data: rawAttendance,
    isLoading,
    error: attendanceError,
  } = useQuery({
    queryKey: [
      "dashboardAttendance",
      isAdminMember ? "admin" : "user",
      activeGroup,
      isChurchAdmin,
      selectedDate,
      permissionsKey,
    ],
    queryFn: () => {
      if (isAdminMember) {
        return fetchAdminAttendance(activeGroup, isChurchAdmin, selectedDate, null, null, permissions);
      }
      return fetchAttendance(selectedDate, null, null, permissions);
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (attendanceError) toast.error(`Error loading summary: ${attendanceError.message}`);
  }, [attendanceError]);

  const filteredAttendance = useMemo(
    () => filterByUserPermissions(rawAttendance ?? [], authUser, pathname),
    [rawAttendance, authUser, pathname]
  );
  const attendanceSummary = useMemo(
    () => calculateTotals(filteredAttendance),
    [filteredAttendance]
  );
  const departmentSummaryRows = useMemo(
    () => (Array.isArray(filteredAttendance) ? filteredAttendance : []),
    [filteredAttendance]
  );
  const unmarkedCount = useMemo(() => {
    const dept = departmentInfo?.department;
    if (dept == null) return null;
    const deptItem = (filteredAttendance ?? []).find(
      (item) => (item.department || item.department_name) === dept
    );
    const n = deptItem?.unfilled;
    if (typeof n === "number") return n;
    if (Array.isArray(n)) return n.length;
    return 0;
  }, [filteredAttendance, departmentInfo]);

  const debouncedSetActiveGroup = debounce(
    (value) => setActiveGroup(value),
    DEBOUNCE_INTERVAL
  );
  const handleChange = (selected) => debouncedSetActiveGroup(selected?.value);

  const debouncedSetSelectedDate = debounce(
    (value) => setSelectedDate(value),
    DEBOUNCE_INTERVAL
  );
  const handleDateChange = (selected) => {
    if (selected?.value) {
      debouncedSetSelectedDate(selected.value);
    } else {
      debouncedSetSelectedDate(defaultDate);
    }
  };

  const widgetDepartment = isAdminMember
    ? activeGroup === "All"
      ? "All"
      : activeGroup
    : team?.department || "All";

  const quickLinks = useMemo(() => {
    const links = [];
    if (departmentInfo) {
      if (!isSubTeamAdmin) {
        links.push({
          label: "Mark Attendance",
          href: `/attendance${departmentInfo.route}`,
          icon: ClipboardDocumentCheckIcon,
        });
      }
      links.push({
        label: "View Summary",
        href: summaryHref,
        icon: TableCellsIcon,
      });
      links.push({
        label: "View Workers",
        href: `/department/${departmentInfo.route.replace(/^\//, "")}/workers`,
        icon: UserGroupIcon,
      });
    }
    return links;
  }, [departmentInfo, isSubTeamAdmin, summaryHref]);

  const scope = isSuperAdmin
    ? ADMIN_ENUMS.ADMIN_TEAM
    : isAdminMember
    ? team?.team
    : team?.department;

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        {/* Page heading */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="qc-eyebrow">
              {isAdminMember ? "Admin" : "Department"} dashboard
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight truncate">
              {scope}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              For{" "}
              <span className="qc-num text-ink-900">
                {getSundayDisplayDate(selectedDate)}
              </span>
            </p>
          </div>
          {isAdminMember && (isChurchAdmin || isTeamAdmin || authUser?.department === "Super Admin" || authUser?.permissionLevel === "SUPER_ADMIN") && (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Determine which meeting type to show - pick the one whose date is closest to today
            const leadersMeeting = getActiveMeeting("leaders");
            const workersMeeting = getActiveMeeting("workers");

            const toDate = (d) => { const [y, m, day] = d.split("-").map(Number); return new Date(y, m - 1, day); };
            const lDate = toDate(leadersMeeting.date);
            const wDate = toDate(workersMeeting.date);

            // Pick the meeting whose date is nearest to today (upcoming preferred, else most recent)
            const lDiff = Math.abs(lDate - today);
            const wDiff = Math.abs(wDate - today);
            const activeMeeting = lDiff <= wDiff ? leadersMeeting : workersMeeting;
            const activeDate = lDiff <= wDiff ? lDate : wDate;
            const isLeaders = activeMeeting.meetingType === "leaders";

            // Pre-meeting: show Confirmation. On/post meeting day: show Report
            const isPreMeeting = today < activeDate;
            const label = isPreMeeting
              ? `${isLeaders ? "Leaders" : "Workers"} Meeting Confirmation`
              : `${isLeaders ? "Leaders" : "Workers"} Meeting Report`;
            const href = isPreMeeting
              ? (isLeaders ? "/report/confirmation-leaders-meeting" : "/report/confirmation-workers-meeting")
              : (isLeaders ? "/report/leaders-meeting" : "/report/workers-meeting");

            return (
              <Link
                to={href}
                className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-ink transition hover:bg-ink-100 shrink-0"
              >
                {label}
              </Link>
            );
          })()}
        </div>

        {/* Attendance window: Super Admin controls it, everyone else sees status */}
        {isSuperAdmin ? (
          <div
            className={`qc-card mb-6 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
              attendanceEnabled ? "border-sienna/40 bg-sienna/[0.03]" : ""
            }`}
          >
            <div className="flex flex-col">
              <div className="qc-eyebrow">Attendance window</div>
              <div className="mt-1 flex items-center gap-3">
                <Tag
                  tone={attendanceEnabled ? "live" : "neutral"}
                  live={attendanceEnabled}
                >
                  {attendanceEnabled ? "Live · Accepting" : "Closed"}
                </Tag>
                {attendanceEnabled && (
                  <span className="qc-num text-2xs uppercase tracking-tag text-sienna-dark">
                    Workers can mark
                  </span>
                )}
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
        ) : (
          <div
            className={`qc-card mb-6 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 ${
              attendanceStatus.isOpen
                ? "border-sienna/40 bg-sienna/[0.03]"
                : ""
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Tag
                tone={attendanceStatus.isOpen ? "live" : "neutral"}
                live={attendanceStatus.isOpen}
              >
                {attendanceStatus.isOpen ? "Live" : "Closed"}
              </Tag>
              <div className="text-sm text-ink-700 min-w-0 truncate">
                {attendanceStatus.message}
              </div>
            </div>
            <div className="qc-num text-2xs uppercase tracking-tag text-ink-500">
              {attendanceStatus.remaining}
            </div>
          </div>
        )}

        {/* Filters row */}
        <div className="mb-6 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          {isAdminMember && (
            <div className="w-full min-w-0 sm:w-auto sm:max-w-[260px] sm:flex-1">
              <div className="qc-label">
                {isChurchAdmin ? "Team" : "Department"}
              </div>
              <ReactSelectDropdown
                title=""
                defaultValue={{ value: "All", label: "All teams/departments" }}
                onChange={handleChange}
                options={[
                  { value: "All", label: "All teams/departments" },
                  ...options,
                ]}
                className="w-full min-w-0 sm:min-w-[200px] md:w-[220px] lg:w-[260px]"
              />
            </div>
          )}
          <div className="w-full min-w-0 sm:w-auto sm:max-w-[280px] sm:flex-1">
            <div className="qc-label">Sunday</div>
            <ReactSelectDropdown
              title=""
              defaultValue={{
                value: defaultDate,
                label: getSundayDisplayDate(defaultDate),
              }}
              onChange={handleDateChange}
              options={sundayOptions}
              className="w-full min-w-0 sm:min-w-[220px] md:w-[250px] lg:w-[280px]"
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <LoadingState />
          </div>
        )}

        {/* Summary stats + Birthdays */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attendanceSummary.map((item) => (
              <Stat
                key={item.name}
                eyebrow={item.name}
                value={item.stat}
                loading={isLoading && !attendanceSummary.length}
              />
            ))}
          </div>

          <div className="w-full">
            <BirthdayWidget department={widgetDepartment} />
          </div>
        </div>

        {/* Sunday Workers Attendance Table - untouched and active */}
        {isAdminMember && isChurchAdmin && departmentSummaryRows.length > 0 && (
          <div className="flow-root mb-8">
            <SundayWorkersAttendanceTable
              rows={departmentSummaryRows}
              selectedDate={selectedDate}
            />
          </div>
        )}

        {/* Unmarked alert - sienna because it's an active "act now" cue */}
        {!isLoading && unmarkedCount !== null && unmarkedCount > 0 && departmentInfo && (
          <Link
            to={`/attendance${departmentInfo.route}`}
            className="qc-card mb-6 border-sienna/40 bg-sienna/[0.04] hover:bg-sienna/[0.08] transition-colors flex items-center gap-3 px-4 sm:px-5 py-4"
          >
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-sienna" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink-900">
                <span className="qc-num">{unmarkedCount}</span> unmarked
                worker{unmarkedCount !== 1 ? "s" : ""}
              </div>
              <div className="qc-num text-2xs uppercase tracking-tag text-ink-500 mt-0.5">
                {getSundayDisplayDate(selectedDate)}
              </div>
            </div>
            <span className="shrink-0 text-sm font-medium text-sienna-dark whitespace-nowrap">
              Mark now →
            </span>
          </Link>
        )}

        {/* Quick links - hairline tiles */}
        {quickLinks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="qc-card hover:bg-cream-200 transition-colors flex items-center gap-3 px-4 py-3.5 group"
              >
                <link.icon className="h-5 w-5 shrink-0 text-ink-700 group-hover:text-ink-900" />
                <span className="text-sm font-medium text-ink-900 flex-1">
                  {link.label}
                </span>
                <span
                  className="text-ink-400 group-hover:text-ink-700"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </Layout>

      {/* Super Admin: attendance window toggle confirmation */}
      {isSuperAdmin && (
        <MobileSheet
          open={showConfirmModal}
          onClose={() => !isTogglingAttendance && setShowConfirmModal(false)}
          title={
            attendanceEnabled
              ? "Close attendance window"
              : "Open attendance window"
          }
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
      )}
    </div>
  );
}
