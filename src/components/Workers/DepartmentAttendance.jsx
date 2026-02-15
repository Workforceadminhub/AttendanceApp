import { useLocation, useNavigate } from "react-router-dom";
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
import { getNextSunday } from "../../utils/getDate";
import ReactSelectDropdown from "../ReactSelect";
// import TableLoadingState from "../TableLoadingState";
import Layout from "../Layout";
import { switchOffAttendance } from "../../utils/switchOffAttendance";
import { getAdminSelectOptions } from "../../utils/routeObject";
import { ADMIN_ENUMS } from "../../utils/enums";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import { DEBOUNCE_INTERVAL } from "../../utils/constants";
import { debounce } from "lodash";
import ViewHistoryButton from "../ViewHistoryButton";
import { TrashIcon } from "@heroicons/react/24/outline";
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
  const navigate = useNavigate();
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
  const optionsAdmin = getAdminSelectOptions(isChurchAdmin, team, authUser);
  const [attendanceIsClosed, setAttendanceIsClosed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [workerId, setWorkerId] = useState(0);
  const [activeDelete, setActiveDelete] = useState(false);
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("All");
  const [deleteData, setDeleteData] = useState({
    nameofrequester: "",
    reasonfordelete: "",
    roleofrequester: "",
  });

  // Unique departments from response – show filter when more than one
  const departmentsFromData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const set = new Set();
    data.forEach((w) => {
      if (w?.department) set.add(w.department);
    });
    return Array.from(set).sort();
  }, [data]);

  const showDepartmentFilter = departmentsFromData.length > 1;

  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (selectedDepartmentFilter === "All") return data;
    return data.filter((w) => w?.department === selectedDepartmentFilter);
  }, [data, selectedDepartmentFilter]);

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

  const queryAdminWorkers = () => {
    setIsLoading(true);
    fetchAdminWorkers(team.team, activeGroup)
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

  // Reset department filter if selected department no longer in data
  useEffect(() => {
    if (
      selectedDepartmentFilter !== "All" &&
      departmentsFromData.length > 0 &&
      !departmentsFromData.includes(selectedDepartmentFilter)
    ) {
      setSelectedDepartmentFilter("All");
    }
  }, [departmentsFromData, selectedDepartmentFilter]);

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
                {dateForAttendance} -{" "}
                {dateForAttendance?.includes("Sunday")
                  ? "Sunday service"
                  : "Midweek service"}
              </p>
            </div>
            {isAdminMember ? (
              <div className="self-start sm:self-center space-x-2">
                <ViewHistoryButton
                  label="View History"
                  link={`/attendance/history/admin/${team.department}`}
                />
              </div>
            ) : (
              <div>
                <button
                  className="bg-blue-500 px-4 text-white py-2 rounded-lg sm:text-xs xs:text-xs md:text-sm lg:text-sm xl:text-sm"
                  onClick={() => {
                    navigate("/new/worker");
                  }}
                >
                  Add New Worker
                </button>
                <button
                  className="bg-red-500 px-4 text-white py-2 rounded-lg ml-3 text-xs"
                  onClick={() => {
                    setActiveDelete(!activeDelete);
                  }}
                >
                  {activeDelete
                    ? "Complete Request"
                    : "Request to Delete Workers"}
                </button>
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

          {/* Department filter when response has multiple departments */}
          {showDepartmentFilter && (
            <div className="mt-6">
              <ReactSelectDropdown
                title="Filter by department"
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
                  ...departmentsFromData.map((dept) => ({
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
                            Name
                          </th>
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
                        {filteredData?.map((person, idx) => (
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
                    {filteredData?.map((person, idx) => (
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
