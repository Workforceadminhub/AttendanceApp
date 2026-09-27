import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import debounce from "lodash/debounce";
import { getNextSunday, getSundayDisplayDate } from "../../../utils/getDate";
import { getDepartmentByUser } from "../../../utils/getDepartment";
import { ADMIN_ENUMS } from "../../../utils/enums";
import { checkAdminStatus } from "../../../utils/checkAdminStatus";
import { getUserRole } from "../../../utils/getUserRole";
import { useAdminSelectOptions } from "../../../contexts/DepartmentsContext";

import { calculateTotals } from "../../../services/attendance";
import { useAttendanceQuery, useHistoryOptions } from "../../../hooks/useAttendanceQueries";
import { getUser } from "../../../utils/getUser";
import { expandPermissions } from "../../../utils/expandPermissions";
import { DEBOUNCE_INTERVAL } from "../../../utils/constants";
import Header from "../../Header";
import Layout from "../../Layout";
import ReactSelectDropdown from "../../ReactSelect";
import LoadingState from "../../LoadingState";
import ViewHistoryButton from "../../ViewHistoryButton";

export default function DashboardHistory() {
  const [activeGroup, setActiveGroup] = useState("All");
  const dateForAttendance = getNextSunday();
  const location = useLocation();
  const team = getDepartmentByUser(location.pathname);
  const { isChurchAdmin: isChurchAdminRole, isSuperAdmin } = getUserRole();
  const isChurchAdmin = isChurchAdminRole || isSuperAdmin || team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isAdminMember = checkAdminStatus(location.pathname);

  const authUser = useMemo(() => getUser(), []);
  const options = useAdminSelectOptions(isChurchAdmin, team, authUser);
  const [activeHistory, setActiveHistory] = useState(dateForAttendance);

  // Same cached query as the Dashboard for the selected Sunday.
  const permissions = useMemo(() => expandPermissions(authUser), [authUser]);
  const { data: rawAttendance, isLoading, error: attendanceError } = useAttendanceQuery({
    isAdminMember,
    activeGroup,
    isChurchAdmin,
    date: activeHistory,
    permissions,
  });
  const { data: historyOptions = [] } = useHistoryOptions();

  useEffect(() => {
    if (attendanceError) toast.error(`Error loading summary: ${attendanceError.message}`);
  }, [attendanceError]);

  const attendanceSummary = useMemo(
    () => (rawAttendance ? calculateTotals(rawAttendance) : []),
    [rawAttendance]
  );

  const debouncedSetActiveGroup = useMemo(
    () => debounce((value) => setActiveGroup(value), DEBOUNCE_INTERVAL),
    []
  );
  useEffect(() => () => debouncedSetActiveGroup.cancel(), [debouncedSetActiveGroup]);

  const handleChange = (selected) => {
    debouncedSetActiveGroup(selected?.value);
  };

  const debouncedSetActiveHistory = useMemo(
    () => debounce((value) => setActiveHistory(value), DEBOUNCE_INTERVAL),
    []
  );
  useEffect(() => () => debouncedSetActiveHistory.cancel(), [debouncedSetActiveHistory]);

  const handleHistoryChange = (selected) => {
    debouncedSetActiveHistory(selected?.value);
  };
  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="qc-eyebrow">History · Dashboard</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight break-words">
              {isAdminMember ? team?.team : team?.department}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              <span className="qc-num text-ink-700">
                {getSundayDisplayDate()}
              </span>
            </p>
          </div>
          <ViewHistoryButton label="← Back to dashboard" link={-1} />
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

        {isLoading && (
          <div className="flex justify-center py-16">
            <LoadingState />
          </div>
        )}

        <dl className="mt-5 space-y-4">
          {attendanceSummary.map((item) => (
            <div
              key={item.name}
              className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6"
            >
              <dt className="truncate text-sm font-medium text-ink-500">
                {item.name}
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-ink-900">
                {item.stat}
              </dd>
            </div>
          ))}
        </dl>
      </Layout>
    </div>
  );
}
