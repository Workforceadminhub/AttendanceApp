// import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getNextSunday } from "../../../utils/getDate";
import { getDepartmentByUser } from "../../../utils/getDepartment";
import { ADMIN_ENUMS } from "../../../utils/enums";
import { checkAdminStatus } from "../../../utils/checkAdminStatus";
import { getAdminSelectOptions } from "../../../utils/routeObject";
import { fetchAdminWorkers, fetchWorkers } from "../../../services/workers";
import { getUser } from "../../../utils/getUser";
import { switchOffAttendance } from "../../../utils/switchOffAttendance";
import { addAttendance } from "../../../services/attendance";
import Header from "../../Header";
import Layout from "../../Layout";
import ReactSelectDropdown from "../../ReactSelect";
import TableLoadingState from "../../TableLoadingState";
import { fetchHistoryOptions } from "../../../services/history";
import { debounce } from "lodash";
import { DEBOUNCE_INTERVAL } from "../../../utils/constants";
import ViewHistoryButton from "../../ViewHistoryButton";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

export default function DepartmentAttendanceHistory() {
  const location = useLocation();
  // const team = getDepartment(location.pathname);
  const [attendance, setAttendance] = useState([]);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const dateForAttendance = getNextSunday();
  const [refresh, setRefresh] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");
  const [activeHistory, setActiveHistory] = useState(dateForAttendance);
  const team = getDepartmentByUser(location.pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isAdminMember = checkAdminStatus(location.pathname);
  const authUser = getUser();
  const optionsAdmin = getAdminSelectOptions(isChurchAdmin, team, authUser);
  const [attendanceIsClosed, setAttendanceIsClosed] = useState(false);
  const [historyOptions, setHistoryOptions] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc", // 'asc' or 'desc'
  });

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

  const getSortableValue = (person, key) => {
    switch (key) {
      case "id":
        return person.id ?? "";
      case "name":
        return person.fullname ?? "";
      case "phonenumber":
        return person.phonenumber ?? "";
      case "birthdate":
        return person.birthdate ?? "";
      default:
        return person[key];
    }
  };

  const sortedData = useMemo(() => {
    const items = Array.isArray(data) ? [...data] : [];

    if (!sortConfig.key) {
      return items;
    }

    return items.sort((a, b) => {
      const aValue = getSortableValue(a, sortConfig.key);
      const bValue = getSortableValue(b, sortConfig.key);

      if (aValue === null || aValue === undefined || aValue === "") return 1;
      if (bValue === null || bValue === undefined || bValue === "") return -1;

      const aNum = Number(aValue);
      const bNum = Number(bValue);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (columnKey) => {
    setSortConfig((prevConfig) => {
      if (prevConfig.key === columnKey) {
        return {
          key: columnKey,
          direction: prevConfig.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key: columnKey,
        direction: "asc",
      };
    });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return null;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUpIcon className="h-3 w-3 inline-block ml-1" />
    ) : (
      <ArrowDownIcon className="h-3 w-3 inline-block ml-1" />
    );
  };

  const queryAdminWorkers = () => {
    setIsLoading(true);
    const permissions = authUser?.permissions ?? [];
    fetchAdminWorkers(team.team, activeGroup, activeHistory, "", permissions)
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error(`Error marking attendance: ${error.message}`);
        setIsLoading(false);
        // Silent error handling
      });
  };

  const queryWorkers = () => {
    setIsLoading(true);
    const permissions = authUser?.permissions ?? [];
    fetchWorkers(team.department, activeHistory, permissions, "")
      .then((res) => {
        setData(res);
      })
      .catch((error) => {
        toast.error(`Error marking attendance: ${error.message}`);
        setIsLoading(false);
        // Silent error handling
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    switchOffAttendance()
      .then((res) => setAttendanceIsClosed(res))
      .catch((err) => {/* Silent error handling */});

    fetchHistoryOptions().then((res) =>
      setHistoryOptions(res.map((item) => ({ label: item, value: item })))
    );
  }, []);

  useEffect(() => {
    if (isAdminMember) {
      queryAdminWorkers();
    } else {
      queryWorkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, activeHistory, isAdminMember, isChurchAdmin, team.team]);

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

  const debouncedSetActiveGroup = debounce(
    (value) => setActiveGroup(value),
    DEBOUNCE_INTERVAL
  );

  const handleChange = (selected) => {
    debouncedSetActiveGroup(selected?.value);
  };

  const debouncedSetActiveHistory = debounce(
    (value) => setActiveHistory(value),
    DEBOUNCE_INTERVAL
  );

  const handleHistoryChange = (selected) => {
    debouncedSetActiveHistory(selected?.value);
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
            <ViewHistoryButton label="Back to Attendance" link={-1} />
          </div>
          {isAdminMember && (
            <div className="mt-8 flex space-x-2">
              <ReactSelectDropdown
                title={isChurchAdmin ? "Select Team" : "Select Department"}
                defaultValue={{
                  value: "All",
                  label: "All teams/departments",
                }}
                onChange={handleChange}
                options={[
                  { value: "All", label: "All teams/departments" },
                  ...optionsAdmin,
                ]}
                className="w-[25%]"
              />
              <ReactSelectDropdown
                title={"Select Sunday"}
                defaultValue={{
                  value: dateForAttendance,
                  label: dateForAttendance,
                }}
                onChange={handleHistoryChange}
                options={[...historyOptions]}
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
                        <button
                          type="button"
                          onClick={() => handleSort("name")}
                          className="flex items-center hover:text-gray-700"
                        >
                          <span>Name</span>
                          {getSortIcon("name")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        <button
                          type="button"
                          onClick={() => handleSort("phonenumber")}
                          className="flex items-center hover:text-gray-700"
                        >
                          <span>Phone number</span>
                          {getSortIcon("phonenumber")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        <button
                          type="button"
                          onClick={() => handleSort("birthdate")}
                          className="flex items-center hover:text-gray-700"
                        >
                          <span>Birthday</span>
                          {getSortIcon("birthdate")}
                        </button>
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
                      {sortedData?.map((person, idx) => (
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
                                disabled={true || attendanceIsClosed}
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
