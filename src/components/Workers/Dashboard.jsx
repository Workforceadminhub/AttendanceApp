import { useEffect, useState, useMemo } from "react";
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
import { getAdminSelectOptions, routeObject } from "../../utils/routeObject";
import { filterByUserPermissions } from "../../utils/filterByPermissions";
import { getUser } from "../../utils/getUser";
import { getUserRole } from "../../utils/getUserRole";
import { debounce } from "lodash";
import { DEBOUNCE_INTERVAL } from "../../utils/constants";
import BirthdayWidget from "../BirthdayWidget";
import AdminDepartmentSummaryTable from "./AdminDepartmentSummaryTable";
import SundayWorkersAttendanceTable from "./SundayWorkersAttendanceTable";
import {
  ClipboardDocumentCheckIcon,
  TableCellsIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

/**
 * Checks if the attendance window is currently open.
 * Attendance opens at 12:00 AM Sunday and closes at 6:00 PM Sunday.
 */
function getAttendanceWindowStatus() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const hour = now.getHours();

  if (day === 0 && hour < 18) {
    // Sunday before 6pm — open
    const closesAt = new Date(now);
    closesAt.setHours(18, 0, 0, 0);
    const diffMs = closesAt - now;
    const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
    const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      isOpen: true,
      message: `Attendance is open — closes at 6:00 PM today (${hoursLeft}h ${minsLeft}m remaining)`,
    };
  }

  // Calculate next Sunday 12:00 AM
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    isOpen: false,
    message: `Attendance is closed — opens Sunday ${nextSunday.getDate()} ${months[nextSunday.getMonth()]} at 12:00 AM`,
  };
}

export default function Dashboard() {
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [departmentSummaryRows, setDepartmentSummaryRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState("All");
  const [unmarkedCount, setUnmarkedCount] = useState(null);
  const [unmarkedLoading, setUnmarkedLoading] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;
  const team = getDepartmentByUser(pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isAdminMember = checkAdminStatus(pathname);
  const authUser = getUser();
  const options = getAdminSelectOptions(isChurchAdmin, team, authUser);

  // Extract route suffix from pathname (e.g. "/dashboard/wadata" -> "/wadata")
  const routeSuffix = pathname.replace(/^\/dashboard/, "") || "";
  const departmentInfo = routeObject.find((r) => r.route === routeSuffix);
  const summaryHref = authUser?.route
    ? `/department/${authUser.route.replace(/^\//, "")}`
    : "/summary";

  const defaultDate = getNextSunday();
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  // Attendance window status (updates every minute)
  const [attendanceStatus, setAttendanceStatus] = useState(getAttendanceWindowStatus);
  useEffect(() => {
    const interval = setInterval(() => {
      setAttendanceStatus(getAttendanceWindowStatus());
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  // Generate Sunday options for the dropdown
  const sundayOptions = useMemo(() => {
    const sundays = getSundaysInYear();
    return sundays.map((s) => ({
      value: s,
      label: getSundayDisplayDate(s),
    }));
  }, []);

  const setUnmarkedFromAttendance = (filtered) => {
    const dept = departmentInfo?.department;
    if (dept == null) {
      setUnmarkedCount(null);
      return;
    }
    const deptItem = (filtered ?? []).find(
      (item) => (item.department || item.department_name) === dept
    );
    const n = deptItem?.unfilled;
    setUnmarkedCount(typeof n === "number" ? n : n != null && Array.isArray(n) ? n.length : 0);
  };

  const queryAdminAttendance = () => {
    setIsLoading(true);
    setUnmarkedLoading(true);
    const permissions = authUser?.permissions ?? [];
    fetchAdminAttendance(activeGroup, isChurchAdmin, selectedDate, null, null, permissions)
      .then((attendance) => {
        const filtered = filterByUserPermissions(attendance ?? [], authUser, pathname);
        setAttendanceSummary(calculateTotals(filtered));
        setDepartmentSummaryRows(Array.isArray(filtered) ? filtered : []);
        setUnmarkedFromAttendance(filtered);
        setIsLoading(false);
        setUnmarkedLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        setUnmarkedLoading(false);
        setUnmarkedCount(null);
        toast.error(`Error loading summary: ${error.message}`);
      });
  };

  const queryAttendance = () => {
    setIsLoading(true);
    setUnmarkedLoading(true);
    const permissions = authUser?.permissions ?? [];
    fetchAttendance(selectedDate, null, null, permissions)
      .then((attendance) => {
        const filtered = filterByUserPermissions(attendance ?? [], authUser, pathname);
        setAttendanceSummary(calculateTotals(filtered));
        setUnmarkedFromAttendance(filtered);
        setIsLoading(false);
        setUnmarkedLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        setUnmarkedLoading(false);
        setUnmarkedCount(null);
        toast.error(`Error loading summary: ${error.message}`);
      });
  };

  // Refetch when activeGroup, selectedDate, or admin status changes
  useEffect(() => {
    if (isAdminMember) {
      queryAdminAttendance();
    } else {
      queryAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, isChurchAdmin, isAdminMember, selectedDate]);

  const debouncedSetActiveGroup = debounce(
    (value) => setActiveGroup(value),
    DEBOUNCE_INTERVAL
  );

  const handleChange = (selected) => {
    debouncedSetActiveGroup(selected?.value);
  };

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

  // Determine department for widgets
  const widgetDepartment = isAdminMember
    ? activeGroup === "All"
      ? "All"
      : activeGroup
    : team?.department || "All";

  // Quick links (hide Mark Attendance for sub team head)
  const { isSubTeamAdmin } = getUserRole();
  const quickLinks = useMemo(() => {
    const links = [];
    if (departmentInfo) {
      if (!isSubTeamAdmin) {
        links.push({
          label: "Mark Attendance",
          href: `/attendance${departmentInfo.route}`,
          icon: ClipboardDocumentCheckIcon,
          color: "bg-green-50 text-green-700 hover:bg-green-100",
        });
      }
      links.push({
        label: "View Summary",
        href: summaryHref,
        icon: TableCellsIcon,
        color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
      });
      links.push({
        label: "View Workers",
        href: `/department/${departmentInfo.route.replace(/^\//, "")}/workers`,
        icon: UserGroupIcon,
        color: "bg-purple-50 text-purple-700 hover:bg-purple-100",
      });
    }
    return links;
  }, [departmentInfo, isSubTeamAdmin, summaryHref]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        <div className="flex justify-between items-start">
          <div className="flex flex-col space-y-4 font-bold">
            {`${isAdminMember ? team?.team : team?.department} Dashboard`} - {getSundayDisplayDate(selectedDate)}
          </div>
        </div>

        {/* Attendance Window Status Banner */}
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
            attendanceStatus.isOpen
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-gray-200 bg-gray-50 text-gray-600"
          }`}
        >
          <ClockIcon className={`h-5 w-5 flex-shrink-0 ${attendanceStatus.isOpen ? "text-green-600" : "text-gray-400"}`} />
          <span>{attendanceStatus.message}</span>
          {attendanceStatus.isOpen && (
            <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>

        {/* Filters row */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {isAdminMember && (
            <div className="shrink-0">
              <ReactSelectDropdown
                title={isChurchAdmin ? "Select Team" : "Select Department"}
                defaultValue={{ value: "All", label: "All teams/departments" }}
                onChange={handleChange}
                options={[
                  { value: "All", label: "All teams/departments" },
                  ...options,
                ]}
                className="lg:w-[220px] md:w-[200px] sm:w-[180px] min-w-[180px]"
              />
            </div>
          )}
          <div className="shrink-0">
            <ReactSelectDropdown
              title="Select Sunday"
              defaultValue={{
                value: defaultDate,
                label: getSundayDisplayDate(defaultDate),
              }}
              onChange={handleDateChange}
              options={sundayOptions}
              className="lg:w-[280px] md:w-[250px] sm:w-[220px] min-w-[220px]"
            />
          </div>
        </div>

        {isLoading && (
          <div className="ml-24 mt-24">
            <LoadingState />
          </div>
        )}

        {/* Summary + Birthdays row */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Summary Cards (left) */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {attendanceSummary.map((item) => (
              <div
                key={item.name}
                className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6"
              >
                <dt className="truncate text-sm font-medium text-gray-500">
                  {item.name}
                </dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                  {item.stat}
                </dd>
              </div>
            ))}
          </dl>

          {/* Birthday Widget (right) */}
          <div className="w-full">
            <BirthdayWidget department={widgetDepartment} />
          </div>
        </div>

        {/* Church Admin: Sunday Workers Attendance table (home) */}
        {isAdminMember && isChurchAdmin && departmentSummaryRows.length > 0 && (
          <div className="flow-root">
            <SundayWorkersAttendanceTable
              rows={departmentSummaryRows}
              selectedDate={selectedDate}
            />
          </div>
        )}

        {/* Church Admin: Per-department attendance summary table (unchanged) */}
        {isAdminMember && isChurchAdmin && departmentSummaryRows.length > 0 && (
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <AdminDepartmentSummaryTable rows={departmentSummaryRows} showLinks />
              </div>
            </div>
          </div>
        )}

        {/* Unmarked Workers Alert */}
        {!unmarkedLoading && unmarkedCount !== null && unmarkedCount > 0 && departmentInfo && (
          <div className="mt-6">
            <Link
              to={`/attendance${departmentInfo.route}`}
              className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm hover:bg-amber-100 transition-colors"
            >
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {unmarkedCount} Unmarked Worker{unmarkedCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-amber-600">
                  Workers without attendance for {getSundayDisplayDate(selectedDate)}
                </p>
              </div>
              <span className="text-sm font-medium text-amber-700 whitespace-nowrap">
                Mark Now &rarr;
              </span>
            </Link>
          </div>
        )}

        {/* Quick Links */}
        {quickLinks.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-sm transition-colors ${link.color}`}
              >
                <link.icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        )}

      </Layout>
    </div>
  );
}
