import { useEffect, useState } from "react";
import {
  calculateTotals,
  fetchAdminAttendance,
} from "../../../services/attendance";
import Header from "../../Header";
import getDayAndYear from "../../../utils/getDate";
import { useLocation } from "react-router-dom";
import { getDepartmentByUser } from "../../../utils/getDepartment";
import { ADMIN_ENUMS } from "../../../utils/adminEnums";
import { getAdminSelectOptions } from "../../../utils/routeObject";
import ReactSelectDropdown from "../../ReactSelect";
import LoadingState from "../../LoadingState";
import Layout from "../../Layout";

export default function AdminDashboard() {
  const [activeGroup, setActiveGroup] = useState("All");
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dateForAttendance = getDayAndYear();
  const location = useLocation();
  const team = getDepartmentByUser(location.pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const options = getAdminSelectOptions(isChurchAdmin, team);

  useEffect(() => {
    setIsLoading(true);
    fetchAdminAttendance(activeGroup, isChurchAdmin).then((attendance) => {
      setAttendanceSummary(calculateTotals(attendance));
      setIsLoading(false);
    });
  }, [activeGroup, isChurchAdmin]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        {/* <h3 className="text-base font-semibold text-gray-900">Last 30 days</h3> */}
        <div className="flex flex-col space-y-4 font-bold">
          {/* <Select title="Select service" options={services} /> */}
          {`${team?.team} Dashboard`} - {dateForAttendance}
        </div>
        <div className="mt-8">
          <div className="mt-8">
            <ReactSelectDropdown
              title={isChurchAdmin ? "Select Team" : "Select Department"}
              defaultValue={{ value: "All", label: "All teams/departments" }}
              onChange={(selected) => setActiveGroup(selected?.value)}
              options={[
                { value: "All", label: "All teams/departments" },
                ...options,
              ]}
              className="w-[25%]"
            />
          </div>
        </div>
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
