// import { useNavigate } from "react-router-dom";

import { useEffect, useState } from "react";
import Header from "../../Header";
import { fetchAdminAttendance } from "../../../services/attendance";
import { getAdminSelectOptions, routeObject } from "../../../utils/routeObject";
import getDefaultSummary from "../../../utils/getDefaultSummary";
import { getDepartmentByUser } from "../../../utils/getDepartment";
import { useLocation } from "react-router-dom";
import ReactSelectDropdown from "../../ReactSelect";
import { ADMIN_ENUMS } from "../../../utils/adminEnums";
import TableLoadingState from "../../TableLoadingState";
import Layout from "../../Layout";

export default function AdminDepartmentSummary() {
  const [activeGroup, setActiveGroup] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState(
    getDefaultSummary(routeObject)
  );
  const location = useLocation();
  const team = getDepartmentByUser(location.pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const options = getAdminSelectOptions(isChurchAdmin, team);

  useEffect(() => {
    setIsLoading(true);
    fetchAdminAttendance(activeGroup, isChurchAdmin).then((attendance) => {
      setAttendanceSummary(attendance);
      setIsLoading(false);
    });
  }, [activeGroup, isChurchAdmin]);

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
        </div>
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
                          {item.department}
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
