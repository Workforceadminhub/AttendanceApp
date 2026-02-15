import { useEffect, useState } from "react";
import {
  calculateTotals,
  fetchAdminAttendance,
  fetchAttendance,
} from "../../services/attendance";
import Header from "../Header";
import { getNextSunday } from "../../utils/getDate";
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

export default function Dashboard() {
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState("All");
  const dateForAttendance = getNextSunday();
  const location = useLocation();
  const pathname = location.pathname;
  const team = getDepartmentByUser(pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isAdminMember = checkAdminStatus(pathname);
  const authUser = getUser();
  const options = getAdminSelectOptions(isChurchAdmin, team, authUser);

  const queryAdminAttendance = () => {
    setIsLoading(true);
    const permissions = authUser?.permissions ?? [];
    fetchAdminAttendance(activeGroup, isChurchAdmin, undefined, permissions)
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
    fetchAttendance(undefined, permissions)
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
    fetchAttendance(undefined, permissions).then((attendance) => {
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
        {isAdminMember && (
          <div className="mt-8">
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
