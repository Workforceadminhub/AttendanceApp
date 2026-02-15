import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import { getNextSunday } from "../../../utils/getDate";
import { getDepartmentByUser } from "../../../utils/getDepartment";
import { ADMIN_ENUMS } from "../../../utils/enums";
import { checkAdminStatus } from "../../../utils/checkAdminStatus";
import { getAdminSelectOptions } from "../../../utils/routeObject";
import {
  calculateTotals,
  fetchAdminAttendance,
  fetchAttendance,
} from "../../../services/attendance";
import { getUser } from "../../../utils/getUser";
import { fetchHistoryOptions } from "../../../services/history";
import { DEBOUNCE_INTERVAL } from "../../../utils/constants";
import Header from "../../Header";
import Layout from "../../Layout";
import ReactSelectDropdown from "../../ReactSelect";
import LoadingState from "../../LoadingState";
import ViewHistoryButton from "../../ViewHistoryButton";

export default function DashboardHistory() {
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState("All");
  const dateForAttendance = getNextSunday();
  const location = useLocation();
  const team = getDepartmentByUser(location.pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isAdminMember = checkAdminStatus(location.pathname);
  const authUser = getUser();
  const options = getAdminSelectOptions(isChurchAdmin, team, authUser);
  const [activeHistory, setActiveHistory] = useState(dateForAttendance);
  const [historyOptions, setHistoryOptions] = useState([]);

  const queryAdminAttendance = () => {
    setIsLoading(true);
    const permissions = authUser?.permissions ?? [];
    fetchAdminAttendance(activeGroup, isChurchAdmin, activeHistory, permissions)
      .then((attendance) => {
        setAttendanceSummary(calculateTotals(attendance));
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
    fetchAttendance(activeHistory, permissions)
      .then((attendance) => {
        setAttendanceSummary(calculateTotals(attendance));
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
  }, [activeGroup, isChurchAdmin, isAdminMember, activeHistory]);

  useEffect(() => {
    setIsLoading(true);
    const permissions = authUser?.permissions ?? [];
    fetchAttendance(undefined, permissions).then((attendance) => {
      setAttendanceSummary(calculateTotals(attendance));
      setIsLoading(false);
    });

    fetchHistoryOptions().then((res) =>
      setHistoryOptions(res.map((item) => ({ label: item, value: item })))
    );
  }, []);

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
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        {/* <h3 className="text-base font-semibold text-gray-900">Last 30 days</h3> */}
        <div className="flex justify-between">
          <div className="flex flex-col space-y-4 font-bold">
            {/* <Select title="Select service" options={services} /> */}
            {`${team?.team} Dashboard`} - {dateForAttendance}
          </div>
          <ViewHistoryButton
            label="Back to Dashboard"
            link={-1}
          />
        </div>
        {isAdminMember && (
          <div className="mt-8 flex space-x-2">
            <ReactSelectDropdown
              title={isChurchAdmin ? "Select Team" : "Select Department"}
              defaultValue={{ value: "All", label: "All teams/departments" }}
              onChange={handleChange}
              options={[
                { value: "All", label: "All teams/departments" },
                ...options,
              ]}
              className="w-[25%]"
            />
            <ReactSelectDropdown
              title={"Select Sunday"}
              defaultValue={{
                value: dateForAttendance,
                label: dateForAttendance,
              }}
              onChange={handleHistoryChange}
              options={[...historyOptions]}
              className="w-[25%]"
            />
          </div>
        )}

        {isLoading && (
          <div className="ml-24 mt-24">
            <LoadingState />
          </div>
        )}

        <dl className="mt-5 space-y-4">
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
      </Layout>
    </div>
  );
}
