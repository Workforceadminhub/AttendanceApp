// import { useNavigate } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getNextSunday } from "../../../utils/getDate";
import { getDepartmentByUser } from "../../../utils/getDepartment";
import { ADMIN_ENUMS } from "../../../utils/adminEnums";
import { checkAdminStatus } from "../../../utils/checkAdminStatus";
import { getAdminSelectOptions } from "../../../utils/routeObject";
import { fetchAdminWorkers, fetchWorkers } from "../../../services/workers";
import { switchOffAttendance } from "../../../utils/switchOffAttendance";
import { addAttendance } from "../../../services/attendance";
import Header from "../../Header";
import Layout from "../../Layout";
import ReactSelectDropdown from "../../ReactSelect";
import TableLoadingState from "../../TableLoadingState";
import { fetchHistoryOptions } from "../../../services/history";

export default function DepartmentAttendanceHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  // const team = getDepartment(location.pathname);
  const [attendance, setAttendance] = useState([]);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const dateForAttendance = getNextSunday();
  const [refresh, setRefresh] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");
  const team = getDepartmentByUser(location.pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isAdminMember = checkAdminStatus(location.pathname);
  const optionsAdmin = getAdminSelectOptions(isChurchAdmin, team);
  const [attendanceIsClosed, setAttendanceIsClosed] = useState(false);
  const [historyOptions, setHistoryOptions] = useState([]);

  const options = useMemo(
    () => [
      { value: "present", label: "Present" },
      { value: "online", label: "Online" },
      { value: "absent", label: "Absent" },
      {
        value: "out-of-town",
        label: "Out of town/travelled",
      },
      { value: "work", label: "Work" },
      { value: "sick", label: "Sick" },
      { value: "family-issue", label: "Family issue" },
      { value: "school-exam", label: "School exam" },
      { value: "not-reachable", label: "Not reachable" },
      { value: "inactive", label: "Inactive" },
    ],
    []
  );

  const queryAdminWorkers = () => {
    setIsLoading(true);
    fetchAdminWorkers(team.team, activeGroup)
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error("Error marking attendance");
        setIsLoading(false);
        console.log(error);
      });
  };

  const queryWorkers = () => {
    setIsLoading(true);
    fetchWorkers(team.department)
      .then((res) => {
        setData(res);
      })
      .catch((error) => {
        toast.error("Error marking attendance");
        setIsLoading(false);
        console.log(error);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchHistoryOptions().then((res) => setHistoryOptions());
  }, []);

  useEffect(() => {
    switchOffAttendance()
      .then((res) => setAttendanceIsClosed(res))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    if (isAdminMember) {
      queryAdminWorkers();
    } else {
      queryWorkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, isAdminMember, isChurchAdmin, team.team]);

  useEffect(() => {
    if (isAdminMember) {
      queryAdminWorkers();
    } else {
      queryWorkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

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
      attendance: selected?.label,
      department: team.department,
      team: team.team,
      attendancedate: dateForAttendance,
    });
    setAttendance(newAttendance);
    setRefresh("updated");
  };

  const saveAttendance = async () => {
    setAttendanceLoading(true);
    await addAttendance(attendance);
    setAttendanceLoading(false);
    setRefresh("added");
    toast.success("Attendance added successfully");
  };

  if (!isAdminMember) {
    return <div>Unathorized</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        <div>
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-base font-semibold leading-6 text-gray-900">
                {team?.department} attendance
              </h1>

              <p>
                {dateForAttendance} -{" "}
                {dateForAttendance?.includes("Sunday")
                  ? "Sunday service"
                  : "Midweek service"}
              </p>
            </div>
            <button
              className="bg-teal-500 text-white rounded-lg p-2 hover:bg-teal-300"
              onClick={() => {
                navigate(-1);
              }}
            >
              Back to attendance
            </button>
          </div>
          {isAdminMember && (
            <div className="mt-8 flex space-x-2">
              <ReactSelectDropdown
                title={isChurchAdmin ? "Select Team" : "Select Department"}
                defaultValue={{
                  value: "All",
                  label: "All teams/departments",
                }}
                onChange={(selected) => setActiveGroup(selected?.value)}
                options={[
                  { value: "All", label: "All teams/departments" },
                  ...optionsAdmin,
                ]}
                className="w-[25%]"
              />
              <ReactSelectDropdown
                title={isChurchAdmin ? "Select Team" : "Select Department"}
                defaultValue={{
                  value: "All",
                  label: "All teams/departments",
                }}
                onChange={(selected) => setActiveGroup(selected?.value)}
                options={[
                  { value: "All", label: "All teams/departments" },
                  ...optionsAdmin,
                ]}
                className="w-[25%]"
              />
            </div>
          )}
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        t
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
                  {isLoading ? (
                    <TableLoadingState length={5} />
                  ) : (
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
                            {person.phonenumber
                              ? person.phonenumber.startsWith("0")
                                ? person.phonenumber
                                : `0${person.phonenumber}`
                              : ""}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {person.birthdate}
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <div className="w-48 z-1000 pr-4">
                              <ReactSelectDropdown
                                title="Mark attendance"
                                disabled={
                                  person.attendance || attendanceIsClosed
                                }
                                defaultValue={
                                  person?.attendance
                                    ? {
                                        value: person.attendance.toLowerCase(),
                                        label: person.attendance,
                                      }
                                    : undefined
                                }
                                onChange={(selected) =>
                                  updateAttendance(selected, person)
                                }
                                options={options}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
                <button
                  className={`bg-blue-500 text-white p-1.5 ml-[85%] rounded-lg ${
                    attendanceLoading && "cursor-not-allowed"
                  }`}
                  onClick={saveAttendance}
                  disabled={attendanceLoading}
                >
                  {attendanceLoading ? "Saving..." : "Save attendance"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
}
