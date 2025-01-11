// import { useNavigate } from "react-router-dom";

import { useEffect, useState } from "react";
import Header from "../Header";
import { fetchAttendance } from "../../services/attendance";
import { routeObject } from "../../utils/routeObject";

export default function DepartmentSummary() {
  const [attendanceSummary, setAttendanceSummary] = useState(
    getDefaultSummary(routeObject)
  );
  const data = [
    {
      id: 1,
      department: "Workforce admin",
      strength: 100,
      present: 60,
      absent: 60,
      percentage: 20,
    },
  ];

  function getDefaultSummary(routeObject) {
    return routeObject.map((department, index) => ({
      id: index + 1,
      department: department.department,
      present: 0,
      absent: 0,
      total: 0,
      percentage: "0%",
    }));
  }

  function getDepartmentSummary(data) {
    const departmentSummary = {};

    data.forEach((record) => {
      const department = record.department;
      if (departmentSummary[department]) {
        departmentSummary[department]++;
      } else {
        departmentSummary[department] = 1;
      }
    });

    return departmentSummary;
  }

  // useEffect(() => {
  //   fetchAttendance().then((attendance) =>
  //     setAttendanceSummary(getDepartmentSummary(attendance))
  //   );
  // }, []);

  console.log(attendanceSummary);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Department summary
          </h1>
        </div>
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
              <tbody className="divide-y divide-gray-200">
                {attendanceSummary.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                      {item.id}
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
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
