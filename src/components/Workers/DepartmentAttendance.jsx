// import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import Header from "../Header";
import SelectDropdown from "./Select";
import { getDepartment } from "../../utils/getDepartment";
import { useEffect, useState } from "react";
import { fetchWorkers } from "../../services/workers";
import { addAttendance } from "../../services/attendance";
import { toast } from "react-toastify";
import getDayAndYear from "../../utils/getDate";

export default function DepartmentAttendance() {
  const location = useLocation();
  const team = getDepartment(location.pathname);
  const [attendance, setAttendance] = useState([]);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const dateForAttendance = getDayAndYear();

  useEffect(() => {
    setIsLoading(true);
    fetchWorkers(team.department)
      .then((res) => {
        setData(res);
      })
      .catch((error) => console.error("Error:", error))
      .finally(() => setIsLoading(false));
  }, []);

  function updateOrAddWorker(array, newWorker) {
    // Find the index of an object with the same workerid

    const index = array.findIndex(
      (worker) => worker.workerid === newWorker.workerid
    );

    if (index !== -1) {
      // If a match is found, replace the old object with the new one
      array[index] = newWorker;
      return array;
    } else {
      // If no match is found, add the new object to the array
      array.push(newWorker);
      return array;
    }
  }

  const updateAttendance = (selected, person) => {
    const newAttendance = updateOrAddWorker(attendance, {
      workerid: person.id,
      name: person.fullname,
      attendance: selected.name,
      department: team.department,
      attendancedate: dateForAttendance,
    });
    setAttendance(newAttendance);
  };

  const saveAttendance = async () => {
    setAttendanceLoading(true);
    await addAttendance(attendance);
    setAttendanceLoading(false);
    toast.success("Attendance added successfully");
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <div className="lg:mx-48 md:mx-24 sm:mx-2 xs:mx-1">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            {team.department === "Sub team" ? (
              <h1 className="text-base font-semibold leading-6 text-gray-900">
                Ministry team leadership attendance
              </h1>
            ) : (
              <h1 className="text-base font-semibold leading-6 text-gray-900">
                {team?.department} attendance
              </h1>
            )}
            <p>
              {dateForAttendance} -{" "}
              {dateForAttendance.includes("Sunday")
                ? "Sunday service"
                : "Midweek service"}
            </p>
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
                      Status
                    </th>
                  </tr>
                </thead>
                {isLoading && (
                  <tbody className="divide-y divide-gray-200 h-full">
                    Loading...
                  </tbody>
                )}
                <tbody className="divide-y divide-gray-200 h-full">
                  {data?.map((person, idx) => (
                    <tr key={person.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {person.fullname}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {person.phonenumber ? `${0}${person.phonenumber}` : ''}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="w-48 z-1000 pr-4">
                          <SelectDropdown
                            title="Mark attendance"
                            defaultValue={
                              person?.attendance
                                ? {
                                    id: person.attendance.toLowerCase(),
                                    name: person.attendance,
                                  }
                                : undefined
                            }
                            onChange={(selected) =>
                              updateAttendance(selected, person)
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
                className="bg-gray-900 text-white p-3 ml-3 rounded-xl"
                onClick={saveAttendance}
              >
                {attendanceLoading ? "Saving..." : "Save attendance"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
