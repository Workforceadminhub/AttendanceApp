import { useLocation } from "react-router-dom";
import Header from "../Header";
import { getDepartmentByUser } from "../../utils/getDepartment";
import { useEffect, useMemo, useState } from "react";
import {
  fetchAdminWorkers,
  fetchWorkers,
  removeWorker,
} from "../../services/workers";
import { addAttendance } from "../../services/attendance";
import { toast } from "react-toastify";
import { getNextSunday, getSundayDisplayDate } from "../../utils/getDate";
import ReactSelectDropdown from "../ReactSelect";
// import TableLoadingState from "../TableLoadingState";
import Layout from "../Layout";
import { switchOffAttendance } from "../../utils/switchOffAttendance";
import { getAdminSelectOptions } from "../../utils/routeObject";
import { ADMIN_ENUMS } from "../../utils/enums";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import { getUserRole } from "../../utils/getUserRole";
import { fetchDepartments } from "../../services/departments";
import { DEBOUNCE_INTERVAL } from "../../utils/constants";
import { debounce } from "lodash";
import ViewHistoryButton from "../ViewHistoryButton";
import { TrashIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import Modal from "../Modal";
import { getUser } from "../../utils/getUser";
import LoadingState from "../LoadingState";

// Separate component for the attendance dropdown to reduce duplication
const AttendanceDropdown = ({
  person,
  isAdminMember,
  attendanceIsClosed,
  updateAttendance,
  options,
  className,
}) => {
  return (
    <ReactSelectDropdown
      title="Mark attendance"
      disabled={isAdminMember || person.attendance || attendanceIsClosed}
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
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isAdminMember = checkAdminStatus(location.pathname);
  const authUser = getUser();
  const { isSubTeamAdmin, assignedDepartments } = getUserRole();
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

  const sortWorkersById = (workers) => {
    if (!Array.isArray(workers)) return [];
    return [...workers].sort((a, b) => {
      const idA = (a?.workerid ?? a?.workerId ?? a?.id ?? "").toString();
      const idB = (b?.workerid ?? b?.workerId ?? b?.id ?? "").toString();
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
    });
  };

  // Show department column for:
  // - Sub-team admins (multiple departments)
  // - Admin-level views (e.g. /attendance/admin/ministry)
  const showDepartmentColumn = isSubTeamAdmin || isAdminMember;

  const queryAdminWorkers = () => {
    setIsLoading(true);
    const rawPermissions = authUser?.permissions ?? [];
    // Filter out team name from permissions (team name shouldn't be in permissions array)
    const permissions = rawPermissions.filter((perm) => perm !== authUser?.team);
    fetchAdminWorkers(team.team, activeGroup, dateForAttendance, "", permissions)
      .then((res) => {
        setData(sortWorkersById(res));
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error(`Error loading attendance: ${error.message}`);
        setIsLoading(false);
      });
  };

  const queryWorkers = () => {
    setIsLoading(true);
    const permissions = authUser?.permissions ?? [];

    if (isSubTeamAdmin && selectedDepartmentFilter !== "All") {
      fetchWorkers(selectedDepartmentFilter, dateForAttendance, permissions, "")
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
        apiDepartments.map((d) =>
          fetchWorkers(d.name, dateForAttendance, permissions, "")
        )
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

    fetchWorkers(team.department, dateForAttendance, permissions, "")
      .then((res) => {
        setData(sortWorkersById(res));
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error(`Error loading attendance: ${error.message}`);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    switchOffAttendance()
      .then((res) => setAttendanceIsClosed(res))
      .catch(() => {});
  }, []);

  // Sub-team-admin: fetch departments from API and keep only assigned.
  // IMPORTANT: we intentionally do NOT include `assignedDepartments` in the deps array,
  // because `getUserRole()` returns a new array reference on every render, which would
  // cause this effect to re-run on each render and spam the `/api/departments` endpoint.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubTeamAdmin, isAdminMember]);

  const subTeamSelectedDepartmentDep = isSubTeamAdmin
    ? selectedDepartmentFilter
    : null;
  const subTeamApiDepartmentsCountDep = isSubTeamAdmin ? apiDepartments.length : 0;

  useEffect(() => {
    if (isAdminMember) {
      queryAdminWorkers();
    } else {
      queryWorkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeGroup,
    isAdminMember,
    isChurchAdmin,
    team.team,
    subTeamSelectedDepartmentDep,
    subTeamApiDepartmentsCountDep,
  ]);

  useEffect(() => {
    if (isAdminMember) {
      queryAdminWorkers();
    } else {
      queryWorkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

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
                {getSundayDisplayDate()} -{" "}
                {dateForAttendance?.includes("Sunday")
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
                className="lg:w-[25%] md:w-[30%] xl:w-[25%] sm:w-[45%] xs:w-[50%]"
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
                className="lg:w-[25%] md:w-[30%] xl:w-[25%] sm:w-[45%] xs:w-[50%]"
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
                        {sortedData?.map((person, idx) => (
                          <tr key={person.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                              {idx + 1}
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
                                isAdminMember={isAdminMember}
                                attendanceIsClosed={attendanceIsClosed}
                                updateAttendance={updateAttendance}
                                options={options}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {activeDelete && (
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
                    {sortedData?.map((person, idx) => (
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
                            #{idx + 1}
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
                            isAdminMember={isAdminMember}
                            attendanceIsClosed={attendanceIsClosed}
                            updateAttendance={updateAttendance}
                            options={options}
                            className="w-full"
                          />
                          {activeDelete && (
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
              </div>
            )}

            {/* Save Button Mobile */}
            {!isAdminMember && (
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
