// import { useNavigate } from "react-router-dom";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import getDefaultSummary from "../../../utils/getDefaultSummary";
import { getAdminSelectOptions, getEffectiveRouteList } from "../../../utils/routeObject";
import { getNextSunday } from "../../../utils/getDate";
import { getDepartmentByUser } from "../../../utils/getDepartment";
import { ADMIN_ENUMS } from "../../../utils/enums";
import { checkAdminStatus } from "../../../utils/checkAdminStatus";
import { getUserRole } from "../../../utils/getUserRole";
import {
  fetchAdminAttendance,
  fetchAttendance,
} from "../../../services/attendance";
import { getUser } from "../../../utils/getUser";
import { expandPermissions } from "../../../utils/expandPermissions";
import { fetchHistoryOptions } from "../../../services/history";
import { DEBOUNCE_INTERVAL } from "../../../utils/constants";
import Layout from "../../Layout";
import ReactSelectDropdown from "../../ReactSelect";
import TableLoadingState from "../../TableLoadingState";
import Header from "../../Header";
import ViewHistoryButton from "../../ViewHistoryButton";

export default function DepartmentSummaryHistory() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState("All");
  const [attendanceSummary, setAttendanceSummary] = useState(
    getDefaultSummary(getEffectiveRouteList())
  );
  const location = useLocation();
  const dateForAttendance = getNextSunday();
  const team = getDepartmentByUser(location.pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const { isAdmin } = getUserRole();
  const isAdminMember = isAdmin || checkAdminStatus(location.pathname);
  const authUser = useMemo(() => getUser(), []);
  const options = getAdminSelectOptions(isChurchAdmin, team, authUser);
  const [activeHistory, setActiveHistory] = useState(dateForAttendance);
  const [historyOptions, setHistoryOptions] = useState([]);

  const queryAdminAttendance = useCallback(() => {
    setIsLoading(true);
    const permissions = expandPermissions(authUser);
    fetchAdminAttendance(activeGroup, isChurchAdmin, activeHistory, permissions)
      .then((attendance) => {
        setAttendanceSummary(attendance);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast.error(`Error loading summary: ${error.message}`);
      });
  }, [activeGroup, isChurchAdmin, activeHistory, authUser]);

  const queryAttendance = useCallback(() => {
    setIsLoading(true);
    const permissions = expandPermissions(authUser);
    fetchAttendance(activeHistory, permissions)
      .then((attendance) => {
        setAttendanceSummary(attendance);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast.error(`Error loading summary: ${error.message}`);
      });
  }, [activeHistory, authUser]);

  useEffect(() => {
    fetchHistoryOptions().then((res) =>
      setHistoryOptions(res.map((item) => ({ label: item, value: item })))
    );
  }, []);

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
    activeHistory,
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

  const debouncedSetActiveHistory = debounce(
    (value) => setActiveHistory(value),
    DEBOUNCE_INTERVAL
  );

  const handleHistoryChange = (selected) => {
    debouncedSetActiveHistory(selected?.value);
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="qc-eyebrow">History · Summary</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight break-words">
              {team.team || "Department"}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Summary roll-up across past services.
            </p>
          </div>
          <ViewHistoryButton label="← Back to summary" link={-1} />
        </div>
        {isAdminMember && (
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-2">
            <ReactSelectDropdown
              title={isChurchAdmin ? "Select Team" : "Select Department"}
              defaultValue={{ value: "All", label: "All teams/departments" }}
              onChange={handleChange}
              options={[
                { value: "All", label: "All teams/departments" },
                ...options,
              ]}
              className="w-full min-w-0 sm:flex-1 sm:min-w-[200px]"
            />
            <ReactSelectDropdown
              title={"Select Sunday"}
              defaultValue={{
                value: dateForAttendance,
                label: dateForAttendance,
              }}
              onChange={handleHistoryChange}
              options={[...historyOptions]}
              className="w-full min-w-0 sm:flex-1 sm:min-w-[200px]"
            />
          </div>
        )}
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-ink-300">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-ink-900 sm:pl-0"
                    >
                      S/N
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900"
                    >
                      Department
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900"
                    >
                      Strength
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900"
                    >
                      Present
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900"
                    >
                      Absent
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900"
                    >
                      Percentage
                    </th>
                  </tr>
                </thead>
                {isLoading ? (
                  <TableLoadingState length={6} />
                ) : (
                  <tbody className="divide-y divide-ink-200">
                    {attendanceSummary?.map((item, index) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-ink-900 sm:pl-0">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
                          {item.department}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
                          {item.total}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
                          {item.present}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
                          {item.absent}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
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
