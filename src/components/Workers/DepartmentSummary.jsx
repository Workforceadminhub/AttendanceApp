import { useEffect, useState, useCallback, useMemo } from "react";
import Header from "../Header";
import {
  fetchAdminAttendance,
  fetchAttendance,
} from "../../services/attendance";
import { getAdminSelectOptions, getEffectiveRouteList } from "../../utils/routeObject";
import getDefaultSummary from "../../utils/getDefaultSummary";
import { getDepartmentByUser } from "../../utils/getDepartment";
import { Navigate, useLocation } from "react-router-dom";
import TableLoadingState from "../TableLoadingState";
import Layout from "../Layout";
import { ADMIN_ENUMS } from "../../utils/enums";
import ReactSelectDropdown from "../ReactSelect";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import { filterByUserPermissions } from "../../utils/filterByPermissions";
import { getUser } from "../../utils/getUser";
import { expandPermissions } from "../../utils/expandPermissions";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import { getUserRole } from "../../utils/getUserRole";
import { DEBOUNCE_INTERVAL } from "../../utils/constants";
import ViewHistoryButton from "../ViewHistoryButton";
import DateRangeFilter from "../DateRangeFilter";
import { format } from "date-fns";
import AdminDepartmentSummaryTable from "./AdminDepartmentSummaryTable";

export default function DepartmentSummary() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState("All");
  const [attendanceSummary, setAttendanceSummary] = useState(
    getDefaultSummary(getEffectiveRouteList())
  );
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const location = useLocation();
  const pathname = location.pathname;
  const team = getDepartmentByUser(pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const { isAdmin, isSuperAdmin } = getUserRole();
  const isAdminMember = isAdmin || checkAdminStatus(pathname);
  const authUser = useMemo(() => getUser(), []);
  const options = getAdminSelectOptions(isChurchAdmin, team, authUser);

  const startDateStr = dateRange.startDate
    ? format(dateRange.startDate, "yyyy-MM-dd")
    : null;
  const endDateStr = dateRange.endDate
    ? format(dateRange.endDate, "yyyy-MM-dd")
    : null;

  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setDateRange({ startDate, endDate });
  }, []);

  const queryAdminAttendance = useCallback(() => {
    setIsLoading(true);
    const permissions = expandPermissions(authUser);
    fetchAdminAttendance(activeGroup, isChurchAdmin, null, startDateStr, endDateStr, permissions)
      .then((attendance) => {
        const filtered = filterByUserPermissions(attendance ?? [], authUser, pathname);
        setAttendanceSummary(filtered);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast.error(`Error loading summary: ${error.message}`);
      });
  }, [activeGroup, isChurchAdmin, startDateStr, endDateStr, authUser, pathname]);

  const queryAttendance = useCallback(() => {
    setIsLoading(true);
    const permissions = expandPermissions(authUser);
    fetchAttendance(null, startDateStr, endDateStr, permissions)
      .then((attendance) => {
        const filtered = filterByUserPermissions(attendance ?? [], authUser, pathname);
        setAttendanceSummary(filtered);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast.error(`Error loading summary: ${error.message}`);
      });
  }, [startDateStr, endDateStr, authUser, pathname]);

  useEffect(() => {
    if (isAdminMember) {
      queryAdminAttendance();
    } else {
      queryAttendance();
    }
  }, [
    activeGroup,
    isChurchAdmin,
    isAdminMember,
    startDateStr,
    endDateStr,
    queryAdminAttendance,
    queryAttendance,
  ]);

  const debouncedSetActiveGroup = debounce(
    (value) => setActiveGroup(value),
    DEBOUNCE_INTERVAL
  );

  const handleChange = (selected) => {
    debouncedSetActiveGroup(selected?.value);
  };

  // Log attendance summary silently

  if (isSuperAdmin) {
    return <Navigate to="/summary/super-admin" replace />;
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="min-w-0">
            <div className="qc-eyebrow">Summary</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight break-words">
              {team.team || "Department"}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Attendance roll-up across the selected range.
            </p>
          </div>
          {isAdminMember && (
            <ViewHistoryButton
              label="View history"
              link={
                isChurchAdmin
                  ? `/summary/history/admin`
                  : `/summary/history/admin/${team.department}`
              }
            />
          )}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <DateRangeFilter onDateRangeChange={handleDateRangeChange} defaultRange="thisMonth" />
          {isAdminMember && (
            <ReactSelectDropdown
              title={isChurchAdmin ? "Select Team" : "Select Department"}
              defaultValue={{ value: "All", label: "All teams/departments" }}
              onChange={handleChange}
              options={[
                { value: "All", label: "All teams/departments" },
                ...options,
              ]}
              className="w-full min-w-0 sm:w-[45%] md:w-[30%] lg:w-[25%] xl:w-[25%]"
            />
          )}
        </div>
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              {isLoading ? (
                <table className="min-w-full divide-y divide-ink-300">
                  <TableLoadingState length={6} />
                </table>
              ) : (
                <AdminDepartmentSummaryTable rows={attendanceSummary} showLinks />
              )}
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
}
