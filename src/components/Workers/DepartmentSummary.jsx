// import { useNavigate } from "react-router-dom";

import { useEffect, useState, useCallback } from "react";
import Header from "../Header";
import {
  fetchAdminAttendance,
  fetchAttendance,
} from "../../services/attendance";
import { getAdminSelectOptions, routeObject } from "../../utils/routeObject";
import getDefaultSummary from "../../utils/getDefaultSummary";
import { getDepartmentByUser } from "../../utils/getDepartment";
import { useLocation } from "react-router-dom";
import TableLoadingState from "../TableLoadingState";
import Layout from "../Layout";
import { ADMIN_ENUMS } from "../../utils/enums";
import ReactSelectDropdown from "../ReactSelect";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import { filterByUserPermissions } from "../../utils/filterByPermissions";
import { getUser } from "../../utils/getUser";
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
    getDefaultSummary(routeObject)
  );
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const location = useLocation();
  const pathname = location.pathname;
  const team = getDepartmentByUser(pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const { isAdmin } = getUserRole();
  const isAdminMember = isAdmin || checkAdminStatus(pathname);
  const authUser = getUser();
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
    const permissions = authUser?.permissions ?? [];
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
    const permissions = authUser?.permissions ?? [];
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900 break-words">
              {`${team.team} summary` || "Department summary"}
            </h1>
          </div>
          {isAdminMember && (
            <ViewHistoryButton
              label="View History"
              link={
                isChurchAdmin
                  ? `/summary/history/admin`
                  : `/summary/history/admin/${team.department}`
              }
            />
          )}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
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
                <TableLoadingState length={6} />
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
