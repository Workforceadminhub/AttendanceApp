// import { useNavigate } from "react-router-dom";

import { useEffect, useState, useCallback } from "react";
import Header from "../Header";
import {
  fetchAdminAttendance,
  fetchAttendance,
} from "../../services/attendance";
import { getAdminSelectOptions, getDepartmentRoute, routeObject } from "../../utils/routeObject";
import getDefaultSummary from "../../utils/getDefaultSummary";
import { getDepartmentByUser } from "../../utils/getDepartment";
import { useLocation, Link } from "react-router-dom";
import TableLoadingState from "../TableLoadingState";
import Layout from "../Layout";
import { ADMIN_ENUMS } from "../../utils/enums";
import ReactSelectDropdown from "../ReactSelect";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import { filterByUserPermissions } from "../../utils/filterByPermissions";
import { getUser } from "../../utils/getUser";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import { DEBOUNCE_INTERVAL } from "../../utils/constants";
import ViewHistoryButton from "../ViewHistoryButton";
import DateRangeFilter from "../DateRangeFilter";
import { format } from "date-fns";

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
  const isAdminMember = checkAdminStatus(pathname);
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

  const queryAdminAttendance = () => {
    setIsLoading(true);
    fetchAdminAttendance(activeGroup, isChurchAdmin, null, startDateStr, endDateStr)
      .then((attendance) => {
        const filtered = filterByUserPermissions(attendance ?? [], authUser, pathname);
        setAttendanceSummary(filtered);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast.error(`Error loading summary: ${error.message}`);
      });
  };

  const queryAttendance = () => {
    setIsLoading(true);
    fetchAttendance(null, startDateStr, endDateStr)
      .then((attendance) => {
        const filtered = filterByUserPermissions(attendance ?? [], authUser, pathname);
        setAttendanceSummary(filtered);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast.error(`Error loading summary: ${error.message}`);
      });
  };

  useEffect(() => {
    if (isAdminMember) {
      queryAdminAttendance();
    } else {
      queryAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, isChurchAdmin, isAdminMember, startDateStr, endDateStr]);

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
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">
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
              className="lg:w-[25%] md:w-[30%] xl:w-[25%] sm:w-[45%] xs:w-[50%]"
            />
          )}
        </div>
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                    >
                      S/N
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Department
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Strength
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Present
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Absent
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Unfilled
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Percentage
                    </th>
                  </tr>
                </thead>
                {isLoading ? (
                  <TableLoadingState length={6} />
                ) : (
                  <tbody className="divide-y divide-gray-200">
                    {attendanceSummary?.map((item, index) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <Link
                            to={`/department/${getDepartmentRoute(item.department) || encodeURIComponent(item.department)}`}
                            className="text-blue-600 hover:underline"
                          >
                            {item.department}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {item.total}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {item.present}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {item.absent}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {item.unfilled}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {item.percentage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
}
