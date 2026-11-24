import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import { loadExcelJS } from "../utils/loadExcelJS";
import {
 teamsAndDepartments,
 normalizeWorkerRole,
 filterDepartmentsForDistrictSubTeam,
} from "../utils/teams";
import apiRequest from "../utils/apiClient";
import { downloadSampleWorkersExcel } from "../utils/sampleWorkersExcel";
import { fetchTeamsAndDepartmentsForFilter } from "../services/departments";
import { getEffectiveRouteList } from "../utils/routeObject";
import { getUserRole } from "../utils/getUserRole";
import WorkerFormErrorSummary from "../components/WorkerFormErrorSummary";
import { toWorkerPayload, useAddWorkerForm } from "../hooks/useAddWorkerForm";
import WorkerFormFields from "../components/Workers/WorkerFormFields";

export default function AddWorker() {
 const navigate = useNavigate();
 const [mode, setMode] = useState("single"); // 'single' or 'bulk'
 const [isLoading, setIsLoading] = useState(false);
 const {
 worker: newWorker,
 setWorker: setNewWorker,
 visibleErrors,
 submitError,
 isSubmitting,
 handleSubmit: handleSingleSubmit,
 } = useAddWorkerForm({
 send: async (worker) => {
 await apiRequest("POST", "/api/super/admin/workers", toWorkerPayload(worker));
 toast.success("Worker added successfully");
 },
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
          const teamOpts = data.teams.filter((t) => {
            const norm = String(t?.value || t?.label || t || "").trim().toLowerCase();
            return norm !== "all" && norm !== "gbagada campus" && norm !== "gbagada";
          });
          const deptOpts = (data.departments || []).filter((d) => d.value !== "All");
          setFilterOptions({
            teams: teamOpts,
            departments: deptOpts,
          });
        }
      }
    }).catch((error) => {
      if (import.meta.env.DEV) console.error("Failed to load teams/departments", error);
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

  // Department options derived from team / district sub-team (handlers reset department on change)
  const departmentOptions = useMemo(() => {
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
      return filtered.map((dept) => ({ value: dept, label: dept }));
    } else {
      return (filterData.departments || []).filter((d) => d.value !== "All");
    }
  }, [newWorker.team, newWorker.district_sub_team, filterData]);

 // Bulk upload functions
 const handleFileUpload = (event) => {
 const file = event.target.files[0];
 if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      toast.error("Please upload an Excel .xlsx file");
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
 const ExcelJS = await loadExcelJS();
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
 } catch {
 // Silent error handling
 toast.error("Error parsing Excel file. Please check the format.");
 }
 };
 reader.readAsArrayBuffer(file);
 };

 const convertToWorkerObjects = (jsonData) => {
 if (!Array.isArray(jsonData) || jsonData.length === 0) return [];

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

 // Rows are objects keyed by header (see parseExcelFile)
 jsonData.forEach((row) => {
 const entries = Object.entries(row || {});
 if (entries.every(([, cell]) => !cell || cell.toString().trim() === "")) return; // Skip empty rows

 const worker = {
 _id: crypto.randomUUID(),
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

 // Map data based on headers (case-insensitive, trimmed)
 entries.forEach(([rawHeader, rawValue]) => {
 const header = rawHeader?.toString().toLowerCase().trim() || "";
 const value = rawValue?.toString().trim() || "";

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
 const { _id, ...worker } = parsedWorkers[i];

 const workerToSend = toWorkerPayload(worker);

 try {
 await apiRequest("POST", "/api/super/admin/workers", workerToSend);

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
 const preview = errors
 .slice(0, 3)
 .map((e) => `${e.worker}: ${e.error}`)
 .join("; ");
 const more = errors.length > 3 ? ` (and ${errors.length - 3} more)` : "";
 toast.error(`Failed to add ${errors.length} workers. ${preview}${more}`);
 }

 setIsLoading(false);
 };

 return (
 <div className="min-h-screen bg-cream">
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
 {/* Mode tabs - sliding ink underline */}
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

 <form
 onSubmit={handleSingleSubmit}
 noValidate
 className="worker-form space-y-6"
 >
 <WorkerFormErrorSummary errors={visibleErrors} submitError={submitError} />
 <WorkerFormFields
 worker={newWorker}
 onChange={setNewWorker}
 errors={visibleErrors}
 placement={{ teams: filterOptions.teams, departmentOptions }}
 />

 <div className="flex justify-end space-x-4 pt-6 border-t border-ink-200">
 <button
 type="button"
 onClick={() => navigate("/workers/super-admin")}
 className="px-6 py-2 border border-ink-300 rounded-md text-sm font-medium text-ink-700 bg-white hover:bg-cream focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900/10"
 >
 Cancel
 </button>

 <button
 type="submit"
 disabled={isSubmitting}
 className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-forest hover:bg-forest/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
 >
 {isSubmitting ? (
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
 </form>
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
 <span className="block text-sm font-medium text-ink-700 mb-2">
 Upload Excel File
 </span>
 <div 
 className="border-2 border-dashed border-ink-300 rounded-lg p-8 text-center cursor-pointer hover:border-ink-400 hover:bg-cream transition-colors duration-200"
 onClick={() => document.getElementById('file-upload').click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("file-upload").click();
            }
          }}
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
 accept=".xlsx"
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
 Supported format: .xlsx
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
 {parsedWorkers.slice(0, 10).map((worker) => (
 <tr key={worker._id}>
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
 <p key={`${error.worker}-${index}`} className="text-xs text-brick">
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
