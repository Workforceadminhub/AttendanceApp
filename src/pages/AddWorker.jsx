import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
// import ReactSelectDropdown from "../components/ReactSelect";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import {
 teamsAndDepartments,
 normalizeWorkerRole,
 filterDepartmentsForDistrictSubTeam,
} from "../utils/teams";
import BirthDatePicker from "../components/BirthDatePicker";
import apiRequest from "../utils/apiClient";
import { downloadSampleWorkersExcel } from "../utils/sampleWorkersExcel";
import { fetchTeamsAndDepartmentsForFilter } from "../services/departments";
import { getEffectiveRouteList } from "../utils/routeObject";
import { getUserRole } from "../utils/getUserRole";

export default function AddWorker() {
 const navigate = useNavigate();
 const [mode, setMode] = useState("single"); // 'single' or 'bulk'
 const [isLoading, setIsLoading] = useState(false);

 // Single worker form state for Super Admin
 const [newWorker, setNewWorker] = useState({
 firstname: "",
 lastname: "",
 othername: "",
 email: "",
 phonenumber: "",
 maritalstatus: "",
 department: "",
 team: "",
 workerrole: "",
 birthdate: "",
 agerange: "",
 gender: "",
 address: "",
 occupation: "",
 employment: "",
 district_sub_team: "",
 });

 // Bulk upload state
 const [uploadedFile, setUploadedFile] = useState(null);
 const [parsedWorkers, setParsedWorkers] = useState([]);
 const [bulkUploadProgress, setBulkUploadProgress] = useState({
 total: 0,
 completed: 0,
 errors: [],
 });

 const [filterData, setFilterData] = useState({
    teams: [],
    departments: [],
    departmentsByTeam: {},
  });

 // Filter options for dropdowns
 const [filterOptions, setFilterOptions] = useState({
   departments: [],
   teams: teamsAndDepartments.map((team) => ({ value: team.team, label: team.team })),
 });

 // Fetch live teams and departments from API
  useEffect(() => {
    let isMounted = true;
    fetchTeamsAndDepartmentsForFilter().then((data) => {
      if (isMounted) {
        setFilterData(data);
        if (data.teams && data.teams.length > 0) {
          const teamOpts = data.teams.filter((t) => t.value !== "All");
          const deptOpts = (data.departments || []).filter((d) => d.value !== "All");
          setFilterOptions({
            teams: teamOpts,
            departments: deptOpts,
          });
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

 // Check if user is super admin (role / permissionLevel / department)
 useEffect(() => {
 const { isSuperAdmin, user } = getUserRole();
 if (!user || !isSuperAdmin) {
 toast.error("Access denied. Super Admin access required.");
 navigate("/workers/super-admin");
 return;
 }
 }, [navigate]);

  // Update departments when team / district sub-team changes
  useEffect(() => {
    if (newWorker.team) {
      const depts =
        filterData.departmentsByTeam[newWorker.team] ||
        filterData.departmentsByTeam[newWorker.team === "Districts" ? "District" : newWorker.team] ||
        [];

      let source = depts;
      if (!source.length) {
        source = getEffectiveRouteList()
          .filter(
            (r) =>
              r.team === newWorker.team ||
              (newWorker.team === "Districts" && r.team === "District") ||
              (newWorker.team === "District" && r.team === "Districts")
          )
          .map((r) => r.department)
          .filter(Boolean);
      }

      const filtered = filterDepartmentsForDistrictSubTeam(
        source,
        newWorker.team,
        newWorker.district_sub_team
      );

      setFilterOptions((prev) => ({
        ...prev,
        departments: filtered.map((dept) => ({ value: dept, label: dept })),
      }));

      if (
        newWorker.department &&
        !filtered.some((d) => d === newWorker.department)
      ) {
        setNewWorker((prev) => ({ ...prev, department: "" }));
      }
    } else {
      const depts = (filterData.departments || []).filter((d) => d.value !== "All");
      setFilterOptions((prev) => ({
        ...prev,
        departments: depts,
      }));
    }
  }, [newWorker.team, newWorker.district_sub_team, newWorker.department, filterData]);

 // Single worker functions
 const addNewWorker = async () => {
 // Validate required fields
 if (
 !newWorker.firstname ||
 !newWorker.lastname ||
 !newWorker.email ||
 !newWorker.phonenumber ||
 !newWorker.department ||
 !newWorker.team
 ) {
 toast.error(
 "Please fill in all required fields (First Name, Last Name, Email, Phone Number, Department, Team)"
 );
 return;
 }
  if (!/^\d{11}$/.test((newWorker.phonenumber || "").trim())) {
    toast.error("Phone number must be exactly 11 digits.");
    return;
  }
 if (newWorker.team === "Districts" && !newWorker.district_sub_team) {
 toast.error("Please select a District/Sub-team");
 return;
 }

 setIsLoading(true);
 try {
 const workerToSend = {
 ...newWorker,
 workerrole: normalizeWorkerRole(newWorker.workerrole),
 };
 await apiRequest("POST", "/api/super/admin/workers", workerToSend);
 toast.success("Worker added successfully");

 // Reset form
 setNewWorker({
 firstname: "",
 lastname: "",
 othername: "",
 email: "",
 phonenumber: "",
 maritalstatus: "Single",
 department: "",
 team: "",
 workerrole: "",
 birthdate: "",
 agerange: "",
 gender: "Male",
 address: "",
 occupation: "",
 district_sub_team: "",
 });
  } catch (error) {
    const rawMsg = error?.message || "";
    const msg = /worker\s+already\s+exist/i.test(rawMsg)
      ? "Worker already belongs to another department"
      : error?.message || "Failed to add worker";
    toast.error(msg);
  } finally {
 setIsLoading(false);
 }
 };

 // Bulk upload functions
 const handleFileUpload = (event) => {
 const file = event.target.files[0];
 if (!file) return;

 // Validate file type
 const validTypes = [
 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
 "application/vnd.ms-excel", // .xls
 "text/csv", // .csv
 ];

 if (!validTypes.includes(file.type)) {
 toast.error("Please upload a valid Excel file (.xlsx, .xls) or CSV file");
 return;
 }

 setUploadedFile(file);
 parseExcelFile(file);
 };

 const parseExcelFile = (file) => {
 const reader = new FileReader();
 reader.onload = async (e) => {
 try {
 const buffer = e.target.result;
 const workbook = new ExcelJS.Workbook();
 await workbook.xlsx.load(buffer);
 const worksheet = workbook.worksheets[0];
 const headers = [];
 const jsonData = [];
 worksheet.eachRow((row, rowNumber) => {
 const values = row.values.slice(1); // row.values is 1-indexed
 if (rowNumber === 1) {
 values.forEach((h) => headers.push(h != null ? String(h).trim() : ""));
 } else {
 const obj = {};
 values.forEach((val, i) => {
 if (headers[i]) obj[headers[i]] = val != null ? String(val) : "";
 });
 jsonData.push(obj);
 }
 });

 // Convert to worker objects
 const workers = convertToWorkerObjects(jsonData);
 setParsedWorkers(workers);

 if (workers.length === 0) {
 toast.error("No valid worker data found in the Excel file");
 } else {
 toast.success(
 `Successfully parsed ${workers.length} workers from Excel file`
 );
 }
 } catch (error) {
 // Silent error handling
 toast.error("Error parsing Excel file. Please check the format.");
 }
 };
 reader.readAsArrayBuffer(file);
 };

 const convertToWorkerObjects = (jsonData) => {
 if (jsonData.length < 2) return [];

 // Assume first row is headers
 const headers = jsonData[0].map(
 (h) => h?.toString().toLowerCase().trim() || ""
 );
 const dataRows = jsonData.slice(1);

 // Map headers to our expected fields
 const fieldMapping = {
 firstname: ["first name", "firstname", "first_name"],
 lastname: ["last name", "lastname", "last_name"],
 othername: [
 "other name",
 "othername",
 "other_name",
 "middle name",
 "middlename",
 ],
 email: ["email", "email address"],
 phonenumber: [
 "phone",
 "phone number",
 "phonenumber",
 "phone_number",
 "mobile",
 ],
 maritalstatus: ["marital status", "maritalstatus", "marital_status"],
 department: ["department", "dept"],
 team: ["team"],
 workerrole: ["worker role", "workerrole", "worker_role", "role"],
 birthdate: ["birth date", "birthdate", "birth_date", "dob"],
 agerange: ["age range", "agerange", "age_range"],
 gender: ["gender", "sex"],
 address: ["address", "location"],
 occupation: ["occupation", "job", "work"],
 };

 const workers = [];

 dataRows.forEach((row, index) => {
 if (row.every((cell) => !cell || cell.toString().trim() === "")) return; // Skip empty rows

 const worker = {
 firstname: "",
 lastname: "",
 othername: "",
 email: "",
 phonenumber: "",
 maritalstatus: "Single",
 department: "",
 team: "",
 workerrole: "",
 birthdate: "",
 agerange: "",
 gender: "Male",
 address: "",
 occupation: "",
 };

 // Map data based on headers
 headers.forEach((header, colIndex) => {
 const value = row[colIndex]?.toString().trim() || "";

 // Find matching field
 for (const [field, aliases] of Object.entries(fieldMapping)) {
 if (aliases.includes(header)) {
 worker[field] = value;
 break;
 }
 }
 });

 worker.workerrole = normalizeWorkerRole(worker.workerrole);

 // Only require first name and last name for super admin bulk upload
 if (
 worker.firstname &&
 worker.lastname
 ) {
 workers.push(worker);
 }
 });

 return workers;
 };

 const processBulkUpload = async () => {
 if (parsedWorkers.length === 0) {
 toast.error("No workers to upload");
 return;
 }

 // Validate that all workers have required fields (only first name and last name for super admin)
 const invalidWorkers = parsedWorkers.filter(worker => 
 !worker.firstname || 
 !worker.lastname
 );

 if (invalidWorkers.length > 0) {
 toast.error(
 `${invalidWorkers.length} workers are missing required fields (First Name, Last Name). Please check your Excel file.`
 );
 return;
 }

 setIsLoading(true);
 setBulkUploadProgress({
 total: parsedWorkers.length,
 completed: 0,
 errors: [],
 });

 const errors = [];

 for (let i = 0; i < parsedWorkers.length; i++) {
 const worker = { ...parsedWorkers[i] };

 worker.workerrole = normalizeWorkerRole(worker.workerrole);

 try {
 await apiRequest("POST", "/api/super/admin/workers", worker);

 setBulkUploadProgress((prev) => ({
 ...prev,
 completed: prev.completed + 1,
 }));
 } catch (error) {
 // Silent error handling
 errors.push({
 worker: `${worker.firstname} ${worker.lastname}`,
 error: error.message,
 });
 }

 // Small delay to prevent overwhelming the API
 await new Promise((resolve) => setTimeout(resolve, 100));
 }

 setBulkUploadProgress((prev) => ({
 ...prev,
 errors: errors,
 }));

 // Show results
 const successCount = parsedWorkers.length - errors.length;
 if (successCount > 0) {
 toast.success(`Successfully added ${successCount} workers`);
 }
 if (errors.length > 0) {
 toast.error(
 `Failed to add ${errors.length} workers. Check console for details.`
 );
 // Log errors silently
 }

 setIsLoading(false);
 };

 return (
 <div className="min-h-screen bg-cream">
 <Header />
 <Layout>
 <div className="max-w-4xl mx-auto">
 {/* Page header */}
 <div className="mb-8">
 <div className="qc-eyebrow">Super Admin · Workers</div>
 <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
 Add new workers
 </h1>
 <p className="mt-1 text-sm text-ink-500">
 Add a single worker or upload many from Excel.
 </p>
 </div>

 <>
 {/* Mode tabs — sliding ink underline */}
 <div className="mb-6 flex border-b border-ink-200">
 <button
 type="button"
 onClick={() => setMode("single")}
 className={`relative px-4 py-3 text-sm font-medium transition-colors min-h-touch ${
 mode === "single"
 ? "text-ink-900"
 : "text-ink-500 hover:text-ink-700"
 }`}
 aria-pressed={mode === "single"}
 >
 Single worker
 {mode === "single" && (
 <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-ink-900" aria-hidden="true" />
 )}
 </button>
 <button
 type="button"
 onClick={() => setMode("bulk")}
 className={`relative px-4 py-3 text-sm font-medium transition-colors min-h-touch ${
 mode === "bulk"
 ? "text-ink-900"
 : "text-ink-500 hover:text-ink-700"
 }`}
 aria-pressed={mode === "bulk"}
 >
 Bulk upload
 {mode === "bulk" && (
 <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-ink-900" aria-hidden="true" />
 )}
 </button>
 </div>

 {/* Single Worker Form */}
 {mode === "single" && (
 <div className="bg-white shadow rounded-lg p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold text-ink-900">
 Add Single Worker
 </h2>
 </div>

 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* First Name */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 First Name <span className="text-brick">*</span>
 </label>
 <input
 type="text"
 value={newWorker.firstname}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 firstname: e.target.value,
 })
 }
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter first name"
 />
 </div>

 {/* Last Name */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Last Name <span className="text-brick">*</span>
 </label>
 <input
 type="text"
 value={newWorker.lastname}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 lastname: e.target.value,
 })
 }
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter last name"
 />
 </div>

 {/* Other Name */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Other Name
 </label>
 <input
 type="text"
 value={newWorker.othername}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 othername: e.target.value,
 })
 }
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter other name"
 />
 </div>

 {/* Gender */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Gender <span className="text-brick">*</span>
 </label>
 <select
 value={newWorker.gender}
 onChange={(e) =>
 setNewWorker({ ...newWorker, gender: e.target.value })
 }
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
 value={newWorker.phonenumber}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 phonenumber: e.target.value.replace(/\D/g, "").slice(0, 11),
 })
 }
 maxLength={11}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter 11-digit phone number"
 />
 </div>

 {/* Email */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Email Address <span className="text-brick">*</span>
 </label>
 <input
 type="email"
 value={newWorker.email}
 onChange={(e) =>
 setNewWorker({ ...newWorker, email: e.target.value })
 }
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter email address"
 />
 </div>

 {/* Team */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Team <span className="text-brick">*</span>
 </label>
 <select
 value={newWorker.team}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 team: e.target.value,
 department: "", // Reset department when team changes
 district_sub_team: "", // Reset district/sub-team when team changes
 })
 }
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Team</option>
 {filterOptions.teams.map((team) => (
 <option key={team.value} value={team.value}>
 {team.label}
 </option>
 ))}
 </select>
 </div>

 {/* District/Sub-team — always before Department when Districts */}
 {(newWorker.team === "Districts" || newWorker.team === "District") && (
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 District/Sub-team <span className="text-brick">*</span>
 </label>
 <select
 value={newWorker.district_sub_team}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 district_sub_team: e.target.value,
 department: "",
 })
 }
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select District/Sub-team</option>
 <option value="Pastor Biola Cluster">Pastor Biola Cluster</option>
 <option value="Pastor Isaac Cluster">Pastor Isaac Cluster</option>
 </select>
 </div>
 )}

 {/* Department */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Department <span className="text-brick">*</span>
 </label>
 <select
 value={newWorker.department}
 onChange={(e) => {
   setNewWorker({
     ...newWorker,
     department: e.target.value,
   });
 }}
 disabled={
   (newWorker.team === "Districts" || newWorker.team === "District") &&
   !newWorker.district_sub_team
 }
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10 disabled:cursor-not-allowed disabled:bg-ink-100"
 >
 <option value="">
 {(newWorker.team === "Districts" || newWorker.team === "District") &&
 !newWorker.district_sub_team
 ? "Select District/Sub-team first"
 : "Select Department"}
 </option>
 {filterOptions.departments.map((dept) => (
 <option key={dept.value} value={dept.value}>
 {dept.label}
 </option>
 ))}
 </select>
 </div>

 {/* Worker Role */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Worker Role <span className="text-brick">*</span>
 </label>
 <select
 value={newWorker.workerrole}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 workerrole: e.target.value,
 })
 }
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
 value={newWorker.birthdate}
 onChange={(value) =>
 setNewWorker({
 ...newWorker,
 birthdate: value,
 })
 }
 placeholder="Select birth date (e.g. 12th January)"
 />
 </div>

 {/* Marital Status */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Marital Status <span className="text-brick">*</span>
 </label>
 <select
 value={newWorker.maritalstatus}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 maritalstatus: e.target.value,
 })
 }
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
 value={newWorker.agerange}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 agerange: e.target.value,
 })
 }
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
 value={newWorker.employment}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 employment: e.target.value,
 })
 }
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
 value={newWorker.occupation}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 occupation: e.target.value,
 })
 }
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter occupation"
 />
 </div>

 {/* Address */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Address <span className="text-brick">*</span>
 </label>
 <textarea
 value={newWorker.address}
 onChange={(e) =>
 setNewWorker({
 ...newWorker,
 address: e.target.value,
 })
 }
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter address"
 rows={3}
 />
 </div>
 </div>
 </div>

 <div className="flex justify-end space-x-4 pt-6 border-t border-ink-200">
 <button
 onClick={() => navigate("/workers/super-admin")}
 className="px-6 py-2 border border-ink-300 rounded-md text-sm font-medium text-ink-700 bg-white hover:bg-cream focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900/10"
 >
 Cancel
 </button>

 <button
 onClick={addNewWorker}
 disabled={isLoading}
 className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-forest hover:bg-forest/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
 >
 {isLoading ? (
 <>
 <svg
 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
 xmlns="http://www.w3.org/2000/svg"
 fill="none"
 viewBox="0 0 24 24"
 >
 <circle
 className="opacity-25"
 cx="12"
 cy="12"
 r="10"
 stroke="currentColor"
 strokeWidth="4"
 ></circle>
 <path
 className="opacity-75"
 fill="currentColor"
 d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
 ></path>
 </svg>
 Adding Workers...
 </>
 ) : (
 <>
 <svg
 className="w-5 h-5 mr-2"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 6v6m0 0v6m0-6h6m-6 0H6"
 />
 </svg>
 Add Workers
 </>
 )}
 </button>
 </div>
 </div>
 )}

 {/* Bulk Upload Section */}
 {mode === "bulk" && (
 <div className="bg-white shadow rounded-lg p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold text-ink-900">
 Bulk Upload Workers
 </h2>
 <button
 type="button"
 onClick={() => downloadSampleWorkersExcel()}
 className="inline-flex items-center px-4 py-2 border border-ink-300 rounded-md text-sm font-medium text-ink-700 bg-white hover:bg-cream focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900/10"
 >
 <svg className="-ml-1 mr-2 h-4 w-4 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 Download Sample file
 </button>
 </div>

 <div className="space-y-6">
 {/* File Upload Section */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Upload Excel File
 </label>
 <div 
 className="border-2 border-dashed border-ink-300 rounded-lg p-8 text-center cursor-pointer hover:border-ink-400 hover:bg-cream transition-colors duration-200"
 onClick={() => document.getElementById('file-upload').click()}
 onDragOver={(e) => {
 e.preventDefault();
 e.currentTarget.classList.add('border-ink-200', 'bg-ink-100');
 }}
 onDragLeave={(e) => {
 e.preventDefault();
 e.currentTarget.classList.remove('border-ink-200', 'bg-ink-100');
 }}
 onDrop={(e) => {
 e.preventDefault();
 e.currentTarget.classList.remove('border-ink-200', 'bg-ink-100');
 const files = e.dataTransfer.files;
 if (files.length > 0) {
 handleFileUpload({ target: { files } });
 }
 }}
 >
 <input
 id="file-upload"
 type="file"
 accept=".xlsx,.xls,.csv"
 onChange={handleFileUpload}
 className="hidden"
 />
 <div className="flex flex-col items-center justify-center space-y-4">
 <svg className="w-12 h-12 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
 </svg>
 <div className="text-center">
 <p className="text-lg font-medium text-ink-700 mb-2">
 Click to upload or drag and drop
 </p>
 <p className="text-sm text-ink-500">
 Supported formats: .xlsx, .xls, .csv
 </p>
 <p className="text-sm text-ink-500">
 First row should contain headers
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* File Preview Section */}
 {uploadedFile && (
 <div className="bg-ink-100 border border-ink-200 rounded-lg p-4">
 <h3 className="text-sm font-medium text-ink-900 mb-2">
 File: {uploadedFile.name}
 </h3>
 <p className="text-sm text-ink-900">
 Parsed {parsedWorkers.length} workers
 </p>
 </div>
 )}

 {/* Workers Preview */}
 {parsedWorkers.length > 0 && (
 <div>
 <h3 className="text-sm font-medium text-ink-700 mb-2">
 Workers Preview (First 10)
 </h3>
 <div className="border rounded-lg overflow-hidden">
 <div className="max-h-80 overflow-y-auto">
 <table className="min-w-full divide-y divide-ink-200">
 <thead className="bg-cream">
 <tr>
 <th className="px-3 py-2 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Name
 </th>
 <th className="px-3 py-2 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Email
 </th>
 <th className="px-3 py-2 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Team
 </th>
 <th className="px-3 py-2 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Department
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-ink-200">
 {parsedWorkers.slice(0, 10).map((worker, index) => (
 <tr key={index}>
 <td className="px-3 py-2 whitespace-nowrap text-sm text-ink-900">
 {worker.firstname} {worker.lastname}
 </td>
 <td className="px-3 py-2 whitespace-nowrap text-sm text-ink-900">
 {worker.email}
 </td>
 <td className="px-3 py-2 whitespace-nowrap text-sm text-ink-900">
 {worker.team}
 </td>
 <td className="px-3 py-2 whitespace-nowrap text-sm text-ink-900">
 {worker.department}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 {parsedWorkers.length > 10 && (
 <div className="px-3 py-2 text-sm text-ink-500 bg-cream">
 ... and {parsedWorkers.length - 10} more workers
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Upload Progress */}
 {bulkUploadProgress.total > 0 && (
 <div>
 <h3 className="text-sm font-medium text-ink-700 mb-2">
 Upload Progress
 </h3>
 <div className="bg-ink-200 rounded-full h-4">
 <div
 className="bg-ink-900 h-4 rounded-full transition-all duration-300"
 style={{
 width: `${(bulkUploadProgress.completed /
 bulkUploadProgress.total) *
 100
 }%`,
 }}
 ></div>
 </div>
 <p className="text-sm text-ink-600 mt-2">
 {bulkUploadProgress.completed} of{" "}
 {bulkUploadProgress.total} workers processed
 </p>

 {bulkUploadProgress.errors.length > 0 && (
 <div className="mt-4">
 <p className="text-sm text-brick font-medium">
 Errors:
 </p>
 <div className="max-h-40 overflow-y-auto bg-brick/10 border border-brick/30 rounded p-3">
 {bulkUploadProgress.errors.map((error, index) => (
 <p key={index} className="text-xs text-brick">
 {error.worker}: {error.error}
 </p>
 ))}
 </div>
 </div>
 )}
 </div>
 )}


 {/* Bulk Upload Action Buttons */}
 <div className="flex justify-end space-x-4 pt-6 border-t border-ink-200">
 <button
 onClick={() => navigate("/workers/super-admin")}
 className="px-6 py-2 border border-ink-300 rounded-md text-sm font-medium text-ink-700 bg-white hover:bg-cream focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900/10"
 >
 Cancel
 </button>

 <button
 onClick={processBulkUpload}
 disabled={isLoading || parsedWorkers.length === 0}
 className="px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-ink-900 hover:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900/10 disabled:opacity-50"
 >
 {isLoading
 ? "Uploading..."
 : `Upload ${parsedWorkers.length} Workers`}
 </button>
 </div>
 </div>
 </div>
 )}
 </>
 </div>
 </Layout>
 </div>
 );
}
