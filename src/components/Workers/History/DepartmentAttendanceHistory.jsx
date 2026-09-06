// import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getNextSunday } from "../../../utils/getDate";
import { getDepartmentByUser } from "../../../utils/getDepartment";
import { checkAdminStatus } from "../../../utils/checkAdminStatus";
import { filterPermissionsByTeam } from "../../../utils/routeObject";
import { useAdminSelectOptions } from "../../../contexts/DepartmentsContext";
import { fetchAdminWorkers, fetchWorkers } from "../../../services/workers";
import { getUser } from "../../../utils/getUser";
import { expandPermissions } from "../../../utils/expandPermissions";
import { switchOffAttendance } from "../../../utils/switchOffAttendance";
import { addAttendance } from "../../../services/attendance";
import { getUserRole, filterTeamFromPermissions } from "../../../utils/getUserRole";
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
  const { isChurchAdmin, isSuperAdmin } = getUserRole();
  const isAdminMember = checkAdminStatus(location.pathname);
  const authUser = useMemo(() => getUser(), []);
  const optionsAdmin = useAdminSelectOptions(isChurchAdmin, team, authUser);
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

  const queryAdminWorkers = useCallback(() => {
    setIsLoading(true);
    const rawPermissions = expandPermissions(authUser);
    const basePermissions = filterTeamFromPermissions(rawPermissions, authUser?.team);

    const isTeamFilter =
      (isChurchAdmin || isSuperAdmin) && activeGroup && activeGroup !== "All";

    let apiActiveGroup = activeGroup;
    let permissionsForApi = basePermissions;

    if (isTeamFilter) {
      const teamScoped = filterPermissionsByTeam(basePermissions, activeGroup);
      apiActiveGroup = "All";
      if (Array.isArray(teamScoped) && teamScoped.length > 0) {
        permissionsForApi = teamScoped;
      }
    }

    fetchAdminWorkers(team.team, apiActiveGroup, activeHistory, "", permissionsForApi)
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error(`Error marking attendance: ${error.message}`);
        setIsLoading(false);
      });
  }, [
    authUser,
    isChurchAdmin,
    isSuperAdmin,
    activeGroup,
    team.team,
    activeHistory,
  ]);

  const queryWorkers = useCallback(() => {
    setIsLoading(true);
    const permissions = expandPermissions(authUser);
    fetchWorkers(team.department, activeHistory, permissions, "")
      .then((res) => {
        setData(res);
      })
      .catch((error) => {
        toast.error(`Error marking attendance: ${error.message}`);
        setIsLoading(false);
      })
      .finally(() => setIsLoading(false));
  }, [team.department, activeHistory, authUser]);

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
  }, [
    activeGroup,
    activeHistory,
    isAdminMember,
    isChurchAdmin,
    team.team,
    queryAdminWorkers,
    queryWorkers,
  ]);

  useEffect(() => {
    if (isAdminMember) {
      queryAdminWorkers();
    } else {
      queryWorkers();
    }
  }, [refresh, isAdminMember, queryAdminWorkers, queryWorkers]);

  function updateOrAddWorker(array, newWorker) {
    // Find the index of an object with the same workerid
    const index = array.findIndex(
      (worker) => worker.workerid === newWorker.workerid
    );

    // Always return a new array so React sees a state change.
    if (index !== -1) {
      return array.map((worker, i) => (i === index ? newWorker : worker));
    }
    return [...array, newWorker];
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
    try {
      await addAttendance(attendance);
      setRefresh("added");
      toast.success("Attendance added successfully");
    } catch (error) {
      toast.error(error?.message || "Failed to add attendance");
    } finally {
      setAttendanceLoading(false);
    }
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
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div className="min-w-0">
              <div className="qc-eyebrow">History · Attendance</div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight break-words">
                {team?.department || "Department"}
              </h1>
              <p className="mt-1 text-sm text-ink-500 break-words">
                <span className="qc-num text-ink-700">{dateForAttendance}</span>{" "}
                ·{" "}
                {dateForAttendance?.includes("Sunday")
                  ? "Sunday service"
                  : "Midweek service"}
              </p>
            </div>
            <ViewHistoryButton label="← Back to attendance" link={-1} />
          </div>
          {isAdminMember && (
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-2">
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
                className="w-full min-w-0 sm:flex-1 sm:min-w-[200px]"
              />
              <ReactSelectDropdown
                title={"Select Sunday"}
                defaultValue={{
                  value: dateForAttendance,
                  label: dateForAttendance,
                }}
                onChange={handleHistoryChange}
                options={[...historyOptions]}
                className="w-full min-w-0 sm:flex-1 sm:min-w-[200px]"
              />
            </div>
          )}
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-ink-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-ink-900 sm:pl-0"
                      >
                        S/N
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900"
                      >
                        <button
                          type="button"
                          onClick={() => handleSort("name")}
                          className="flex items-center hover:text-ink-700"
                        >
                          <span>Name</span>
                          {getSortIcon("name")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900"
                      >
                        <button
                          type="button"
                          onClick={() => handleSort("phonenumber")}
                          className="flex items-center hover:text-ink-700"
                        >
                          <span>Phone number</span>
                          {getSortIcon("phonenumber")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900"
                      >
                        <button
                          type="button"
                          onClick={() => handleSort("birthdate")}
                          className="flex items-center hover:text-ink-700"
                        >
                          <span>Birthday</span>
                          {getSortIcon("birthdate")}
                        </button>
                      </th>

                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  {isLoading ? (
                    <TableLoadingState length={5} />
                  ) : (
                    <tbody className="divide-y divide-ink-200 h-full">
                      {sortedData?.map((person, idx) => (
                        <tr key={person.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-ink-900 sm:pl-0">
                            {idx + 1}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
                            {person.fullname}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
                            {person.phonenumber
                              ? person.phonenumber.startsWith("0")
                                ? person.phonenumber
                                : `0${person.phonenumber}`
                              : ""}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
                            {person.birthdate}
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
                            <div className="w-48 z-1000 pr-4">
                              <ReactSelectDropdown
                                title="Mark attendance"
                                disabled
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
                  className={`bg-ink-900 text-white p-1.5 ml-[85%] rounded-lg ${
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
