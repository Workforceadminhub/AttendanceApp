// import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import Header from "../Header";
import SelectDropdown from "./Select";
import { getDepartment } from "../../utils/getDepartment";
import { useState } from "react";

export default function DepartmentAttendance() {
  const location = useLocation();
  const team = getDepartment(location.pathname);
  const [attendance, setAttendance] = useState([]);

  const saveAttendance = () => {
    console.log(attendance);
  };

  const data = [
    {
      id: 1,
      name: "Philip Egwuatu",
      phoneNumber: 100,
      birthday: 60,
      status: 60,
    },
    {
      id: 2,
      name: "Philip Okoro Magic",
      phoneNumber: 100,
      birthday: 60,
      status: 60,
    },
  ];
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <div className="lg:mx-64">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">
              {team?.department} attendance
            </h1>
            <p>Thursday 15/01/2025 - Sunday service</p>
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
                      Name
                    </th>
                    {/* <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Phone number
                    </th> */}
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 h-full">
                  {data.map((person) => (
                    <tr key={person.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        {person.id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {person.name}
                      </td>
                      {/* <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {person.phoneNumber}
                      </td> */}
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="w-48 z-1000">
                          <SelectDropdown
                            title=""
                            onChange={(selected) =>
                              setAttendance([
                                ...attendance,
                                {
                                  id: person.id,
                                  name: person.name,
                                  status: selected.name,
                                  department: team
                                },
                              ])
                            }
                            options={[
                              { id: "present", name: "Present" },
                              { id: "online", name: "Online" },
                              { id: "absent", name: "Absent" },
                              {
                                id: "out-of-town",
                                name: "Out of town/travelled",
                              },
                              { id: "work", name: "Work" },
                              { id: "sick", name: "Sick" },
                              { id: "family-issue", name: "Family issue" },
                              { id: "school-exam", name: "School exam" },
                              { id: "not-reachable", name: "Not reachable" },
                              { id: "inactive", name: "Inactive" },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                  <button
                    className="bg-gray-900 text-white p-3 rounded-xl"
                    onClick={saveAttendance}
                  >
                    Save attendance
                  </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
