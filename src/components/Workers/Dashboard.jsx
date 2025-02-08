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
import { ADMIN_ENUMS } from "../../utils/adminEnums";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import ReactSelectDropdown from "../ReactSelect";
import { getAdminSelectOptions } from "../../utils/routeObject";
import { debounce } from "lodash";
import { DEBOUNCE_INTERVAL } from "../../utils/constants";

export default function Dashboard() {
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState("All");
  const dateForAttendance = getNextSunday();
  const location = useLocation();
  const team = getDepartmentByUser(location.pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isAdminMember = checkAdminStatus(location.pathname);
  const options = getAdminSelectOptions(isChurchAdmin, team);

  const queryAdminAttendance = () => {
    setIsLoading(true);
    fetchAdminAttendance(activeGroup, isChurchAdmin)
      .then((attendance) => {
        setAttendanceSummary(calculateTotals(attendance));
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        console.log(error);
        toast.error("Error loading summart");
      });
  };

  const queryAttendance = () => {
    setIsLoading(true);
    fetchAttendance()
      .then((attendance) => {
        setAttendanceSummary(calculateTotals(attendance));
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
        toast.error("Error loading summart");
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
    fetchAttendance().then((attendance) => {
      setAttendanceSummary(calculateTotals(attendance));
      setIsLoading(false);
    });
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
        <div className="flex flex-col space-y-4 font-bold">
          {/* <Select title="Select service" options={services} /> */}
          {`${team?.team} Dashboard`} - {dateForAttendance}
        </div>
        {isAdminMember && (
          <div className="mt-8">
            <div className="mt-8">
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
            </div>
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
