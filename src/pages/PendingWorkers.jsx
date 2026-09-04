import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import { fetchPendingAdd, fetchPendingRemove } from "../services/workers";
import LoadingState from "../components/LoadingState";
import GenericModal from "../components/GenericModal";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import { getUserRole, canAccessDepartment } from "../utils/getUserRole";
import apiRequest from "../utils/apiClient";
import { 
 CheckIcon, 
 EyeIcon,
 TrashIcon,
 ArrowUpIcon,
 ArrowDownIcon,
} from "@heroicons/react/24/outline";

export default function PendingWorkers() {
 const navigate = useNavigate();
 const [pendingAddWorkers, setPendingAddWorkers] = useState([]);
 const [pendingRemoveWorkers, setPendingRemoveWorkers] = useState([]);
 const [allPendingAddWorkers, setAllPendingAddWorkers] = useState([]);
 const [allPendingRemoveWorkers, setAllPendingRemoveWorkers] = useState([]);
 const [isLoading, setIsLoading] = useState(false);
 const [isProcessing, setIsProcessing] = useState(false);
 const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
 const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState("");
 const [activeTab, setActiveTab] = useState("add");
 const [selectedWorkers, setSelectedWorkers] = useState(new Set());
 const [isSelectAll, setIsSelectAll] = useState(false);
 const hasFetched = useRef(false);
 const [sortConfig, setSortConfig] = useState({
 key: null,
 direction: "asc", // 'asc' or 'desc'
 });
 
 // Pagination state
 const [pagination, setPagination] = useState({
 page: 1,
 limit: 100,
 total: 0,
 totalPages: 0,
 hasNext: false,
 hasPrev: false,
 });

 const { isAdmin, isSuperAdmin, isChurchAdmin, user: authUser } = getUserRole();
 const canAccessPendingWorkers = isAdmin;
 // Filter out team/department name (e.g. "Ministry") from permissions.
 // Team name is already implied by the admin context; backend expects only departments here.
 const permissions = useMemo(() => {
 const raw = authUser?.permissions ?? [];
 if (!Array.isArray(raw)) return raw;
 const teamName = authUser?.team;
 const deptName = authUser?.department;
 return raw.filter((perm) => perm !== teamName && perm !== deptName);
 }, [authUser?.permissions, authUser?.team, authUser?.department]);

 // Campus-wide admins use the super-admin path; team and sub-team admins
 // use the generic admin path. Errors surface directly to the caller.
 const adminBasePath = isSuperAdmin || isChurchAdmin ? "/api/super/admin" : "/api/admin";

 const adminActionRequest = (method, pathSuffix, data, config) =>
 apiRequest(method, `${adminBasePath}${pathSuffix}`, data, config);

 useEffect(() => {
 if (!canAccessPendingWorkers) {
 toast.error("Access denied. Admin access required.");
 navigate("/login");
 return;
 }
 }, [canAccessPendingWorkers, navigate]);

 const filterByAccess = useCallback((workers) => {
 return workers.filter((w) => canAccessDepartment(w.department || w.department_name));
 }, []);

 const updatePaginationForTab = useCallback(
 (tab, allAddWorkers, allRemoveWorkers) => {
 const currentWorkers = tab === "add" ? allAddWorkers : allRemoveWorkers;
 const total = currentWorkers.length;
 const totalPages = Math.ceil(total / pagination.limit);

 const newPagination = {
 page: 1,
 limit: pagination.limit,
 total: total,
 totalPages: totalPages,
 hasNext: totalPages > 1,
 hasPrev: false,
 };

 setPagination(newPagination);

 const startIndex = 0;
 const endIndex = pagination.limit;
 const currentPageData = currentWorkers.slice(startIndex, endIndex);

 if (tab === "add") {
 setPendingAddWorkers(currentPageData);
 } else {
 setPendingRemoveWorkers(currentPageData);
 }
 },
 [pagination.limit]
 );

 const loadingRef = useRef(false);
 const fetchAllPendingWorkers = useCallback(async () => {
 if (loadingRef.current) return;
 loadingRef.current = true;
 setIsLoading(true);
 try {
 const [addWorkers, removeWorkers] = await Promise.all([
 fetchPendingAdd(1, 1000, permissions),
 fetchPendingRemove(1, 1000, permissions),
 ]);

 const allAddWorkers = filterByAccess(addWorkers?.data || []);
 const allRemoveWorkers = filterByAccess(removeWorkers?.data || []);

 setAllPendingAddWorkers(allAddWorkers);
 setAllPendingRemoveWorkers(allRemoveWorkers);

 updatePaginationForTab(activeTab, allAddWorkers, allRemoveWorkers);
 } catch {
 toast.error("Failed to fetch pending workers");
 } finally {
 loadingRef.current = false;
 setIsLoading(false);
 }
 }, [activeTab, permissions, updatePaginationForTab, filterByAccess]);

 useEffect(() => {
 if (hasFetched.current) {
 return;
 }
 hasFetched.current = true;
 void fetchAllPendingWorkers();
 }, [fetchAllPendingWorkers]);

 // Delete single worker (permanent)
 const deleteWorker = async (workerId) => {
 const confirmDelete = window.confirm(
 "⚠️ This will permanently delete this worker. This action cannot be undone.\n\nAre you sure you want to continue?"
 );
 if (!confirmDelete) return;

 setIsProcessing(true);
 try {
 await adminActionRequest(
 "DELETE",
 `/${workerId}/workers`,
 undefined,
 Array.isArray(permissions) && permissions.length > 0
 ? { params: { permissions: JSON.stringify(permissions) } }
 : undefined
 );

 toast.success("Worker deleted successfully");
 clearSelection();
 await fetchAllPendingWorkers();
 } catch (error) {
 toast.error(`Failed to delete worker: ${error.message}`);
 } finally {
 setIsProcessing(false);
 }
 };

 // Handle client-side pagination
 const handlePagination = (newPage) => {
 const allWorkers = activeTab === "add" ? allPendingAddWorkers : allPendingRemoveWorkers;
 const startIndex = (newPage - 1) * pagination.limit;
 const endIndex = startIndex + pagination.limit;
 const currentPageData = allWorkers.slice(startIndex, endIndex);
 
 // Update current page data
 if (activeTab === "add") {
 setPendingAddWorkers(currentPageData);
 } else {
 setPendingRemoveWorkers(currentPageData);
 }
 
 // Update pagination state
 setPagination(prev => ({
 ...prev,
 page: newPage,
 hasNext: newPage < prev.totalPages,
 hasPrev: newPage > 1,
 }));
 };

 // Handle tab change
 const handleTabChange = (tab) => {
 setActiveTab(tab);
 clearSelection();
 updatePaginationForTab(tab, allPendingAddWorkers, allPendingRemoveWorkers);
 };

 // Multi-select functionality
 const handleSelectWorker = (workerId) => {
 const newSelectedWorkers = new Set(selectedWorkers);
 if (newSelectedWorkers.has(workerId)) {
 newSelectedWorkers.delete(workerId);
 } else {
 newSelectedWorkers.add(workerId);
 }
 setSelectedWorkers(newSelectedWorkers);
 
 const currentWorkers = activeTab === "add" ? pendingAddWorkers : pendingRemoveWorkers;
 setIsSelectAll(newSelectedWorkers.size === currentWorkers.length && currentWorkers.length > 0);
 };

 const handleSelectAll = () => {
 const currentWorkers = activeTab === "add" ? pendingAddWorkers : pendingRemoveWorkers;
 if (isSelectAll) {
 setSelectedWorkers(new Set());
 setIsSelectAll(false);
 } else {
 const allWorkerIds = new Set(currentWorkers.map(worker => worker.id));
 setSelectedWorkers(allWorkerIds);
 setIsSelectAll(true);
 }
 };

 const clearSelection = () => {
 setSelectedWorkers(new Set());
 setIsSelectAll(false);
 };

 // Handle column sorting
 const handleSort = (columnKey) => {
 setSortConfig((prevConfig) => {
 if (prevConfig.key === columnKey) {
 // Toggle direction if same column
 return {
 key: columnKey,
 direction: prevConfig.direction === "asc" ? "desc" : "asc",
 };
 } else {
 // New column, start with ascending
 return {
 key: columnKey,
 direction: "asc",
 };
 }
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

 const getSortableValue = (worker, key) => {
 switch (key) {
 case "id":
 return worker.id || worker.workerid || "";
 case "name":
 return `${worker.firstname || ""} ${worker.lastname || ""}`.trim();
 default:
 return worker[key];
 }
 };

 // Approve worker
 const approveWorker = async (workerId) => {
 setIsProcessing(true);
 try {
 await adminActionRequest(
 "PUT",
 `/${workerId}/workers/approve`,
 undefined,
 Array.isArray(permissions) && permissions.length > 0
 ? { params: { permissions: JSON.stringify(permissions) } }
 : undefined
 );

 toast.success("Worker approved successfully");
 clearSelection();
 await fetchAllPendingWorkers();
 } catch (error) {
 toast.error(`Failed to approve worker: ${error.message}`);
 } finally {
 setIsProcessing(false);
 }
 };

 const workerLabel = (workerId) => {
 const all = [...allPendingAddWorkers, ...allPendingRemoveWorkers];
 const w = all.find((item) => item.id === workerId);
 const name = w ? `${w.firstname || ""} ${w.lastname || ""}`.trim() : "";
 return name || `#${workerId}`;
 };

 const summarizeFailures = (failures) => {
 const preview = failures
 .slice(0, 3)
 .map((f) => `${f.label}: ${f.error}`)
 .join("; ");
 const more = failures.length > 3 ? ` (and ${failures.length - 3} more)` : "";
 return `${preview}${more}`;
 };

 // Bulk delete (permanently deletes workers)
 const bulkDelete = () => {
 if (selectedWorkers.size === 0) {
 toast.error("No workers selected for deletion");
 return;
 }
 setBulkDeleteConfirmText("");
 setBulkDeleteConfirmOpen(true);
 };

 const closeBulkDeleteConfirm = () => {
 setBulkDeleteConfirmOpen(false);
 setBulkDeleteConfirmText("");
 };

 const confirmBulkDelete = async () => {
 if (bulkDeleteConfirmText !== "DELETE ALL") {
 toast.error("You must type DELETE ALL exactly to confirm.");
 return;
 }
 closeBulkDeleteConfirm();

 setIsProcessing(true);
 try {
 let successCount = 0;
 const failures = [];

 // Sequential: the API handles one worker per request.
 for (const workerId of selectedWorkers) {
 try {
 await adminActionRequest(
 "DELETE",
 `/${workerId}/workers`,
 undefined,
 Array.isArray(permissions) && permissions.length > 0
 ? { params: { permissions: JSON.stringify(permissions) } }
 : undefined
 );
 successCount++;
 } catch (error) {
 failures.push({ label: workerLabel(workerId), error: error?.message || "Unknown error" });
 }
 }

 if (successCount > 0) {
 toast.success(`${successCount} worker(s) deleted successfully`);
 }
 if (failures.length > 0) {
 toast.error(`Failed to delete ${failures.length} worker(s). ${summarizeFailures(failures)}`);
 }

 clearSelection();
 await fetchAllPendingWorkers();
 } catch (error) {
 toast.error(`Failed to delete workers: ${error.message}`);
 } finally {
 setIsProcessing(false);
 }
 };

 // Bulk approve (calls approve function - changes status to active)
 const bulkApprove = async () => {
 if (selectedWorkers.size === 0) {
 toast.error("No workers selected");
 return;
 }

 const confirmMessage = `Are you sure you want to approve ${selectedWorkers.size} worker(s)? This will change their status to active.`;
 if (!window.confirm(confirmMessage)) return;

 setIsProcessing(true);
 try {
 let successCount = 0;
 const failures = [];

 // Sequential: the API handles one worker per request.
 for (const workerId of selectedWorkers) {
 try {
 await adminActionRequest(
 "PUT",
 `/${workerId}/workers/approve`,
 undefined,
 Array.isArray(permissions) && permissions.length > 0
 ? { params: { permissions: JSON.stringify(permissions) } }
 : undefined
 );
 successCount++;
 } catch (error) {
 failures.push({ label: workerLabel(workerId), error: error?.message || "Unknown error" });
 }
 }

 if (successCount > 0) {
 toast.success(`${successCount} worker(s) approved successfully`);
 }
 if (failures.length > 0) {
 toast.error(`Failed to approve ${failures.length} worker(s). ${summarizeFailures(failures)}`);
 }

 clearSelection();
 await fetchAllPendingWorkers();
 } catch (error) {
 toast.error(`Failed to approve workers: ${error.message}`);
 } finally {
 setIsProcessing(false);
 }
 };

 const isBusy = isLoading || isProcessing;

 const currentWorkers = activeTab === "add" ? pendingAddWorkers : pendingRemoveWorkers;

 const sortedWorkers = useMemo(() => {
 const items = Array.isArray(currentWorkers) ? [...currentWorkers] : [];

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
 }, [currentWorkers, sortConfig]);

 // Export to CSV function (single sheet)
 const exportToCSV = () => {
 try {
 const workersToExport = activeTab === "add" ? allPendingAddWorkers : allPendingRemoveWorkers;
 
 if (workersToExport.length === 0) {
 toast.error(`No pending ${activeTab === "add" ? "add" : "remove"} workers to export`);
 return;
 }

 const safe = (value) =>
 String(value || "department")
 .trim()
 .replace(/[^a-z0-9_-]+/gi, "_")
 .replace(/_+/g, "_")
 .replace(/^_+|_+$/g, "");
 const ts = (() => {
 const d = new Date();
 const yyyy = d.getFullYear();
 const mm = String(d.getMonth() + 1).padStart(2, "0");
 const dd = String(d.getDate()).padStart(2, "0");
 const hh = String(d.getHours()).padStart(2, "0");
 const min = String(d.getMinutes()).padStart(2, "0");
 return `${yyyy}-${mm}-${dd}_${hh}-${min}`;
 })();
 const deptNameForFile = authUser?.department || authUser?.team || "department";

 // Define CSV headers
 const headers = [
 "ID",
 "First Name",
 "Last Name",
 "Email",
 "Phone Number",
 "Department",
 "Team",
 "Status"
 ];

 // Convert workers data to CSV rows
 const rows = workersToExport.map((worker) => [
 worker.id || worker.workerid || "",
 worker.firstname || "",
 worker.lastname || "",
 worker.email || "N/A",
 worker.phonenumber || "N/A",
 worker.department || "N/A",
 worker.team || "N/A",
 worker.status || "Unknown"
 ]);

 // Escape CSV values (handle commas, quotes, newlines)
 const escapeCSV = (value) => {
 if (value === null || value === undefined) return "";
 const stringValue = String(value);
 if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
 return `"${stringValue.replace(/"/g, '""')}"`;
 }
 return stringValue;
 };

 // Build CSV content
 const csvContent = [
 headers.map(escapeCSV).join(","),
 ...rows.map((row) => row.map(escapeCSV).join(","))
 ].join("\n");

 // Create blob and download
 const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
 const fileName = `${safe(deptNameForFile)}_workers_${ts}.csv`;
 saveAs(blob, fileName);
 
 toast.success(`Exported ${workersToExport.length} worker(s) to CSV`);
 } catch {
 toast.error("Failed to export workers to CSV");
 }
 };

 // Export to Excel with one sheet per department
 const exportToExcelByDepartment = async () => {
 try {
 const workersToExport =
 activeTab === "add" ? allPendingAddWorkers : allPendingRemoveWorkers;

 if (!workersToExport.length) {
 toast.error(
 `No pending ${activeTab === "add" ? "add" : "remove"} workers to export`
 );
 return;
 }

 const authUser = JSON.parse(sessionStorage.getItem("authUser") || "null");
 const safe = (value) =>
 String(value || "department")
 .trim()
 .replace(/[^a-z0-9_-]+/gi, "_")
 .replace(/_+/g, "_")
 .replace(/^_+|_+$/g, "");
 const ts = (() => {
 const d = new Date();
 const yyyy = d.getFullYear();
 const mm = String(d.getMonth() + 1).padStart(2, "0");
 const dd = String(d.getDate()).padStart(2, "0");
 const hh = String(d.getHours()).padStart(2, "0");
 const min = String(d.getMinutes()).padStart(2, "0");
 return `${yyyy}-${mm}-${dd}_${hh}-${min}`;
 })();
 const deptNameForFile =
 authUser?.department || authUser?.team || "department";

 // Group workers by department
 const workersByDept = {};
 workersToExport.forEach((worker) => {
 const dept = worker.department || "Unassigned";
 if (!workersByDept[dept]) {
 workersByDept[dept] = [];
 }
 workersByDept[dept].push(worker);
 });

 const workbook = new ExcelJS.Workbook();

 const headers = [
 "S/N",
 "ID",
 "First Name",
 "Last Name",
 "Email",
 "Phone Number",
 "Department",
 "Team",
 "Status",
 ];

 const makeSheetName = (name) =>
 (name || "Sheet")
 .toString()
 .replace(/[[\]*/?:]/g, "")
 .slice(0, 31) || "Sheet";

 const departments = Object.keys(workersByDept).sort();

 departments.forEach((dept) => {
 const sheetName = makeSheetName(dept);
 const sheet = workbook.addWorksheet(sheetName, {
 views: [{ state: "frozen", ySplit: 1 }],
 });

 sheet.columns = headers.map((header) => ({
 header,
 key: header,
 width: Math.min(32, Math.max(12, header.length + 4)),
 }));

 const rows = workersByDept[dept].map((worker, index) => ({
 "S/N": index + 1,
 ID: worker.id || worker.workerid || "",
 "First Name": worker.firstname || "",
 "Last Name": worker.lastname || "",
 Email: worker.email || "N/A",
 "Phone Number": worker.phonenumber || "N/A",
 Department: worker.department || "N/A",
 Team: worker.team || "N/A",
 Status: worker.status || "Unknown",
 }));

 rows.forEach((row) => sheet.addRow(row));

 const headerRow = sheet.getRow(1);
 headerRow.font = { bold: true };
 headerRow.fill = {
 type: "pattern",
 pattern: "solid",
 fgColor: { argb: "FFEFEFEF" },
 };

 sheet.autoFilter = {
 from: { row: 1, column: 1 },
 to: { row: 1, column: headers.length },
 };
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], {
 type:
 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
 });
 const fileName = `${safe(
 deptNameForFile
 )}_pending_${activeTab === "add" ? "add" : "delete"}_workers_${ts}.xlsx`;
 saveAs(blob, fileName);

 toast.success(
 `Exported ${workersToExport.length} worker(s) across ${
 departments.length
 } department(s) to Excel`
 );
 } catch {
 toast.error("Failed to export workers to Excel");
 }
 };

 return (
 <div className="min-h-screen bg-cream">
 <Header />
 <Layout>
 <div>
 {/* Page header */}
 <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
 <div>
 <div className="qc-eyebrow">Approvals</div>
 <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
 Pending workers
 </h1>
 <p className="mt-1 text-sm text-ink-500">
 Review and approve self-registered workers, or process delete requests.
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 className="qc-btn-secondary"
 onClick={exportToExcelByDepartment}
 disabled={isBusy}
 >
 Export Excel
 </button>
 <button
 type="button"
 className="qc-btn-secondary"
 onClick={exportToCSV}
 disabled={isBusy}
 >
 Export CSV
 </button>
 <button
 type="button"
 className="qc-btn-ghost"
 onClick={fetchAllPendingWorkers}
 disabled={isBusy}
 >
 Refresh
 </button>
 </div>
 </div>

 {/* Tabs - sliding ink underline */}
 <div className="mb-4 border-b border-ink-200">
 <nav className="flex gap-1" aria-label="Approvals">
 <button
 type="button"
 onClick={() => handleTabChange("add")}
 className={`relative px-3 py-3 text-sm font-medium transition-colors min-h-touch ${
 activeTab === "add"
 ? "text-ink-900"
 : "text-ink-500 hover:text-ink-700"
 }`}
 aria-pressed={activeTab === "add"}
 >
 Pending add
 <span className="qc-num text-2xs uppercase tracking-tag text-ink-400 ml-1.5">
 {allPendingAddWorkers.length}
 </span>
 {activeTab === "add" && (
 <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-ink-900" aria-hidden="true" />
 )}
 </button>
 <button
 type="button"
 onClick={() => handleTabChange("remove")}
 className={`relative px-3 py-3 text-sm font-medium transition-colors min-h-touch ${
 activeTab === "remove"
 ? "text-ink-900"
 : "text-ink-500 hover:text-ink-700"
 }`}
 aria-pressed={activeTab === "remove"}
 >
 Pending delete
 <span className="qc-num text-2xs uppercase tracking-tag text-ink-400 ml-1.5">
 {allPendingRemoveWorkers.length}
 </span>
 {activeTab === "remove" && (
 <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-ink-900" aria-hidden="true" />
 )}
 </button>
 </nav>
 </div>

 {/* Bulk Actions */}
 {selectedWorkers.size > 0 && (
 <div className="mt-4 qc-card p-4 border-mustard/40 bg-mustard/[0.06]">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-4">
 <span className="text-sm font-medium text-mustard">
 <span className="qc-num">{selectedWorkers.size}</span> worker(s) selected
 </span>
 <button
 type="button"
 onClick={clearSelection}
 className="text-sm text-mustard hover:text-mustard/80 font-medium"
 >
 Clear selection
 </button>
 </div>
 <div className="flex space-x-2">
 {/* Pending Add: Approve first, then Delete */}
 {activeTab === "add" && (
 <>
 <button
 onClick={bulkApprove}
 disabled={isBusy}
 className="bg-forest px-4 py-2 text-white rounded-lg text-sm font-medium hover:bg-forest/80 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isProcessing ? "Processing..." : `Approve Selected (${selectedWorkers.size})`}
 </button>
 <button
 onClick={bulkDelete}
 disabled={isBusy}
 className="bg-brick px-4 py-2 text-white rounded-lg text-sm font-medium hover:bg-brick/80 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isProcessing ? "Processing..." : `Delete Selected (${selectedWorkers.size})`}
 </button>
 </>
 )}

 {/* Pending Delete: Delete only */}
 {activeTab === "remove" && (
 <>
 <button
 onClick={bulkDelete}
 disabled={isBusy}
 className="bg-brick px-4 py-2 text-white rounded-lg text-sm font-medium hover:bg-brick/80 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isProcessing ? "Processing..." : `Delete Selected (${selectedWorkers.size})`}
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Table Section */}
 <div className="mt-6">
 <div className="bg-white rounded-lg border border-ink-200">
 {isLoading ? (
 <div className="p-8">
 <LoadingState />
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-ink-200">
 <thead className="bg-cream">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <input
 type="checkbox"
 checked={isSelectAll}
 onChange={handleSelectAll}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <button
 onClick={() => handleSort("id")}
 className="flex items-center hover:text-ink-700"
 >
 <span>ID</span>
 {getSortIcon("id")}
 </button>
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <button
 onClick={() => handleSort("name")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Name</span>
 {getSortIcon("name")}
 </button>
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <button
 onClick={() => handleSort("email")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Email</span>
 {getSortIcon("email")}
 </button>
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <button
 onClick={() => handleSort("phonenumber")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Phone</span>
 {getSortIcon("phonenumber")}
 </button>
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <button
 onClick={() => handleSort("department")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Department</span>
 {getSortIcon("department")}
 </button>
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <button
 onClick={() => handleSort("team")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Team</span>
 {getSortIcon("team")}
 </button>
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <button
 onClick={() => handleSort("status")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Status</span>
 {getSortIcon("status")}
 </button>
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-ink-200">
 {Array.isArray(sortedWorkers) &&
 sortedWorkers.map((worker, idx) => (
 <tr key={worker.id} className="hover:bg-cream">
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink-900">
 <input
 type="checkbox"
 checked={selectedWorkers.has(worker.id)}
 onChange={() => handleSelectWorker(worker.id)}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink-900">
 {worker.id || worker.workerid || idx + 1}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {worker.firstname} {worker.lastname}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {worker.email || "N/A"}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {worker.phonenumber || "N/A"}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {worker.department || "N/A"}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {worker.team || "N/A"}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
 worker.status === "PENDING_ADD" 
 ? "bg-mustard/10 text-mustard"
 : "bg-brick/10 text-brick"
 }`}>
 {worker.status || "Unknown"}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 <div className="flex space-x-2">
 <button
 onClick={() => navigate(`/worker/${worker.id}?from=pending-workers`)}
 className="text-ink-900 hover:text-ink-900"
 title="View Details"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 {/* Pending Add: approve or delete. Pending Delete: delete only. */}
 {activeTab === "add" && (
 <button
 onClick={() => approveWorker(worker.id)}
 disabled={isBusy}
 className="text-forest hover:text-forest/80 disabled:opacity-50"
 title="Approve"
 >
 <CheckIcon className="h-4 w-4" />
 </button>
 )}
 <button
 onClick={() => deleteWorker(worker.id)}
 disabled={isBusy}
 className="text-brick hover:text-brick/80 disabled:opacity-50"
 title="Delete"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}

 {/* Show message when no data */}
 {Array.isArray(sortedWorkers) && sortedWorkers.length === 0 && (
 <tr>
 <td
 colSpan="9"
 className="px-6 py-8 text-center text-ink-500"
 >
 <div className="flex flex-col items-center">
 <svg
 className="w-12 h-12 text-ink-400 mb-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
 />
 </svg>
 <p className="text-lg font-medium text-ink-900 mb-2">
 No pending {activeTab === "add" ? "add" : "remove"} workers
 </p>
 <p className="text-sm text-ink-500">
 All workers have been processed.
 </p>
 </div>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>


 {/* Pagination */}
 {pagination.total > 0 && (
 <div className="mt-6 flex items-center justify-between">
 <div className="flex items-center text-sm text-ink-700">
 <span>
 Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
 {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
 {pagination.total} results
 </span>
 </div>
 
 <div className="flex items-center space-x-2">
 <button
 onClick={() => handlePagination(pagination.page - 1)}
 disabled={!pagination.hasPrev || isBusy}
 className="px-3 py-2 text-sm font-medium text-ink-500 bg-white border border-ink-300 rounded-md hover:bg-cream disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Previous
 </button>
 
 {/* Page numbers */}
 <div className="flex items-center space-x-1">
 {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
 let pageNum;
 if (pagination.totalPages <= 5) {
 pageNum = i + 1;
 } else if (pagination.page <= 3) {
 pageNum = i + 1;
 } else if (pagination.page >= pagination.totalPages - 2) {
 pageNum = pagination.totalPages - 4 + i;
 } else {
 pageNum = pagination.page - 2 + i;
 }
 
 return (
 <button
 key={pageNum}
 onClick={() => handlePagination(pageNum)}
 disabled={isBusy}
 className={`px-3 py-2 text-sm font-medium rounded-md ${
 pageNum === pagination.page
 ? "bg-ink-900 text-white"
 : "text-ink-700 bg-white border border-ink-300 hover:bg-cream"
 } disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 {pageNum}
 </button>
 );
 })}
 </div>
 
 <button
 onClick={() => handlePagination(pagination.page + 1)}
 disabled={!pagination.hasNext || isBusy}
 className="px-3 py-2 text-sm font-medium text-ink-500 bg-white border border-ink-300 rounded-md hover:bg-cream disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>

 <GenericModal
 isOpen={bulkDeleteConfirmOpen}
 onClose={closeBulkDeleteConfirm}
 title="Permanently delete workers"
 size="small"
 >
 <p className="text-sm text-ink-600">
 This will permanently delete {selectedWorkers.size} worker(s). This action cannot be undone.
 </p>
 <div>
 <label htmlFor="bulk-delete-confirm" className="qc-label text-ink-700">
 Type <span className="font-mono">DELETE ALL</span> to confirm (case-sensitive)
 </label>
 <input
 id="bulk-delete-confirm"
 type="text"
 autoComplete="off"
 value={bulkDeleteConfirmText}
 onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 confirmBulkDelete();
 }
 }}
 className="qc-input"
 />
 </div>
 <div className="flex flex-col-reverse gap-3 border-t border-ink-200 pt-4 sm:flex-row sm:justify-end">
 <button type="button" className="qc-btn-secondary sm:min-w-24" onClick={closeBulkDeleteConfirm}>
 Cancel
 </button>
 <button
 type="button"
 className="qc-btn-danger sm:min-w-36"
 disabled={bulkDeleteConfirmText !== "DELETE ALL" || isProcessing}
 onClick={confirmBulkDelete}
 >
 Delete {selectedWorkers.size} worker(s)
 </button>
 </div>
 </GenericModal>
 </Layout>
 </div>
 );
}
