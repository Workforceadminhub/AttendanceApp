import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import { getEffectiveRouteList, getDepartmentNameFromRoute, getDepartmentRoute, getTeamForDepartment } from "../utils/routeObject";
import { normalizeWorkerRole } from "../utils/teams";
import { getUserRole, canAccessDepartment } from "../utils/getUserRole";
import { addNewWorker } from "../services/workers";
import { getUser } from "../utils/getUser";
import { downloadSampleWorkersExcel, DROPDOWN_OPTIONS } from "../utils/sampleWorkersExcel";

export default function HODBulkAddWorker() {
 const navigate = useNavigate();
 const { departmentRoute: routeParam } = useParams();
 const decodedParam = decodeURIComponent(routeParam || "");
 const decodedDepartment = getDepartmentNameFromRoute(decodedParam) || decodedParam;

 const [isLoading, setIsLoading] = useState(false);
 const [uploadedFile, setUploadedFile] = useState(null);
 const [parsedWorkers, setParsedWorkers] = useState([]);
 const [bulkUploadProgress, setBulkUploadProgress] = useState({
 total: 0,
 completed: 0,
 errors: [],
 });

 const departmentInfo = getEffectiveRouteList().find((r) => r.department === decodedDepartment);
 const team = departmentInfo?.team || "";

 const { isSuperAdmin, isChurchAdmin, isHOD, isTeamAdmin, isSubTeamAdmin } = getUserRole();
 const canAddWorkers =
 (isSuperAdmin || isChurchAdmin || isHOD || isTeamAdmin || isSubTeamAdmin) &&
 canAccessDepartment(decodedDepartment);

 useEffect(() => {
 if (!decodedDepartment || !canAddWorkers) {
 toast.error("Access denied. You cannot add workers to this department.");
 navigate("/attendance/summary");
 }
 }, [decodedDepartment, canAddWorkers, navigate]);

 const handleBulkUpload = (event) => {
 const file = event.target.files[0];
 if (!file) return;

 setUploadedFile(file);
 setParsedWorkers([]);

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

 const workers = convertToWorkerObjects(jsonData);
 setParsedWorkers(workers);
 } catch (error) {
 toast.error("Error parsing file. Please check the format.");
 }
 };
 reader.readAsArrayBuffer(file);
 };

 const convertToWorkerObjects = (data) => {
 return data
 .map((row, index) => {
 const rowDept = (row["Department"] || row["department"] || "").toString().trim();
 const rowTeam = (row["Team"] || row["team"] || "").toString().trim();

 let department = decodedDepartment;
 let teamFromPage = team;

 if (isTeamAdmin || isSubTeamAdmin) {
 if (rowDept && rowTeam) {
 if (!canAccessDepartment(rowDept)) {
 return {
 firstname: row["First Name"] || row["firstname"] || "",
 lastname: row["Last Name"] || row["lastname"] || "",
 _error: `You don't have access to department: ${rowDept}`,
 _row: index + 2,
 };
 }
 const canonicalTeam = getTeamForDepartment(rowDept);
 if (!canonicalTeam || canonicalTeam.trim().toLowerCase() !== rowTeam.trim().toLowerCase()) {
 return {
 firstname: row["First Name"] || row["firstname"] || "",
 lastname: row["Last Name"] || row["lastname"] || "",
 _error: `Department "${rowDept}" and Team "${rowTeam}" don't match. Use the team for that department.`,
 _row: index + 2,
 };
 }
 department = rowDept;
 teamFromPage = canonicalTeam;
 }
 }

 const worker = {
 firstname: row["First Name"] || row["firstname"] || "",
 lastname: row["Last Name"] || row["lastname"] || "",
 othername: row["Other Name"] || row["othername"] || "",
 email: row["Email"] || row["email"] || row["Email Address"] || "",
 phonenumber: row["Phone"] || row["phonenumber"] || row["Phone Number"] || "",
 department,
 team: teamFromPage,
 workerrole: row["Worker Role"] || row["workerrole"] || row["Role"] || row["role"] || "",
 birthdate: row["Birth Date"] || row["birthdate"] || "",
 agerange: row["Age Range"] || row["agerange"] || "",
 gender: row["Gender"] || row["gender"] || "",
 maritalstatus: row["Marital Status"] || row["maritalstatus"] || "",
 employment: row["Employment Status"] || row["employment"] || row["Employment"] || "",
 occupation: row["Occupation"] || row["occupation"] || "",
 address: row["Address"] || row["address"] || "",
 };

 // Other Name is the only optional field
 const requiredFields = [
 "firstname",
 "lastname",
 "email",
 "phonenumber",
 "gender",
 "workerrole",
 "birthdate",
 "maritalstatus",
 "agerange",
 "employment",
 "occupation",
 "address",
 ];
 const missingFields = requiredFields.filter((field) => {
 const val = worker[field];
 return val === undefined || val === null || String(val).trim() === "";
 });

 if (missingFields.length > 0) {
 const labels = {
 firstname: "First Name",
 lastname: "Last Name",
 othername: "Other Name",
 email: "Email",
 phonenumber: "Phone",
 gender: "Gender",
 workerrole: "Worker Role",
 birthdate: "Birth Date",
 maritalstatus: "Marital Status",
 agerange: "Age Range",
 employment: "Employment Status",
 occupation: "Occupation",
 address: "Address",
 };
 const missingLabels = missingFields.map((f) => labels[f] || f);
 return { ...worker, _error: `Missing: ${missingLabels.join(", ")}`, _row: index + 2 };
 }

 const phoneDigits = (worker.phonenumber || "").replace(/\D/g, "");
 if (phoneDigits.length < 11) {
 return { ...worker, _error: "Phone number must be at least 11 digits", _row: index + 2 };
 }
 if (phoneDigits.length > 11) {
 return { ...worker, _error: "Phone number must be at most 11 digits", _row: index + 2 };
 }

 // Validate dropdown fields: value must match one of the allowed options (case-insensitive)
 const dropdownChecks = [
 { key: "gender", label: "Gender", options: DROPDOWN_OPTIONS.Gender },
 { key: "workerrole", label: "Worker Role", options: DROPDOWN_OPTIONS["Worker Role"] },
 { key: "maritalstatus", label: "Marital Status", options: DROPDOWN_OPTIONS["Marital Status"] },
 { key: "agerange", label: "Age Range", options: DROPDOWN_OPTIONS["Age Range"] },
 { key: "employment", label: "Employment Status", options: DROPDOWN_OPTIONS["Employment Status"] },
 ];
 for (const { key, label, options } of dropdownChecks) {
 const val = String(worker[key] || "").trim();
 if (!val) continue;
 const match = options.find((o) => o.toLowerCase() === val.toLowerCase());
 if (!match) {
 return {
 ...worker,
 _error: `Invalid ${label}: "${val}". Use one of: ${options.join(", ")}`,
 _row: index + 2,
 };
 }
 worker[key] = match; // use canonical casing from list
 }

 if (worker.workerrole) worker.workerrole = normalizeWorkerRole(worker.workerrole);

 return worker;
 })
 .filter((w) => w.firstname || w.lastname);
 };

 const processBulkUpload = async () => {
 if (parsedWorkers.length === 0) {
 toast.error("No valid workers found in the file");
 return;
 }

 const validWorkers = parsedWorkers.filter((w) => !w._error);
 const invalidWorkers = parsedWorkers.filter((w) => w._error);

 if (invalidWorkers.length > 0) {
 toast.error(`Found ${invalidWorkers.length} invalid rows. Please fix the data and try again.`);
 return;
 }

 setIsLoading(true);
 setBulkUploadProgress({ total: validWorkers.length, completed: 0, errors: [] });
 const errors = [];
 const authUser = getUser();
 const nameofrequester = authUser?.fullname || authUser?.name || authUser?.code || "Requester";

 const backendKeys = [
 "firstname",
 "lastname",
 "othername",
 "email",
 "phonenumber",
 "maritalstatus",
 "department",
 "team",
 "workerrole",
 "birthdate",
 "agerange",
 "gender",
 "address",
 "occupation",
 "employment",
 ];

 for (let i = 0; i < validWorkers.length; i++) {
 try {
 const raw = validWorkers[i];
 const worker = {};
 backendKeys.forEach((key) => {
 worker[key] = raw[key];
 });
 worker.phonenumber = (raw.phonenumber || "").replace(/\D/g, "");
 worker.workerrole = normalizeWorkerRole(worker.workerrole || "Worker");
 worker.nameofrequester = nameofrequester;

 await addNewWorker(worker);
 } catch (error) {
 errors.push({
 worker: `${validWorkers[i].firstname} ${validWorkers[i].lastname}`,
 error: error.message,
 });
 }

 setBulkUploadProgress((prev) => ({
 ...prev,
 completed: i + 1,
 errors,
 }));
 }

 setIsLoading(false);

 if (errors.length === 0) {
 toast.success(
 `${validWorkers.length} worker addition request(s) submitted. The request has been sent to your subteam head and team lead for approval. Once approved, the request would be effected.`
 );
 setParsedWorkers([]);
 setUploadedFile(null);
 } else {
 toast.error(
 `Added ${validWorkers.length - errors.length} workers. ${errors.length} failed.`
 );
 }
 };

 const handleDragOver = (e) => {
 e.preventDefault();
 e.stopPropagation();
 };

 const handleDrop = (e) => {
 e.preventDefault();
 e.stopPropagation();
 const files = e.dataTransfer.files;
 if (files?.length > 0) {
 const file = files[0];
 if (
 file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
 file.type === "application/vnd.ms-excel" ||
 file.name.endsWith(".xlsx") ||
 file.name.endsWith(".xls") ||
 file.name.endsWith(".csv")
 ) {
 setUploadedFile(file);
 handleBulkUpload({ target: { files: [file] } });
 } else {
 toast.error("Please upload an Excel or CSV file (.xlsx, .xls, or .csv)");
 }
 }
 };

 const backUrl = `/department/${getDepartmentRoute(decodedDepartment) || encodeURIComponent(decodedDepartment)}`;
 const workersUrl = `${backUrl}/workers`;

 if (!canAddWorkers) return null;

 return (
 <div className="px-4 sm:px-6 lg:px-8 py-8">
 <Header />
 <Layout>
 <div className="max-w-4xl mx-auto">
 <div className="mb-6">
 <Link
 to={workersUrl}
 className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
 </svg>
 Back to Workers
 </Link>
 </div>

 <div className="bg-white rounded-lg shadow border p-6">
 <div className="flex items-start justify-between gap-4 mb-6">
 <div>
 <h1 className="text-2xl font-bold text-ink-900">Bulk Add Workers</h1>
 </div>
 <button
 type="button"
 onClick={() => downloadSampleWorkersExcel()}
 className="shrink-0 text-sm text-ink-900 hover:underline font-medium"
 >
 Download Sample file
 </button>
 </div>

 <div
 className="border-2 border-dashed border-ink-300 rounded-lg p-8 text-center hover:border-ink-200 hover:bg-ink-100 transition-colors cursor-pointer"
 onDragOver={handleDragOver}
 onDrop={handleDrop}
 onClick={() => document.getElementById("hod-bulk-upload").click()}
 >
 <div className="space-y-4">
 <svg
 className="mx-auto h-12 w-12 text-ink-400"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
 />
 </svg>
 <div>
 <p className="text-lg font-medium text-ink-900">Upload Excel File</p>
 <p className="text-sm text-ink-500">
 Drag and drop or click to browse.
 </p>
 {(isTeamAdmin || isSubTeamAdmin) && (
 <p className="text-xs text-ink-500 mt-1">
 Include Department and Team columns to add workers to different departments you have access to. Leave blank to use this page&apos;s department.
 </p>
 )}
 </div>
 <input
 id="hod-bulk-upload"
 type="file"
 accept=".xlsx,.xls,.csv"
 onChange={handleBulkUpload}
 className="hidden"
 />
 </div>
 </div>

 {uploadedFile && (
 <div className="mt-4 p-4 bg-ink-100 rounded-lg">
 <p className="text-sm text-ink-900">
 <strong>File:</strong> {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)}{" "}
 KB)
 </p>
 </div>
 )}

 {parsedWorkers.length > 0 && (
 <div className="mt-6">
 <h3 className="text-lg font-medium text-ink-900 mb-4">
 Preview ({parsedWorkers.length} workers)
 </h3>
 <div className="overflow-x-auto max-h-64 overflow-y-auto">
 <table className="min-w-full divide-y divide-ink-200">
 <thead className="bg-cream sticky top-0">
 <tr>
 <th className="px-4 py-2 text-left text-xs font-medium text-ink-500 uppercase">
 Name
 </th>
 <th className="px-4 py-2 text-left text-xs font-medium text-ink-500 uppercase">
 Email
 </th>
 <th className="px-4 py-2 text-left text-xs font-medium text-ink-500 uppercase">
 Phone
 </th>
 {(isTeamAdmin || isSubTeamAdmin) && (
 <>
 <th className="px-4 py-2 text-left text-xs font-medium text-ink-500 uppercase">
 Department
 </th>
 <th className="px-4 py-2 text-left text-xs font-medium text-ink-500 uppercase">
 Team
 </th>
 </>
 )}
 <th className="px-4 py-2 text-left text-xs font-medium text-ink-500 uppercase">
 Status
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-ink-200">
 {parsedWorkers.slice(0, 15).map((worker, index) => (
 <tr key={index} className={worker._error ? "bg-brick/10" : ""}>
 <td className="px-4 py-2 text-sm text-ink-900">
 {worker.firstname} {worker.lastname}
 </td>
 <td className="px-4 py-2 text-sm text-ink-900">{worker.email}</td>
 <td className="px-4 py-2 text-sm text-ink-900">{worker.phonenumber}</td>
 {(isTeamAdmin || isSubTeamAdmin) && (
 <>
 <td className="px-4 py-2 text-sm text-ink-900">{worker.department}</td>
 <td className="px-4 py-2 text-sm text-ink-900">{worker.team}</td>
 </>
 )}
 <td className="px-4 py-2 text-sm">
 {worker._error ? (
 <span className="text-brick">{worker._error}</span>
 ) : (
 <span className="text-forest">Valid</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {parsedWorkers.length > 15 && (
 <p className="mt-2 text-sm text-ink-500">
 Showing first 15. {parsedWorkers.length - 15} more will be processed.
 </p>
 )}

 {bulkUploadProgress.total > 0 && (
 <div className="mt-4">
 <div className="flex justify-between mb-2">
 <span className="text-sm font-medium text-ink-700">Progress</span>
 <span className="text-sm text-ink-500">
 {bulkUploadProgress.completed} / {bulkUploadProgress.total}
 </span>
 </div>
 <div className="w-full bg-ink-200 rounded-full h-2">
 <div
 className="bg-ink-900 h-2 rounded-full transition-all"
 style={{
 width: `${(bulkUploadProgress.completed / bulkUploadProgress.total) * 100}%`,
 }}
 />
 </div>
 {bulkUploadProgress.errors.length > 0 && (
 <div className="mt-2 space-y-1">
 {bulkUploadProgress.errors.slice(0, 3).map((err, i) => (
 <p key={i} className="text-xs text-brick">
 {err.worker}: {err.error}
 </p>
 ))}
 {bulkUploadProgress.errors.length > 3 && (
 <p className="text-xs text-brick">
 ... +{bulkUploadProgress.errors.length - 3} more
 </p>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 )}

 <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-ink-200">
 <Link
 to={workersUrl}
 className="px-6 py-2 text-sm font-medium text-ink-700 bg-cream-200 rounded-md hover:bg-ink-200"
 >
 Cancel
 </Link>
 <button
 onClick={processBulkUpload}
 disabled={parsedWorkers.length === 0 || isLoading}
 className="px-6 py-2 text-sm font-medium text-white bg-ink-900 rounded-md hover:bg-ink-800 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isLoading ? "Uploading..." : "Upload Workers"}
 </button>
 </div>
 </div>
 </div>
 </Layout>
 </div>
 );
}
