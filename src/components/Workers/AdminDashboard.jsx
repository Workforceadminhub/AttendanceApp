import { useEffect, useState } from "react";
import {
  calculateTotals,
  fetchAdminAttendance,
} from "../../services/attendance";
import Header from "../Header";
import getDayAndYear from "../../utils/getDate";
import { useLocation } from "react-router-dom";
import { getDepartmentByUser } from "../../utils/getDepartment";
import { ADMIN_ENUMS } from "../../utils/adminEnums";
import { getAdminSelectOptions } from "../../utils/routeObject";
import ReactSelectDropdown from "../ReactSelect";

export default function AdminDashboard() {
  const [activeGroup, setActiveGroup] = useState("All");
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const dateForAttendance = getDayAndYear();
  const location = useLocation();
  const team = getDepartmentByUser(location.pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const options = getAdminSelectOptions(isChurchAdmin, team);

  useEffect(() => {
    fetchAdminAttendance(activeGroup, isChurchAdmin).then((attendance) =>
      setAttendanceSummary(calculateTotals(attendance))
    );
  }, [activeGroup, isChurchAdmin]);

  return (
    <div className="p-4">
      <Header />
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
    </div>
  );
}
