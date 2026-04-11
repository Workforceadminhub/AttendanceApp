import { useLocation } from "react-router-dom";
import Header from "../Header";
import { getDepartmentByUser } from "../../utils/getDepartment";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminWorkers,
  fetchWorkers,
  removeWorker,
} from "../../services/workers";
import { addAttendance } from "../../services/attendance";
import { toast } from "react-toastify";
import { getNextSunday, getSundayDisplayDate } from "../../utils/getDate";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ReactSelectDropdown from "../ReactSelect";
// import TableLoadingState from "../TableLoadingState";
import Layout from "../Layout";
import { switchOffAttendance } from "../../utils/switchOffAttendance";
import { getAdminSelectOptions, filterPermissionsByTeam } from "../../utils/routeObject";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import { getUserRole, filterTeamFromPermissions } from "../../utils/getUserRole";
import { fetchDepartments } from "../../services/departments";
import { DEBOUNCE_INTERVAL } from "../../utils/constants";
import { debounce } from "lodash";
import ViewHistoryButton from "../ViewHistoryButton";
import { TrashIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import Modal from "../Modal";
import { getUser } from "../../utils/getUser";
import LoadingState from "../LoadingState";

/** Convert "Sunday - d/m/y" → Date object */
function sundayStringToDate(dateStr) {
  if (!dateStr || !/^Sunday - \d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return null;
  const parts = dateStr.split(" - ")[1].split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  return new Date(year, month - 1, day);
}

/** Convert Date object → "Sunday - d/m/yyyy" string the backend expects */
function dateToSundayString(date) {
  if (!date) return "";
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `Sunday - ${day}/${month}/${year}`;
}

/** Only allow Sundays in the date picker */
function isSunday(date) {
  return date.getDay() === 0;
}

// Separate component for the attendance dropdown to reduce duplication
const AttendanceDropdown = ({
  person,
  disabled,
  attendanceIsClosed,
  updateAttendance,
  options,
  className,
}) => {
  return (
    <ReactSelectDropdown
      title="Mark attendance"
      disabled={disabled || person.attendance || attendanceIsClosed}
      defaultValue={
        person?.attendance
          ? {
              value: person.attendance.toLowerCase(),
              label: person.attendance,
            }
          : undefined
      }
      onChange={(selected) =>
        selected?.value !== null && updateAttendance(selected, person)
      }
      options={options}
      className={className}
    />
  );
};

const PAGE_SIZE = 100;

function sortWorkersById(workers) {
  if (!Array.isArray(workers)) return [];
  return [...workers].sort((a, b) => {
    const idA = (a?.workerid ?? a?.workerId ?? a?.id ?? "").toString();
    const idB = (b?.workerid ?? b?.workerId ?? b?.id ?? "").toString();
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
  });
}

export default function DepartmentAttendance() {
  const location = useLocation();
  // const team = getDepartment(location.pathname);
  const [attendance, setAttendance] = useState([]);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const dateForAttendance = getNextSunday();
  const [refresh, setRefresh] = useState(0);
  const [activeGroup, setActiveGroup] = useState("All");
  const team = getDepartmentByUser(location.pathname);
  const { isChurchAdmin, isSuperAdmin, isSubTeamAdmin, assignedDepartments } = getUserRole();
  const assignedDepartmentsKey = JSON.stringify(
    (assignedDepartments ?? []).map((r) => String(r || "")).sort()
  );
  const isAdminMember = checkAdminStatus(location.pathname);
  const authUser = getUser();
  const optionsAdmin = getAdminSelectOptions(isChurchAdmin, team, authUser);
  const [attendanceIsClosed, setAttendanceIsClosed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [workerId, setWorkerId] = useState(0);
  const [activeDelete] = useState(false);
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("All");
  const [deleteData, setDeleteData] = useState({
    nameofrequester: "",
    reasonfordelete: "",
    roleofrequester: "",
  });
  const [apiDepartments, setApiDepartments] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc", // 'asc' or 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);

  // ── History mode: date picker ─────────────────────────────────────
  // Max selectable date = the current/next Sunday; min = first Sunday of 2026
  const maxSundayDate = useMemo(() => sundayStringToDate(dateForAttendance), [dateForAttendance]);
  const minSundayDate = useMemo(() => {
    // First Sunday of 2026
    const jan1 = new Date(2026, 0, 1);
    const offset = jan1.getDay() === 0 ? 0 : 7 - jan1.getDay();
    return new Date(2026, 0, 1 + offset);
  }, []);

  // Track picked date as a Date object; default = current/live Sunday
  const [selectedDate, setSelectedDate] = useState(() => sundayStringToDate(dateForAttendance));

  // Derive the "Sunday - d/m/y" string the API needs
  const selectedSunday = useMemo(
    () => (selectedDate ? dateToSundayString(selectedDate) : dateForAttendance),
    [selectedDate, dateForAttendance]
  );

  // When the selected Sunday differs from the live date, we're in "history mode"
  const isHistoryMode = selectedSunday !== dateForAttendance;

  // Unique departments from response – used for non–sub-team-admin
  const departmentsFromData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const set = new Set();
    data.forEach((w) => {
      if (w?.department) set.add(w.department);
    });
    return Array.from(set).sort();
  }, [data]);

  // Department options for filter:
  // - Sub-team-admin: derive from user.permissions (static list, not affected by filtered data)
  // - Others: from workers data when there is more than one
  const availableDepartments = useMemo(() => {
    if (!isSubTeamAdmin) {
      return departmentsFromData;
    }
    const raw = Array.isArray(authUser?.permissions) ? authUser.permissions : [];
    const names = raw
      .map((p) => (p ?? "").toString().trim())
      .filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [isSubTeamAdmin, authUser, departmentsFromData]);

  // Show secondary "All departments" filter ONLY when not on admin-level routes.
  // Team admins (e.g. /attendance/admin/ministry) already have the top-level
  // "All teams/departments" filter and should not see a second filter.
  const showDepartmentFilter = !isAdminMember
    ? isSubTeamAdmin
      ? availableDepartments.length > 0
      : departmentsFromData.length > 1
    : false;

  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (selectedDepartmentFilter === "All") return data;
    return data.filter((w) => w?.department === selectedDepartmentFilter);
  }, [data, selectedDepartmentFilter]);

  const getSortableValue = (person, key) => {
    switch (key) {
      case "id":
        return (
          person.workerid ??
          person.workerId ??
          person.id ??
          ""
        );
      case "name":
        return person.fullname ?? "";
      case "department":
        return person.department ?? "";
      case "phonenumber":
        return person.phonenumber ?? "";
      case "birthdate":
        return person.birthdate ?? "";
      default:
        return person[key];
    }
  };

  const sortedData = useMemo(() => {
    const items = Array.isArray(filteredData) ? [...filteredData] : [];

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
  }, [filteredData, sortConfig]);

  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageStartIndex = (currentPageSafe - 1) * PAGE_SIZE;
  const paginatedData = sortedData.slice(
    pageStartIndex,
    pageStartIndex + PAGE_SIZE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const attendanceSummary = useMemo(() => {
    if (!Array.isArray(filteredData)) {
      return { total: 0, present: 0, absent: 0, unfilled: 0 };
    }

    const overridesById = new Map(
      (attendance || []).map((item) => [item.workerid, item.attendance])
    );

    let present = 0;
    let absent = 0;
    let unfilled = 0;

    const presentLabels = new Set(["Present", "Online"]);

    filteredData.forEach((person) => {
      const overrideStatus = overridesById.get(person.id);
      const rawStatus = overrideStatus || person.attendance || "";
      const status = (rawStatus || "").toString().trim();

      if (!status) {
        unfilled += 1;
      } else if (presentLabels.has(status)) {
        present += 1;
      } else {
        absent += 1;
      }
    });

    const total = present + absent + unfilled;

    return { total, present, absent, unfilled };
  }, [filteredData, attendance]);

  const unfilledDepartments = useMemo(() => {
    if (!Array.isArray(filteredData)) return [];

    const overridesById = new Map(
      (attendance || []).map((item) => [item.workerid, item.attendance])
    );

    const counts = new Map();

    filteredData.forEach((person) => {
      const overrideStatus = overridesById.get(person.id);
      const rawStatus = overrideStatus || person.attendance || "";
      const status = (rawStatus || "").toString().trim();

      if (status) {
        return;
      }

      const dept = person.department || team?.department || "Unknown department";
      counts.set(dept, (counts.get(dept) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.department.localeCompare(b.department);
      });
  }, [filteredData, attendance, team?.department]);

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

  // Show department column for:
  // - Sub-team admins (multiple departments)
  // - Admin-level views (e.g. /attendance/admin/ministry)
  const showDepartmentColumn = isSubTeamAdmin || isAdminMember;

  // Allow church admin to mark attendance, keep other admin roles read-only
  const disableForAdminRole = isAdminMember && !isChurchAdmin;

  const queryAdminWorkers = useCallback(() => {
    setIsLoading(true);
    const rawPermissions = authUser?.permissions ?? [];
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

    fetchAdminWorkers(team.team, apiActiveGroup, selectedSunday, "", permissionsForApi)
      .then((res) => {
        setData(sortWorkersById(res));
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error(`Error loading attendance: ${error.message}`);
        setIsLoading(false);
      });
  }, [
    authUser?.permissions,
    authUser?.team,
    isChurchAdmin,
    isSuperAdmin,
    activeGroup,
    team.team,
    selectedSunday,
  ]);

  const queryWorkers = useCallback(() => {
    setIsLoading(true);
    const permissions = authUser?.permissions ?? [];

    if (isSubTeamAdmin && selectedDepartmentFilter !== "All") {
      fetchWorkers(selectedDepartmentFilter, selectedSunday, permissions, "")
        .then((res) => {
          setData(sortWorkersById(res));
          setIsLoading(false);
        })
        .catch((error) => {
          toast.error(`Error loading attendance: ${error.message}`);
          setIsLoading(false);
        });
      return;
    }

    if (isSubTeamAdmin && apiDepartments.length > 0) {
      Promise.all(
        apiDepartments.map((d) => fetchWorkers(d.name, selectedSunday, permissions, ""))
      )
        .then((results) => {
          const merged = results.flat();
          setData(sortWorkersById(merged));
          setIsLoading(false);
        })
        .catch((error) => {
          toast.error(`Error loading attendance: ${error.message}`);
          setIsLoading(false);
        });
      return;
    }

    fetchWorkers(team.department, selectedSunday, permissions, "")
      .then((res) => {
        setData(sortWorkersById(res));
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error(`Error loading attendance: ${error.message}`);
        setIsLoading(false);
      });
  }, [
    authUser?.permissions,
    isSubTeamAdmin,
    selectedDepartmentFilter,
    apiDepartments,
    team.department,
    selectedSunday,
  ]);

  useEffect(() => {
    switchOffAttendance()
      .then((res) => setAttendanceIsClosed(res))
      .catch(() => {});
  }, []);

  // Sub-team-admin: fetch departments from API and keep only assigned.
  // `assignedDepartmentsKey` avoids re-running when getUserRole() returns a new array with same contents.
  useEffect(() => {
    if (!isSubTeamAdmin || isAdminMember) return;
    let cancelled = false;
    fetchDepartments()
      .then((list) => {
        if (cancelled || !Array.isArray(list)) return;
        const assigned = (assignedDepartments || []).map((r) =>
          (r || "").replace(/^\//, "").toLowerCase()
        );
        const filtered = list.filter((d) => {
          const route = (d?.route || "").replace(/^\//, "").toLowerCase();
          return assigned.length === 0 || assigned.includes(route);
        });
        setApiDepartments(filtered);
      })
      .catch(() => setApiDepartments([]));
    return () => {
      cancelled = true;
    };
  }, [isSubTeamAdmin, isAdminMember, assignedDepartmentsKey, assignedDepartments]);

  const subTeamSelectedDepartmentDep = isSubTeamAdmin
    ? selectedDepartmentFilter
    : null;
  const subTeamApiDepartmentsCountDep = isSubTeamAdmin ? apiDepartments.length : 0;

  useEffect(() => {
    if (isHistoryMode) setAttendance([]);
    if (isAdminMember) {
      queryAdminWorkers();
    } else {
      queryWorkers();
    }
  }, [
    activeGroup,
    isAdminMember,
    isChurchAdmin,
    team.team,
    subTeamSelectedDepartmentDep,
    subTeamApiDepartmentsCountDep,
    selectedSunday,
    isHistoryMode,
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

  // Reset department filter if selected department no longer in available list
  const availableDepartmentNames = availableDepartments;
  useEffect(() => {
    if (
      selectedDepartmentFilter !== "All" &&
      availableDepartmentNames.length > 0 &&
      !availableDepartmentNames.includes(selectedDepartmentFilter)
    ) {
      setSelectedDepartmentFilter("All");
    }
  }, [availableDepartmentNames, selectedDepartmentFilter]);

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
  };

  const saveAttendance = async () => {
    try {
      setAttendanceLoading(true);
      await addAttendance(attendance);
      setAttendanceLoading(false);
      setRefresh(Math.random());
      toast.success("Attendance added successfully");
    } catch (error) {
      // error handling
      setAttendanceLoading(false);
      toast.error(`Error adding attendance: ${error.message}`);
    }
  };

  const debouncedSetActiveGroup = debounce(
    (value) => setActiveGroup(value),
    DEBOUNCE_INTERVAL
  );

  const handleChange = (selected) => {
    debouncedSetActiveGroup(selected?.value);
  };

  const removeWorkerData = () => {
    if (
      !deleteData.nameofrequester ||
      !deleteData.reasonfordelete ||
      !deleteData.roleofrequester
    ) {
      toast.error("Please fill all required fields");
    } else {
      setIsLoading(true);
      removeWorker(workerId, deleteData)
        .then(() => {
          toast.success("Request submitted and pending approval");
          setIsLoading(false);
          setModalOpen(false);
          setRefresh(Math.random());
        })
        .catch((error) => toast.error(`Error removing worker: ${error.message}`));
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <Header />
      <Layout>
        <div>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                {team?.department} attendance
              </h1>
              <p className="text-sm text-gray-600">
                {getSundayDisplayDate(selectedSunday)} -{" "}
                {selectedSunday?.includes("Sunday")
                  ? "Sunday service"
                  : "Midweek service"}
              </p>
            </div>
            {isAdminMember && (
              <div className="self-start sm:self-center space-x-2">
                <ViewHistoryButton
                  label="View History"
                  link={`/attendance/history/admin/${team.department}`}
                />
              </div>
            )}
          </div>

          {/* Date Filter (Sundays only) */}
          <div className="mt-4 flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            {isHistoryMode && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Viewing history
              </span>
            )}
            <span className="text-sm font-medium text-gray-700">Date Filter</span>
            <DatePicker
              id="sundayDatePicker"
              selected={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                setCurrentPage(1);
              }}
              filterDate={isSunday}
              minDate={minSundayDate}
              maxDate={maxSundayDate}
              dateFormat="EEE, d MMM yyyy"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              calendarClassName="sunday-only-calendar"
              dayClassName={(date) =>
                date.getDay() !== 0 ? "non-sunday-day" : "sunday-day"
              }
            />
          </div>

          {/* Admin Controls */}
          {isAdminMember && (
            <div className="mt-6">
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
                className="w-full min-w-0 sm:w-[45%] md:w-[30%] lg:w-[25%] xl:w-[25%]"
              />
            </div>
          )}

          {/* Department filter: for sub-team-admin from API; otherwise when response has multiple departments */}
          {showDepartmentFilter && (
            <div className="mt-6">
              <ReactSelectDropdown
                title="Filter by department"
                isClearable={false}
                value={{
                  value: selectedDepartmentFilter,
                  label:
                    selectedDepartmentFilter === "All"
                      ? "All departments"
                      : selectedDepartmentFilter,
                }}
                onChange={(selected) =>
                  setSelectedDepartmentFilter(selected?.value ?? "All")
                }
                options={[
                  { value: "All", label: "All departments" },
                  ...availableDepartments.map((dept) => ({
                    value: dept,
                    label: dept,
                  })),
                ]}
                className="w-full min-w-0 sm:w-[45%] md:w-[30%] lg:w-[25%] xl:w-[25%]"
              />
            </div>
          )}

          {/* Table Section */}
          <div className="mt-6">
            {/* Attendance Summary Cards */}
            <dl className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
                <dt className="text-sm font-medium text-gray-500">Total</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {attendanceSummary.total}
                </dd>
              </div>
              <div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
                <dt className="text-sm font-medium text-gray-500">Present</dt>
                <dd className="mt-1 text-2xl font-semibold text-green-600">
                  {attendanceSummary.present}
                </dd>
              </div>
              <div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
                <dt className="text-sm font-medium text-gray-500">Absent</dt>
                <dd className="mt-1 text-2xl font-semibold text-red-600">
                  {attendanceSummary.absent}
                </dd>
              </div>
              <div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
                <dt className="text-sm font-medium text-gray-500">Unfilled</dt>
                <dd className="mt-1 text-2xl font-semibold text-amber-600">
                  {attendanceSummary.unfilled}
                </dd>
              </div>
            </dl>
            {attendanceSummary.unfilled > 0 && unfilledDepartments.length > 0 && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
                <h2 className="text-sm font-semibold text-amber-800">
                  Departments with unfilled attendance
                </h2>
                <ul className="mt-2 text-sm text-amber-900 list-disc list-inside space-y-1">
                  {unfilledDepartments.map(({ department, count }) => (
                    <li key={department}>
                      {department}{" "}
                      <span className="text-amber-700">
                        ({count} unfilled worker{count !== 1 ? "s" : ""})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isLoading ? (
              <LoadingState />
            ) : (
              <div className="space-y-4">
                {/* Desktop Table */}
                <div className="hidden sm:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                            S/N
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            <button
                              type="button"
                              onClick={() => handleSort("name")}
                              className="flex items-center hover:text-gray-700"
                            >
                              <span>Name</span>
                              {getSortIcon("name")}
                            </button>
                          </th>
                          {showDepartmentColumn && (
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              <button
                                type="button"
                                onClick={() => handleSort("department")}
                                className="flex items-center hover:text-gray-700"
                              >
                                <span>Department</span>
                                {getSortIcon("department")}
                              </button>
                            </th>
                          )}
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Phone number
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Birthday
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedData?.map((person, idx) => (
                          <tr key={person.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                              {pageStartIndex + idx + 1}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {person.fullname}
                            </td>
                            {showDepartmentColumn && (
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {person.department ?? "—"}
                              </td>
                            )}
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
                              <AttendanceDropdown
                                person={person}
                                disabled={disableForAdminRole || isHistoryMode}
                                attendanceIsClosed={attendanceIsClosed}
                                updateAttendance={updateAttendance}
                                options={options}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {activeDelete && !isHistoryMode && (
                                <TrashIcon
                                  className="text-red-500 size-5 cursor-pointer"
                                  onClick={() => {
                                    setModalOpen(true);
                                    setWorkerId(person.id);
                                  }}
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Modal
                  confirmText="Yes, Delete"
                  title="Request to delete worker"
                  onConfirm={() => removeWorkerData()}
                  isOpen={modalOpen}
                  onClose={() => setModalOpen(false)}
                  confirmingText="Deleting..."
                  formData={deleteData}
                  setFormData={setDeleteData}
                />

                {/* Mobile Cards */}
                <div className="sm:hidden">
                  <div className="space-y-4">
                    {paginatedData?.map((person, idx) => (
                      <div
                        key={person.id}
                        className="bg-white rounded-lg shadow p-4 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {person.fullname}
                            </p>
                            <p className="text-sm text-gray-500">
                              {person.phonenumber
                                ? person.phonenumber.startsWith("0")
                                  ? person.phonenumber
                                  : `0${person.phonenumber}`
                                : ""}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">
                            #{pageStartIndex + idx + 1}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          <p>Birthday: {person.birthdate}</p>
                          {showDepartmentColumn && person.department && (
                            <p>Department: {person.department}</p>
                          )}
                        </div>
                        <div className="pt-2 flex space-x-3">
                          <AttendanceDropdown
                            person={person}
                            disabled={disableForAdminRole || isHistoryMode}
                            attendanceIsClosed={attendanceIsClosed}
                            updateAttendance={updateAttendance}
                            options={options}
                            className="w-full"
                          />
                          {activeDelete && !isHistoryMode && (
                            <TrashIcon
                              className="text-red-500 size-9 cursor-pointer"
                              onClick={() => {
                                setModalOpen(true);
                                setWorkerId(person.id);
                              }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-sm text-gray-600">
                      {totalItems === 0
                        ? "Showing 0 of 0 workers"
                        : `Showing ${pageStartIndex + 1}–${Math.min(
                            pageStartIndex + PAGE_SIZE,
                            totalItems
                          )} of ${totalItems} workers`}
                    </p>
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPageSafe === 1}
                        className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 bg-white enabled:hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {currentPageSafe} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPageSafe === totalPages}
                        className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 bg-white enabled:hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            {!isAdminMember && !isHistoryMode && (
              <div className="mt-6 flex justify-end">
                <button
                  className={`bg-blue-500 text-white px-4 py-2 rounded-lg w-full sm:w-auto ${
                    attendanceLoading && "cursor-not-allowed opacity-75"
                  }`}
                  onClick={saveAttendance}
                  disabled={attendanceLoading}
                >
                  {attendanceLoading ? "Saving..." : "Save attendance"}
                </button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </div>
  );
}
