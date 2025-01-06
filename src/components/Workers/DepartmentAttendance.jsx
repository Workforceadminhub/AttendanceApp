import { useNavigate } from "react-router-dom";
import Select from "./Select";

export default function DepartmentAttendance() {
  const navigate = useNavigate();
  const data = [
    {
      id: 1,
      name: "Philip",
      phoneNumber: 100,
      birthday: 60,
      status: 60,
    },
    {
      id: 2,
      name: "Philip",
      phoneNumber: 100,
      birthday: 60,
      status: 60,
    },
  ];
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Leadership Recruitment
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
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Phone number
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Birthday
                  </th>
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
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {person.phoneNumber}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {person.birthday}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="w-48 z-1000">
                        <Select
                          title=""
                          options={[
                            { id: 1, name: "Present" },
                            { id: 2, name: "Online" },
                            { id: 3, name: "Absent" },
                            { id: 4, name: "Out of town/travelled" },
                            { id: 5, name: "Work" },
                            { id: 6, name: "Sick" },
                            { id: 6, name: "Family issue" },
                            { id: 6, name: "School exam" },
                            { id: 6, name: "Not reachable" },
                            { id: 6, name: "Inactive" },
                          ]}
                        />
                      </div>
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
