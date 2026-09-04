import { useLocation, useNavigate } from "react-router-dom";
import Header from "../Header";
import { getDepartmentByUser } from "../../utils/getDepartment";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
 // fetchAdminWorkers,
 fetchUnmarkedWorkers,
 removeWorker,
} from "../../services/workers";
import { addAttendance } from "../../services/attendance";
import { toast } from "react-toastify";
import { getNextSunday } from "../../utils/getDate";
import ReactSelectDropdown from "../ReactSelect";
import TableLoadingState from "../TableLoadingState";
import Layout from "../Layout";
import { getUserRole } from "../../utils/getUserRole";

import { switchOffAttendance } from "../../utils/switchOffAttendance";
import { getAdminSelectOptions } from "../../utils/routeObject";
import { ADMIN_ENUMS } from "../../utils/enums";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import { DEBOUNCE_INTERVAL } from "../../utils/constants";
import { debounce } from "lodash";
import ViewHistoryButton from "../ViewHistoryButton";
import { TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../Modal";

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

export default function UnmarkedAttendance() {
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
 const { isChurchAdmin: isChurchAdminRole, isSuperAdmin } = getUserRole();
 const isChurchAdmin = isChurchAdminRole || isSuperAdmin || team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
 const isAdminMember = checkAdminStatus(location.pathname);
 const optionsAdmin = getAdminSelectOptions(true, team);
 const [attendanceIsClosed, setAttendanceIsClosed] = useState(false);
 const [modalOpen, setModalOpen] = useState(false);
 const [workerId, setWorkerId] = useState(0);
 const [activeDelete, setActiveDelete] = useState(false);
 const [deleteData, setDeleteData] = useState({
 nameofrequester: "",
 reasonfordelete: "",
 roleofrequester: "",
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

 const attendanceSummary = useMemo(() => {
 if (!Array.isArray(data)) {
 return { total: 0, present: 0, absent: 0, unfilled: 0 };
 }

 const overridesById = new Map(
 (attendance || []).map((item) => [item.workerid, item.attendance])
 );

 let present = 0;
 let absent = 0;
 let unfilled = 0;

 const presentLabels = new Set(["Present", "Online"]);

 data.forEach((person) => {
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
 }, [data, attendance]);

 const unfilledDepartments = useMemo(() => {
 if (!Array.isArray(data)) return [];

 const overridesById = new Map(
 (attendance || []).map((item) => [item.workerid, item.attendance])
 );

 const counts = new Map();

 data.forEach((person) => {
 const overrideStatus = overridesById.get(person.id);
 const rawStatus = overrideStatus || person.attendance || "";
 const status = (rawStatus || "").toString().trim();

 if (status) {
 // Only care about still-unfilled workers
 return;
 }

 const dept = person.department || "Unknown department";
 counts.set(dept, (counts.get(dept) || 0) + 1);
 });

 return Array.from(counts.entries())
 .map(([department, count]) => ({ department, count }))
 .sort((a, b) => {
 if (b.count !== a.count) return b.count - a.count;
 return a.department.localeCompare(b.department);
 });
 }, [data, attendance]);

 const loadUnmarkedWorkers = useCallback(() => {
 setIsLoading(true);
 fetchUnmarkedWorkers(activeGroup)
 .then((res) => {
 setData(res);
 setIsLoading(false);
 })
 .catch((error) => {
 toast.error(`Error marking attendance: ${error.message}`);
 setIsLoading(false);
 });
 }, [activeGroup]);

 useEffect(() => {
 switchOffAttendance()
 .then((res) => setAttendanceIsClosed(res))
 .catch((err) => {/* Silent error handling */});
 }, []);

 useEffect(() => {
 loadUnmarkedWorkers();
 }, [activeGroup, isAdminMember, isChurchAdmin, team.team, loadUnmarkedWorkers]);

 useEffect(() => {
 loadUnmarkedWorkers();
 }, [refresh, loadUnmarkedWorkers]);

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
 };

 const saveAttendance = async () => {
 setAttendanceLoading(true);
 const attendData = data.map((person) => ({
 attendance: "Absent",
 attendancedate: dateForAttendance,
 department: person.department,
 name: person.fullname,
 team: person.team,
 workerid: person.id,
 }));

 try {
 await addAttendance(attendData);
 setRefresh(Math.random());
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
 <div className="min-h-screen bg-cream">
 <Header />
 <Layout>
 <div>
 <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
 <div>
 <div className="qc-eyebrow">Unmarked</div>
 <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
 {team?.department || "Department"}
 </h1>
 <p className="mt-1 text-sm text-ink-500">
 <span className="qc-num text-ink-700">{dateForAttendance}</span>{" "}
 ·{" "}
 {dateForAttendance?.includes("Sunday")
 ? "Sunday service"
 : "Midweek service"}
 </p>
 </div>
 {isAdminMember ? (
 <ViewHistoryButton
 label="View history"
 link={`/attendance/history/admin/${team.department}`}
 />
 ) : (
 <div>
 <button
 className="qc-btn-primary"
 onClick={() => {
 navigate("/new/worker");
 }}
 >
 Add New Worker
 </button>
 <button
 className="bg-brick px-4 text-white py-2 rounded-lg ml-3 text-xs"
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

 {/* Table Section */}
 <div className="mt-6">
 {/* Attendance Summary Cards */}
 <dl className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
 <div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
 <dt className="text-sm font-medium text-ink-500">Total</dt>
 <dd className="mt-1 text-2xl font-semibold text-ink-900">
 {attendanceSummary.total}
 </dd>
 </div>
 <div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
 <dt className="text-sm font-medium text-ink-500">Present</dt>
 <dd className="mt-1 text-2xl font-semibold text-forest">
 {attendanceSummary.present}
 </dd>
 </div>
 <div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
 <dt className="text-sm font-medium text-ink-500">Absent</dt>
 <dd className="mt-1 text-2xl font-semibold text-brick">
 {attendanceSummary.absent}
 </dd>
 </div>
 <div className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6">
 <dt className="text-sm font-medium text-ink-500">Unfilled</dt>
 <dd className="mt-1 text-2xl font-semibold text-mustard">
 {attendanceSummary.unfilled}
 </dd>
 </div>
 </dl>
 {attendanceSummary.unfilled > 0 && unfilledDepartments.length > 0 && (
 <div className="mb-6 rounded-lg border border-mustard/30 bg-mustard/10 px-4 py-4">
 <h2 className="text-sm font-semibold text-mustard">
 Departments with unfilled attendance
 </h2>
 <ul className="mt-2 text-sm text-mustard list-disc list-inside space-y-1">
 {unfilledDepartments.map(({ department, count }) => (
 <li key={department}>
 {department}{" "}
 <span className="text-mustard">
 ({count} unfilled worker{count !== 1 ? "s" : ""})
 </span>
 </li>
 ))}
 </ul>
 </div>
 )}
 {isLoading ? (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-ink-300">
 <TableLoadingState length={5} />
 </table>
 </div>
 ) : (
 <div className="space-y-4">
 {/* Desktop Table */}
 <div className="hidden sm:block">
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-ink-300">
 <thead>
 <tr>
 <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-ink-900 sm:pl-0">
 S/N
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Name
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Department
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Phone number
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Birthday
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Status
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-ink-200">
 {data?.map((person, idx) => (
 <tr key={person.id}>
 <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-ink-900 sm:pl-0">
 {idx + 1}
 </td>
 <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
 {person.fullname}
 </td>
 <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
 {person.department}
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
 <AttendanceDropdown
 person={person}
 isAdminMember={isAdminMember}
 attendanceIsClosed={attendanceIsClosed}
 updateAttendance={updateAttendance}
 options={options}
 />
 </td>
 <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
 {activeDelete && (
 <TrashIcon
 className="text-brick size-5 cursor-pointer"
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
 {data?.map((person, idx) => (
 <div
 key={person.id}
 className="bg-white rounded-lg shadow p-4 space-y-3"
 >
 <div className="flex justify-between items-start">
 <div>
 <p className="font-medium text-ink-900">
 {person.fullname}
 </p>
 <p className="text-sm text-ink-500">
 {person.phonenumber
 ? person.phonenumber.startsWith("0")
 ? person.phonenumber
 : `0${person.phonenumber}`
 : ""}
 </p>
 </div>
 <span className="text-sm text-ink-500">
 #{idx + 1}
 </span>
 </div>
 <div className="text-sm text-ink-500">
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
 className="text-brick size-9 cursor-pointer"
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

 {/* Save Button */}
 {!isAdminMember && (
 <div className="mt-6 flex justify-end">
 <button
 className={`bg-ink-900 text-white px-4 py-2 rounded-lg w-full sm:w-auto ${
 attendanceLoading && "cursor-not-allowed opacity-75"
 }`}
 onClick={saveAttendance}
 disabled={attendanceLoading}
 >
 {attendanceLoading ? "Marking..." : "Mark Absent"}
 </button>
 </div>
 )}
 </div>
 </div>
 </Layout>
 </div>
 );
}
