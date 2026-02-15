import { useEffect, useState, useCallback } from "react";
import {
  calculateTotals,
  fetchAdminAttendance,
  fetchAttendance,
} from "../../services/attendance";
import Header from "../Header";
import { getNextSunday, getSundayDisplayDate } from "../../utils/getDate";
import { useLocation } from "react-router-dom";
import { getDepartmentByUser } from "../../utils/getDepartment";
import LoadingState from "../LoadingState";
import Layout from "../Layout";
import { toast } from "react-toastify";
import { ADMIN_ENUMS } from "../../utils/enums";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import ReactSelectDropdown from "../ReactSelect";
import { getAdminSelectOptions } from "../../utils/routeObject";
import { filterByUserPermissions } from "../../utils/filterByPermissions";
import { getUser } from "../../utils/getUser";
import { debounce } from "lodash";
import { DEBOUNCE_INTERVAL } from "../../utils/constants";
import ViewHistoryButton from "../ViewHistoryButton";
import DateRangeFilter from "../DateRangeFilter";
import BirthdayWidget from "../BirthdayWidget";
import InactiveWorkersWidget from "../InactiveWorkersWidget";
import AttendanceLeaderboard from "../AttendanceLeaderboard";
import { format } from "date-fns";

export default function Dashboard() {
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState("All");
  const location = useLocation();
  const pathname = location.pathname;
  const team = getDepartmentByUser(pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isAdminMember = checkAdminStatus(pathname);
  const authUser = getUser();
  const options = getAdminSelectOptions(isChurchAdmin, team, authUser);


  // Phase 7: Date range state
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setDateRange({ startDate, endDate });
  }, []);

  const startDateStr = dateRange.startDate
    ? format(dateRange.startDate, "yyyy-MM-dd")
    : null;
  const endDateStr = dateRange.endDate
    ? format(dateRange.endDate, "yyyy-MM-dd")
    : null;

  // Phase 7: Use date range endDate when available, else latest service date
  const dateForAttendance = endDateStr || getNextSunday();

  const queryAdminAttendance = () => {
    setIsLoading(true);
    const permissions = authUser?.permissions ?? [];
    fetchAdminAttendance(activeGroup, isChurchAdmin, dateForAttendance, startDateStr, endDateStr, permissions)
      .then((attendance) => {
        const filtered = filterByUserPermissions(attendance ?? [], authUser, pathname);
        setAttendanceSummary(calculateTotals(filtered));
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        // Silent error handling
        toast.error(`Error loading summary: ${error.message}`);
      });
  };

  const queryAttendance = () => {
    setIsLoading(true);
    const permissions = authUser?.permissions ?? [];
    fetchAttendance(dateForAttendance, startDateStr, endDateStr, permissions)
      .then((attendance) => {
        const filtered = filterByUserPermissions(attendance ?? [], authUser, pathname);
        setAttendanceSummary(calculateTotals(filtered));
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast.error(`Error loading summary: ${error.message}`);
      });
  };

  // Phase 7: Refetch when activeGroup, date range, or admin status changes
  useEffect(() => {
    if (isAdminMember) {
      queryAdminAttendance();
    } else {
      queryAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, isChurchAdmin, isAdminMember]);

  useEffect(() => {
    setIsLoading(true);
    const permissions = authUser?.permissions ?? [];
    fetchAttendance(null, startDateStr, endDateStr, permissions).then((attendance) => {
      const filtered = filterByUserPermissions(attendance ?? [], authUser, pathname);
      setAttendanceSummary(calculateTotals(filtered));
      setIsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debouncedSetActiveGroup = debounce(
    (value) => setActiveGroup(value),
    DEBOUNCE_INTERVAL
  );

  const handleChange = (selected) => {
    debouncedSetActiveGroup(selected?.value);
  };

  // Determine department for widgets
  const widgetDepartment = isAdminMember
    ? activeGroup === "All"
      ? "All"
      : activeGroup
    : team?.department || "All";

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        {/* <h3 className="text-base font-semibold text-gray-900">Last 30 days</h3> */}
        <div className="flex justify-between">
          <div className="flex flex-col space-y-4 font-bold">
            {/* <Select title="Select service" options={services} /> */}
            {`${team?.team} Dashboard`} - {getSundayDisplayDate(endDateStr)}
          </div>
          {isAdminMember && (
            <ViewHistoryButton
              label="View History"
              link={
                isChurchAdmin
                  ? `/dashboard/history/admin`
                  : `/dashboard/history/admin/${team.department}`
              }
            />
          )}
        </div>

        {/* Phase 7: Date Range Filter and Team/Department Selector - same line */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
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
        </div>

        {isLoading && (
          <div className="ml-24 mt-24">
            <LoadingState />
          </div>
        )}

        <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Phase 7: Attendance Leaderboard & Birthday Widget - 2-column grid */}
        {isAdminMember && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {startDateStr && endDateStr && (
              <AttendanceLeaderboard
                department={widgetDepartment}
                startDate={startDateStr}
                endDate={endDateStr}
              />
            )}
            <BirthdayWidget department={widgetDepartment} />
            <div className="lg:col-span-2">
              <InactiveWorkersWidget department={widgetDepartment} />
            </div>
          </div>
        )}
      </Layout>
    </div>
  );
}
