import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import {
 teamsAndDepartments,
 normalizeWorkerRole,
 isPastorIsaacCommunity,
 isPastorBiolaCommunity,
} from "../utils/teams";
import BirthDatePicker from "../components/BirthDatePicker";
import { getUserRole, canAccessDepartment } from "../utils/getUserRole";
import { getDepartmentRoute, getEffectiveRouteList } from "../utils/routeObject";
import { fetchTeamsAndDepartmentsForFilter } from "../services/departments";
import apiRequest from "../utils/apiClient";

const isDistrictsTeam = (team) =>
 team === "Districts" || team === "District";

export default function ViewWorker() {
 const navigate = useNavigate();
 const { workerId } = useParams();
 const location = useLocation();
 const [worker, setWorker] = useState(null);
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);
 const [editedWorker, setEditedWorker] = useState({});
 const [hasChanges, setHasChanges] = useState(false);
 const [filterData, setFilterData] = useState({
 teams: [],
 departments: [],
 departmentsByTeam: {},
 });
 const [teamOptions, setTeamOptions] = useState(
 teamsAndDepartments.map((t) => ({ value: t.team, label: t.team }))
 );
 const [departmentOptions, setDepartmentOptions] = useState([]);

 const { isSuperAdmin, isChurchAdmin, isHOD, isTeamAdmin, isSubTeamAdmin } = getUserRole();

 // Check if user can edit workers (Super Admin, Church Admin, HOD, Team Admin, Sub Team Admin)
 const canEditWorkers =
 isSuperAdmin || isChurchAdmin || isHOD || isTeamAdmin || isSubTeamAdmin;

 useEffect(() => {
 if (!canEditWorkers) {
 toast.error("Access denied. You do not have permission to edit workers.");
 navigate("/login");
 return;
 }
 }, [canEditWorkers, navigate]);

 useEffect(() => {
 let mounted = true;
 fetchTeamsAndDepartmentsForFilter().then((data) => {
 if (!mounted) return;
 setFilterData(data);
 const teams = (data.teams || []).filter((t) => t.value !== "All");
 if (teams.length) setTeamOptions(teams);
 }).catch(() => {});
 return () => {
 mounted = false;
 };
 }, []);

 useEffect(() => {
 const team = editedWorker.team;
 if (!team) {
 setDepartmentOptions([]);
 return;
 }
 const hideTeamNamed = (dept) => {
 const d = String(dept || "").trim();
 if (!d) return false;
 if (d.toLowerCase() === String(team).trim().toLowerCase()) return false;
 const lower = d.toLowerCase();
 if (lower === "pastor biola" || lower === "pastor isaac") return false;
 if (lower === "pastor biola cluster" || lower === "pastor isaac cluster") return false;
 return true;
 };
 const depts =
 filterData.departmentsByTeam?.[team] ||
 filterData.departmentsByTeam?.[team === "Districts" ? "District" : team] ||
 [];
 if (depts.length) {
 setDepartmentOptions(
 depts.filter(hideTeamNamed).map((d) => ({ value: d, label: d }))
 );
 return;
 }
 const effective = Array.from(
 new Set(
 getEffectiveRouteList()
 .filter(
 (r) =>
 r.team === team ||
 (team === "Districts" && r.team === "District") ||
 (team === "District" && r.team === "Districts")
 )
 .map((r) => r.department)
 .filter(hideTeamNamed)
 )
 ).sort();
 setDepartmentOptions(effective.map((d) => ({ value: d, label: d })));
 }, [editedWorker.team, filterData]);

 // Fetch worker details
 useEffect(() => {
 const fetchWorkerDetails = async () => {
 try {
 const responseData = await apiRequest(
 "GET",
 `/api/super/admin/${workerId}/workers/details`
 );

 // Handle different possible response structures
 let workerData = responseData;
 if (responseData.data) {
 workerData = responseData.data;
 } else if (responseData.worker) {
 workerData = responseData.worker;
 }

 // For non-Super/Church Admin: verify worker is in accessible department
 const authUser = JSON.parse(sessionStorage.getItem("authUser"));
 if (authUser?.department !== "Super Admin" && authUser?.department !== "Church Admin") {
 const workerDept = workerData.department || workerData.department_name;
 if (!canAccessDepartment(workerDept)) {
 toast.error("Access denied. This worker is not in a department you manage.");
 navigate(getHODCancelPath());
 return;
 }
 }

 setWorker(workerData);
 setEditedWorker(workerData);
 } catch (error) {
 toast.error("Failed to fetch worker details");
 } finally {
 setIsLoading(false);
 }
 };

 if (workerId) {
 fetchWorkerDetails();
 }
 }, [workerId, navigate]);

 const getHODCancelPath = () => {
 const authUser = JSON.parse(sessionStorage.getItem("authUser"));
 if (!authUser) return "/login";
 if (authUser.department === "Church Admin") return "/church-admin/workers";
 if (authUser.department === "Super Admin") return "/workers/super-admin";
 const route = getDepartmentRoute(authUser.department);
 return `/department/${route || encodeURIComponent(authUser.department)}/workers`;
 };

 const handleCancel = () => {
 // Check if user came from a specific page
 const urlParams = new URLSearchParams(location.search);
 const from = urlParams.get("from");

 if (from === "pending-workers") {
 navigate("/pending-workers");
 return;
 }

 if (from === "all-workers") {
 navigate("/all-workers");
 return;
 }

 if (from === "team-mismatch") {
 navigate("/team-mismatch");
 return;
 }

 if (from?.startsWith("department:")) {
 const dept = decodeURIComponent(from.replace("department:", ""));
 const route = getDepartmentRoute(dept);
 navigate(`/department/${route || encodeURIComponent(dept)}/workers`, {
 state: { refresh: true },
 });
 return;
 }

 navigate(getHODCancelPath(), { state: { refresh: true } });
 };

 const handleSave = async () => {
 // Validate required fields (relaxed for Super Admin: only basic identity and placement)
  if (
    !editedWorker.firstname ||
    !editedWorker.lastname ||
    !editedWorker.department ||
    !editedWorker.team
  ) {
    toast.error(
      "Please fill in all required fields (First Name, Last Name, Department, Team)"
    );
    return;
  }
  if (editedWorker.phonenumber && !/^\d{11}$/.test(String(editedWorker.phonenumber).trim())) {
    toast.error("Phone number must be exactly 11 digits.");
    return;
  }

 // Find only the fields that have changed
 const changedFields = {};
 const fieldsToCheck = [
 'firstname', 'lastname', 'othername', 'fullname', 'fullnamereverse', 'email', 'phonenumber',
 'maritalstatus', 'department', 'team', 'district_sub_team', 'workerrole', 'birthdate',
 'agerange', 'gender', 'address', 'occupation', 'employment'
 ];

 fieldsToCheck.forEach(field => {
 if (editedWorker[field] !== worker[field]) {
 changedFields[field] = editedWorker[field];
 }
 });

 // If no fields have changed, show message and return
 if (Object.keys(changedFields).length === 0) {
 toast.info("No changes detected");
 return;
 }

 setIsSaving(true);
 try {
 const fieldsToSend = { ...changedFields };
 if (fieldsToSend.workerrole !== undefined) {
 fieldsToSend.workerrole = normalizeWorkerRole(fieldsToSend.workerrole);
 }

 await apiRequest("PUT", "/api/super/admin/workers", {
 id: parseInt(workerId),
 ...fieldsToSend,
 });

 toast.success("Worker updated successfully");
 setWorker(editedWorker);
 setHasChanges(false);
 } catch (error) {
 toast.error("Failed to update worker");
 } finally {
 setIsSaving(false);
 }
 };

 const checkForChanges = (newEditedWorker) => {
 if (!worker) return false;
 
 const fieldsToCheck = [
 'firstname', 'lastname', 'othername', 'fullname', 'fullnamereverse', 'email', 'phonenumber',
 'maritalstatus', 'department', 'team', 'district_sub_team', 'workerrole', 'birthdate',
 'agerange', 'gender', 'address', 'occupation', 'employment'
 ];

 return fieldsToCheck.some(field => {
 return newEditedWorker[field] !== worker[field];
 });
 };

 const handleInputChange = (field, value) => {
 const newEditedWorker = {
 ...editedWorker,
 [field]: value,
 };

 if (field === "team") {
 if (!isDistrictsTeam(value)) {
 newEditedWorker.district_sub_team = "";
 }
 }

 if (field === "department" && isDistrictsTeam(editedWorker.team)) {
 if (isPastorIsaacCommunity(value)) {
 newEditedWorker.district_sub_team = "Pastor Isaac Cluster";
 } else if (isPastorBiolaCommunity(value)) {
 newEditedWorker.district_sub_team = "Pastor Biola Cluster";
 }
 }

 setEditedWorker(newEditedWorker);
 setHasChanges(checkForChanges(newEditedWorker));
 };

 // Debug: Log the current worker data
 useEffect(() => {
 if (worker) {
 }
 }, [worker, editedWorker]);

 if (isLoading) {
 return (
 <div className="min-h-screen bg-cream">
 <Header />
 <Layout>
 <div className="max-w-4xl mx-auto">
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-10 w-10 border-2 border-ink-200 border-t-ink-900"></div>
 </div>
 </div>
 </Layout>
 </div>
 );
 }

 if (!worker) {
 return (
 <div className="min-h-screen bg-cream">
 <Header />
 <Layout>
 <div className="max-w-md mx-auto qc-card p-8 text-center mt-12">
 <div className="qc-eyebrow text-ink-400">404</div>
 <h1 className="mt-2 text-xl font-medium text-ink-900">
 Worker not found
 </h1>
 <p className="mt-1 text-sm text-ink-500">
 The worker you&rsquo;re looking for doesn&rsquo;t exist or has been removed.
 </p>
 <button
 type="button"
 onClick={handleCancel}
 className="qc-btn-primary mt-6"
 >
 ← Back to workers
 </button>
 </div>
 </Layout>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-cream">
 <Header />
 <Layout>
 <div className="max-w-4xl mx-auto">
 <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
 <div>
 <div className="qc-eyebrow">Worker</div>
 <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
 Edit worker
 </h1>
 <p className="mt-1 text-sm text-ink-500">
 Update profile and assignment.
 </p>
 </div>
 <button
 type="button"
 onClick={handleCancel}
 className="qc-btn-secondary self-start sm:self-auto"
 >
 ← Back
 </button>
 </div>

 <div className="qc-card p-6">
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* First Name */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 First Name <span className="text-brick">*</span>
 </label>
 <input
 type="text"
 value={editedWorker.firstname || editedWorker.first_name || ""}
 onChange={(e) => handleInputChange("firstname", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 />
 </div>

 {/* Last Name */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Last Name <span className="text-brick">*</span>
 </label>
 <input
 type="text"
 value={editedWorker.lastname || editedWorker.last_name || ""}
 onChange={(e) => handleInputChange("lastname", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 />
 </div>

 {/* Other Name */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Other Name
 </label>
 <input
 type="text"
 value={editedWorker.othername || ""}
 onChange={(e) => handleInputChange("othername", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 />
 </div>

 {/* Full Name */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Full Name
 </label>
 <input
 type="text"
 value={editedWorker.fullname || ""}
 onChange={(e) => handleInputChange("fullname", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 />
 </div>

 {/* Full Name Reverse */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Full Name Reverse
 </label>
 <input
 type="text"
 value={editedWorker.fullnamereverse || ""}
 onChange={(e) => handleInputChange("fullnamereverse", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 />
 </div>

 {/* Gender */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Gender <span className="text-brick">*</span>
 </label>
 <select
 value={editedWorker.gender || ""}
 onChange={(e) => handleInputChange("gender", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Gender</option>
 <option value="Female">Female</option>
 <option value="Male">Male</option>
 </select>
 </div>

 {/* Phone Number */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Phone Number <span className="text-brick">*</span>
 </label>
 <input
 type="tel"
 value={editedWorker.phonenumber || editedWorker.phone_number || editedWorker.phone || ""}
 onChange={(e) => handleInputChange("phonenumber", e.target.value.replace(/\D/g, "").slice(0, 11))}
 maxLength={11}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="11 digits"
 />
 </div>

 {/* Email */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Email Address <span className="text-brick">*</span>
 </label>
 <input
 type="email"
 value={editedWorker.email || editedWorker.email_address || ""}
 onChange={(e) => handleInputChange("email", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 />
 </div>

 {/* Team */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Team <span className="text-brick">*</span>
 </label>
 <select
 value={editedWorker.team || ""}
 onChange={(e) => handleInputChange("team", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Team</option>
 {teamOptions.map((team) => (
 <option key={team.value} value={team.value}>
 {team.label}
 </option>
 ))}
 </select>
 </div>

 {/* Department */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Department <span className="text-brick">*</span>
 </label>
 <select
 value={editedWorker.department || ""}
 onChange={(e) => handleInputChange("department", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Department</option>
 {departmentOptions.map((dept) => (
 <option key={dept.value} value={dept.value}>
 {dept.label}
 </option>
 ))}
 {editedWorker.department &&
 !departmentOptions.some((d) => d.value === editedWorker.department) && (
 <option value={editedWorker.department}>{editedWorker.department}</option>
 )}
 </select>
 </div>

 {/* District/Sub-team */}
 {isDistrictsTeam(editedWorker.team) && (
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 District/Sub-team
 </label>
 <select
 value={editedWorker.district_sub_team || ""}
 onChange={(e) => handleInputChange("district_sub_team", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select District/Sub-team</option>
 <option value="Pastor Biola Cluster">Pastor Biola Cluster</option>
 <option value="Pastor Isaac Cluster">Pastor Isaac Cluster</option>
 </select>
 </div>
 )}

 {/* Worker Role */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Worker Role <span className="text-brick">*</span>
 </label>
 <select
 value={editedWorker.workerrole || ""}
 onChange={(e) => handleInputChange("workerrole", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Worker Role</option>
 <option value="Worker">Worker</option>
 <option value="Assistant Small Group Leader">Assistant Small Group Leader</option>
 <option value="Small Group Leader">Small Group Leader</option>
 <option value="E-Group Leader">E-Group Leader</option>
 <option value="Assistant Cell Leader">Assistant Cell Leader</option>
 <option value="Cell Leader">Cell Leader</option>
 <option value="Interest Group Leader">Interest Group Leader</option>
 <option value="Assistant HOD">Assistant HOD</option>
 <option value="Zonal Leader">Zonal Leader</option>
 <option value="Admin">Admin</option>
 <option value="District Leader">District Leader</option>
 <option value="HOD">HOD</option>
 <option value="Assistant Sub Team Head">Assistant Sub Team Head</option>
 <option value="Sub Team Head">Sub Team Head</option>
 <option value="Assistant Community Leader">Assistant Community Leader</option>
 <option value="Community Leader">Community Leader</option>
 <option value="Pastoral Leader">Pastoral Leader</option>
 <option value="Directional Leader">Directional Leader</option>
 </select>
 </div>

 {/* Birth Date */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Birth Date <span className="text-brick">*</span>
 </label>
 <BirthDatePicker
 value={editedWorker.birthdate || ""}
 onChange={(value) => handleInputChange("birthdate", value)}
 placeholder="Select birth date (e.g. 12th January)"
 />
 </div>

 {/* Marital Status */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Marital Status <span className="text-brick">*</span>
 </label>
 <select
 value={editedWorker.maritalstatus || ""}
 onChange={(e) => handleInputChange("maritalstatus", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Marital Status</option>
 <option value="Single">Single</option>
 <option value="Married">Married</option>
 <option value="Widow">Widow</option>
 <option value="Divorced">Divorced</option>
 <option value="Separated">Separated</option>
 </select>
 </div>

 {/* Age Range */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Age Range <span className="text-brick">*</span>
 </label>
 <select
 value={editedWorker.agerange || ""}
 onChange={(e) => handleInputChange("agerange", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Age Range</option>
 <option value="18-25">18-25</option>
 <option value="26-30">26-30</option>
 <option value="31-35">31-35</option>
 <option value="36-40">36-40</option>
 <option value="41-45">41-45</option>
 <option value="46-50">46-50</option>
 <option value="51 & Above">51 & Above</option>
 </select>
 </div>

 {/* Employment Status */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Employment Status <span className="text-brick">*</span>
 </label>
 <select
 value={editedWorker.employment || ""}
 onChange={(e) => handleInputChange("employment", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Employment Status</option>
 <option value="Employed">Employed</option>
 <option value="Self-Employed">Self-Employed</option>
 <option value="Student">Student</option>
 <option value="Unemployed">Unemployed</option>
 </select>
 </div>

 {/* Occupation */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Occupation
 </label>
 <input
 type="text"
 value={editedWorker.occupation || ""}
 onChange={(e) => handleInputChange("occupation", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 />
 </div>

 {/* Address */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Address <span className="text-brick">*</span>
 </label>
 <textarea
 value={editedWorker.address || ""}
 onChange={(e) => handleInputChange("address", e.target.value)}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 rows={3}
 />
 </div>
 </div>
 
 {/* Action Buttons */}
 <div className="flex justify-end space-x-3 pt-6 border-t border-ink-200">
 <button
 onClick={handleCancel}
 className="bg-ink-500 text-white px-6 py-2 rounded-lg hover:bg-ink-600"
 >
 Cancel
 </button>
 <button
 onClick={handleSave}
 disabled={isSaving || !hasChanges}
 className="bg-forest text-white px-6 py-2 rounded-lg hover:bg-forest/80 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSaving ? "Saving..." : "Save Changes"}
 </button>
 </div>
 </div>
 </div>
 </div>
 </Layout>
 </div>
 );
}
