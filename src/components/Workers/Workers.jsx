import { useLocation, useNavigate, Link } from "react-router-dom";
import Header from "../Header";
import { getDepartmentByUser } from "../../utils/getDepartment";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminWorkers, fetchWorkers } from "../../services/workers";
import { toast } from "react-toastify";
import { getNextSunday } from "../../utils/getDate";
import ReactSelectDropdown from "../ReactSelect";
import Layout from "../Layout";
// import { getAdminSelectOptions } from "../../utils/routeObject";
// import { ADMIN_ENUMS } from "../../utils/enums";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import {
 getCachedFilterData,
 getFilterOptions,
 initializeFilterData,
} from "../../utils/filterCache";
import apiRequest from "../../utils/apiClient";
import { teamsAndDepartments } from "../../utils/teams";
import { fetchTeamsAndDepartmentsForFilter } from "../../services/departments";
import {
 TrashIcon,
 PencilIcon,
 ChevronDownIcon,
 ChevronUpIcon,
} from "@heroicons/react/24/outline";
import GenericModal from "../GenericModal";
import LoadingState from "../LoadingState";
import { saveAs } from "file-saver";

export default function Workers() {
 const navigate = useNavigate();
 const location = useLocation();
 const authUser = useMemo(() => JSON.parse(sessionStorage.getItem("authUser")), []);

 // All hooks must be called before any conditional returns
 const [data, setData] = useState([]);
 const [isLoading, setIsLoading] = useState(false);
 const dateForAttendance = getNextSunday();
 const [refresh, ] = useState(0);
 const [filters, setFilters] = useState({
 department: "All",
 team: "All",
 });
 const team = getDepartmentByUser(location.pathname);
 // const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
 const isSuperAdmin = team.department === "Super Admin";
 const isAdminMember = checkAdminStatus(location.pathname);
 // const optionsAdmin = getAdminSelectOptions(
 // isChurchAdmin || isSuperAdmin,
 // team
 // );
 const [filterModalOpen, setFilterModalOpen] = useState(false);
 const [expandedRows, setExpandedRows] = useState(new Set());
 const [pagination, setPagination] = useState({
 page: 1,
 limit: 50,
 total: 0,
 totalPages: 0,
 hasNext: false,
 hasPrev: false,
 });
 const [availableDepartments, setAvailableDepartments] = useState([]);
 const [searchTerm, setSearchTerm] = useState("");
 const [selectedWorkers, setSelectedWorkers] = useState(new Set());
 const [isSelectAll, setIsSelectAll] = useState(false);
 const [allWorkers, setAllWorkers] = useState([]);

 const [filterOptions, setFilterOptions] = useState({
 departments: [{ value: "All", label: "All Departments" }],
 teams: [{ value: "All", label: "All Teams" }],
 });
 const [apiDepartmentsByTeam, setApiDepartmentsByTeam] = useState(null);

 // Generate fallback filter options from teamsAndDepartments
 const generateFallbackFilterOptions = () => {
 // Get all unique departments from teamsAndDepartments
 const allDepartments = new Set();
 teamsAndDepartments.forEach((team) => {
 if (Array.isArray(team.department)) {
 team.department.forEach((dept) => allDepartments.add(dept));
 }
 });

 // Get all teams
 const allTeams = teamsAndDepartments.map((team) => team.team);

 return {
 departments: [
 { value: "All", label: "All Departments" },
 ...Array.from(allDepartments)
 .sort()
 .map((dept) => ({ value: dept, label: dept })),
 ],
 teams: [
 { value: "All", label: "All Teams" },
 ...allTeams.sort().map((team) => ({ value: team, label: team })),
 ],
 };
 };

 const fallbackFilterOptions = useMemo(() => generateFallbackFilterOptions(), []);

 const querySuperAdminWorkers = useCallback(async (page = 1, limit = 50, search = "") => {
 setIsLoading(true);
 try {
 const params = { limit: 3478 };
 if (search && search.trim()) {
 params.search = search.trim();
 }
 Object.entries(filters).forEach(([key, value]) => {
 if (value !== "All") {
 params[key] = value;
 }
 });

 const result = await apiRequest("GET", "/api/super/admin/workers", params);

 // Handle the actual API response structure: result.data.data
 let workersData = [];
 if (result?.data?.data && Array.isArray(result.data.data)) {
 workersData = result.data.data;
 } else if (result?.data && Array.isArray(result.data)) {
 workersData = result.data;
 } else if (Array.isArray(result)) {
 workersData = result;
 } else {
 workersData = [];
 }

 // Sort workers by ID on the client side since we fetched all data
 const sortedWorkers = (workersData || []).sort((a, b) => {
 const idA = parseInt(a.id || a.workerid || 0);
 const idB = parseInt(b.id || b.workerid || 0);
 return idA - idB;
 });

 // Store all workers for client-side pagination
 setAllWorkers(sortedWorkers);

 // Implement client-side pagination
 const startIndex = (page - 1) * limit;
 const endIndex = startIndex + limit;
 const paginatedWorkers = sortedWorkers.slice(startIndex, endIndex);

 // Set the paginated data
 setData(paginatedWorkers);

 // Set pagination info for client-side pagination
 const totalWorkers = sortedWorkers.length;
 const totalPages = Math.ceil(totalWorkers / limit);
 
 setPagination({
 page: page,
 limit: limit,
 total: totalWorkers,
 totalPages: totalPages,
 hasNext: page < totalPages,
 hasPrev: page > 1,
 });

 setIsLoading(false);
 } catch (error) {
 // Check if it's an authentication error
 if (
 error.message.includes("401") ||
 error.message.includes("Unauthorized")
 ) {
 toast.error("Authentication failed. Please log in again.");
 // Clear session and redirect to login
 sessionStorage.removeItem("authUser");
 sessionStorage.removeItem("accessToken");
 navigate("/login");
 } else {
 toast.error(`Error loading workers: ${error.message}`);
 }

 setIsLoading(false);
 }
 }, [filters, navigate]);

 const queryAdminWorkers = useCallback((search = "") => {
 setIsLoading(true);
 const rawPermissions = authUser?.permissions ?? [];
 // Filter out team name from permissions (team name shouldn't be in permissions array)
 const permissions = rawPermissions.filter((perm) => perm !== authUser?.team);
 fetchAdminWorkers("All", "All", dateForAttendance, search, permissions)
 .then((res) => {
 setData(res);
 setIsLoading(false);
 })
 .catch((error) => {
 toast.error(`Error loading workers: ${error.message}`);
 setIsLoading(false);
 });
 }, [authUser?.permissions, authUser?.team, dateForAttendance]);

 const queryWorkers = useCallback((search = "") => {
 setIsLoading(true);
 const rawPermissions = authUser?.permissions ?? [];
 // Filter out team name from permissions (team name shouldn't be in permissions array)
 const permissions = rawPermissions.filter((perm) => perm !== authUser?.team);
 fetchWorkers(team.department, dateForAttendance, permissions, search)
 .then((res) => {
 setData(res);
 setIsLoading(false);
 })
 .catch((error) => {
 toast.error(`Error loading workers: ${error.message}`);
 setIsLoading(false);
 });
 }, [authUser?.permissions, authUser?.team, team.department, dateForAttendance]);

 const clearSelection = useCallback(() => {
 setSelectedWorkers(new Set());
 setIsSelectAll(false);
 }, []);

 const updateDepartmentsForTeam = useCallback((selectedTeam) => {
 if (apiDepartmentsByTeam && isSuperAdmin) {
 if (selectedTeam === "All") {
 const allDepts = new Set();
 Object.values(apiDepartmentsByTeam).forEach((arr) => {
 (arr || []).forEach((d) => allDepts.add(d));
 });
 setAvailableDepartments([
 { value: "All", label: "All Departments" },
 ...[...allDepts].sort().map((dept) => ({ value: dept, label: dept })),
 ]);
 } else {
 const depts = apiDepartmentsByTeam[selectedTeam];
 setAvailableDepartments([
 { value: "All", label: "All Departments" },
 ...(Array.isArray(depts) ? depts.sort() : []).map((dept) => ({ value: dept, label: dept })),
 ]);
 }
 return;
 }

 if (selectedTeam === "All") {
 const allDepartments = new Set();
 teamsAndDepartments.forEach((team) => {
 if (Array.isArray(team.department)) {
 team.department.forEach((dept) => allDepartments.add(dept));
 }
 });
 setAvailableDepartments([
 { value: "All", label: "All Departments" },
 ...Array.from(allDepartments)
 .sort()
 .map((dept) => ({ value: dept, label: dept })),
 ]);
 } else {
 const teamData = teamsAndDepartments.find(
 (team) => team.team === selectedTeam
 );
 if (teamData && Array.isArray(teamData.department)) {
 setAvailableDepartments([
 { value: "All", label: "All Departments" },
 ...teamData.department
 .sort()
 .map((dept) => ({ value: dept, label: dept })),
 ]);
 } else {
 setAvailableDepartments([{ value: "All", label: "All Departments" }]);
 }
 }
 }, [apiDepartmentsByTeam, isSuperAdmin]);

 useEffect(() => {
 if (isSuperAdmin) {
 querySuperAdminWorkers(1, 50);
 } else if (isAdminMember) {
 queryAdminWorkers();
 } else {
 queryWorkers();
 }
 clearSelection();
 }, [
 filters,
 isAdminMember,
 isSuperAdmin,
 team.team,
 querySuperAdminWorkers,
 queryAdminWorkers,
 queryWorkers,
 clearSelection,
 ]);

 // Load filter options: API-led for super-admin, cache/fallback otherwise
 useEffect(() => {
 const loadFilterOptions = async () => {
 if (isSuperAdmin) {
 try {
 const { teams, departments, departmentsByTeam } = await fetchTeamsAndDepartmentsForFilter();
 setFilterOptions({ teams, departments });
 setApiDepartmentsByTeam(departmentsByTeam || null);
 } catch (_) {
 setFilterOptions(fallbackFilterOptions);
 setApiDepartmentsByTeam(null);
 }
 return;
 }

 const cachedFilterData = getCachedFilterData();
 if (cachedFilterData) {
 const options = getFilterOptions(cachedFilterData);
 if (options) {
 setFilterOptions(options);
 }
 } else {
 const accessToken = sessionStorage.getItem("accessToken");
 if (accessToken) {
 initializeFilterData(accessToken)
 .then((filterData) => {
 if (filterData) {
 const options = getFilterOptions(filterData);
 if (options) {
 setFilterOptions(options);
 }
 } else {
 setFilterOptions(fallbackFilterOptions);
 }
 })
 .catch(() => {
 setFilterOptions(fallbackFilterOptions);
 });
 } else {
 setFilterOptions(fallbackFilterOptions);
 }
 }
 };

 loadFilterOptions();
 }, [isSuperAdmin, fallbackFilterOptions]);

 // Initialize available departments when API data loads (super-admin)
 useEffect(() => {
 if (isSuperAdmin) {
 updateDepartmentsForTeam(filters.team);
 }
 }, [isSuperAdmin, apiDepartmentsByTeam, filters.team, updateDepartmentsForTeam]);

 useEffect(() => {
 if (isSuperAdmin) {
 querySuperAdminWorkers(1, 50);
 } else if (isAdminMember) {
 queryAdminWorkers();
 } else {
 queryWorkers();
 }
 clearSelection();
 }, [
 refresh,
 isSuperAdmin,
 isAdminMember,
 querySuperAdminWorkers,
 queryAdminWorkers,
 queryWorkers,
 clearSelection,
 ]);
 const handleFilterChange = (filterType, value) => {
 setFilters((prev) => {
 const newFilters = {
 ...prev,
 [filterType]: value,
 };

 // If team changes, update available departments for that team
 if (filterType === "team") {
 updateDepartmentsForTeam(value);
 newFilters.department = "All"; // Reset department when team changes
 }

 return newFilters;
 });
 };

 const clearAllFilters = () => {
 setFilters({
 department: "All",
 team: "All",
 });
 // Reset to all departments when clearing filters
 updateDepartmentsForTeam("All");
 };

 // Normalize phone number for search (remove leading 0 if present)
 const normalizePhoneNumber = (phoneNumber) => {
 if (!phoneNumber) return phoneNumber;
 // Remove leading 0 if present
 return phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
 };

 // Check if search term looks like a phone number and normalize it
 const normalizeSearchTerm = (term) => {
 if (!term) return term;
 
 // Check if the term looks like a phone number (starts with 0 or is all digits)
 const phoneRegex = /^0?\d{10,11}$/;
 if (phoneRegex.test(term.trim())) {
 return normalizePhoneNumber(term.trim());
 }
 
 return term.trim();
 };

 // Search functionality
 const handleSearch = (term) => {
 setSearchTerm(term);
 const normalizedTerm = normalizeSearchTerm(term);
 if (isSuperAdmin) {
 querySuperAdminWorkers(1, 50, normalizedTerm);
 } else if (isAdminMember) {
 queryAdminWorkers(normalizedTerm);
 } else {
 queryWorkers(normalizedTerm);
 }
 };

 const clearSearch = () => {
 setSearchTerm("");
 if (isSuperAdmin) {
 querySuperAdminWorkers(1, 50);
 } else if (isAdminMember) {
 queryAdminWorkers();
 } else {
 queryWorkers();
 }
 };

 const openFilterModal = () => {
 setFilterModalOpen(true);
 };

 const closeFilterModal = () => {
 setFilterModalOpen(false);
 };

 const applyFilters = () => {
 setFilterModalOpen(false);
 // The useEffect will automatically trigger when filters change
 };

 const deleteWorker = async (workerId) => {
 if (!workerId) {
 toast.error("Invalid worker ID");
 return;
 }

 // Strong confirmation dialog for deletion
 const confirmMessage = `⚠️ PERMANENT DELETION WARNING ⚠️

You are about to PERMANENTLY DELETE this worker from the system.

🚨 THIS ACTION IS IRREVERSIBLE AND CANNOT BE UNDONE 🚨

All worker data, records, and associated information will be permanently lost.

Are you absolutely certain you want to proceed with this permanent deletion?

Type "DELETE" to confirm (case-sensitive):`;

 const userInput = window.prompt(confirmMessage);
 
 if (userInput !== "DELETE") {
 if (userInput !== null) {
 toast.error("Deletion cancelled. You must type 'DELETE' exactly to confirm.");
 }
 return;
 }

 setIsLoading(true);
 try {
 await apiRequest("DELETE", `/api/super/admin/${workerId}/workers`);

 toast.success("Worker deleted successfully");

 // Refresh the data
 if (isSuperAdmin) {
 querySuperAdminWorkers();
 } else if (isAdminMember) {
 queryAdminWorkers();
 } else {
 queryWorkers();
 }
 } catch (error) {
 toast.error("Failed to delete worker");
 } finally {
 setIsLoading(false);
 }
 };

 const handleEditWorker = (workerId) => {
 // Navigate to view/edit worker page
 navigate(`/worker/${workerId}`);
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
 setIsSelectAll(newSelectedWorkers.size === data.length && data.length > 0);
 };

 const handleSelectAll = () => {
 if (isSelectAll) {
 setSelectedWorkers(new Set());
 setIsSelectAll(false);
 } else {
 const allWorkerIds = new Set(data.map(worker => worker.id));
 setSelectedWorkers(allWorkerIds);
 setIsSelectAll(true);
 }
 };

 // Handle pagination from stored data
 const handlePagination = (newPage) => {
 if (allWorkers.length === 0) return;
 
 const startIndex = (newPage - 1) * pagination.limit;
 const endIndex = startIndex + pagination.limit;
 const paginatedWorkers = allWorkers.slice(startIndex, endIndex);
 
 setData(paginatedWorkers);
 setPagination(prev => ({
 ...prev,
 page: newPage,
 hasNext: newPage < prev.totalPages,
 hasPrev: newPage > 1,
 }));
 };

 const bulkDeleteWorkers = async () => {
 if (selectedWorkers.size === 0) {
 toast.error("No workers selected for deletion");
 return;
 }

 // Strong confirmation dialog for bulk deletion
 const confirmMessage = `⚠️ PERMANENT BULK DELETION WARNING ⚠️

You are about to PERMANENTLY DELETE ${selectedWorkers.size} worker(s) from the system.

🚨 THIS ACTION IS IRREVERSIBLE AND CANNOT BE UNDONE 🚨

All worker data, records, and associated information will be permanently lost.

Are you absolutely certain you want to proceed with this permanent bulk deletion?

Type "DELETE ALL" to confirm (case-sensitive):`;

 const userInput = window.prompt(confirmMessage);
 
 if (userInput !== "DELETE ALL") {
 if (userInput !== null) {
 toast.error("Bulk deletion cancelled. You must type 'DELETE ALL' exactly to confirm.");
 }
 return;
 }

 setIsLoading(true);
 try {
 const workerIds = Array.from(selectedWorkers);
 let successCount = 0;
 let errorCount = 0;

 for (const workerId of workerIds) {
 try {
 await apiRequest("DELETE", `/api/super/admin/${workerId}/workers`);
 successCount++;
 } catch (error) {
 errorCount++;
 }
 }

 if (successCount > 0) {
 toast.success(`${successCount} worker(s) deleted successfully`);
 }
 if (errorCount > 0) {
 toast.error(`Failed to delete ${errorCount} worker(s).`);
 }

 clearSelection();

 // Refresh the data
 if (isSuperAdmin) {
 querySuperAdminWorkers();
 } else if (isAdminMember) {
 queryAdminWorkers();
 } else {
 queryWorkers();
 }
 } catch (error) {
 toast.error(`Failed to delete workers: ${error.message}`);
 } finally {
 setIsLoading(false);
 }
 };

 const toggleRowExpansion = (workerId) => {
 const newExpandedRows = new Set(expandedRows);
 if (newExpandedRows.has(workerId)) {
 newExpandedRows.delete(workerId);
 } else {
 newExpandedRows.add(workerId);
 }
 setExpandedRows(newExpandedRows);
 };

 // Helper function to split full name into first and last name
 const splitName = (fullName) => {
 if (!fullName) return { firstName: "", lastName: "" };
 const nameParts = fullName.trim().split(" ");
 const firstName = nameParts[0] || "";
 const lastName = nameParts.slice(1).join(" ") || "";
 return { firstName, lastName };
 };

 // Export teams to CSV
 const exportTeamsToCSV = () => {
 try {
 if (!allWorkers.length) {
 toast.error("No workers to export");
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
 const deptNameForFile = authUser?.department || authUser?.team || "department";

 // Group workers by team
 const workersByTeam = {};
 allWorkers.forEach((worker) => {
 const team = worker.team || "Unassigned";
 if (!workersByTeam[team]) {
 workersByTeam[team] = [];
 }
 workersByTeam[team].push(worker);
 });

 // Sort teams alphabetically
 const sortedTeams = Object.keys(workersByTeam).sort();

 // Build CSV content
 const headers = [
 "Team",
 "Worker ID",
 "First Name",
 "Last Name",
 "Other Name",
 "Email",
 "Phone Number",
 "Department",
 "Role",
 "Employment Status",
 "Marital Status",
 "Birthdate",
 "Age Range",
 "Gender",
 "Address",
 "Status",
 ];

 const escapeCSV = (value) => {
 if (value === null || value === undefined) return "";
 const stringValue = String(value);
 if (
 stringValue.includes(",") ||
 stringValue.includes('"') ||
 stringValue.includes("\n")
 ) {
 return `"${stringValue.replace(/"/g, '""')}"`;
 }
 return stringValue;
 };

 const rows = [];
 
 // Add rows for each team
 sortedTeams.forEach((team) => {
 const teamWorkers = workersByTeam[team];
 teamWorkers.forEach((worker, idx) => {
 const firstName =
 worker.firstname || splitName(worker.fullname).firstName;
 const lastName =
 worker.lastname || splitName(worker.fullname).lastName;
 
 rows.push([
 idx === 0 ? team : "", // Only show team name in first row of each team
 worker.id || worker.workerid || "",
 firstName || "",
 lastName || "",
 worker.othername || "",
 worker.email || "N/A",
 worker.phonenumber || "N/A",
 worker.department || "N/A",
 worker.workerrole || worker.role || "Worker",
 worker.employment || "N/A",
 worker.maritalstatus || "N/A",
 worker.birthdate || "N/A",
 worker.agerange || "N/A",
 worker.gender || "N/A",
 worker.address || "N/A",
 worker.status || "Unknown",
 ]);
 });
 });

 const csvContent = [
 headers.map(escapeCSV).join(","),
 ...rows.map((row) => row.map(escapeCSV).join(",")),
 ].join("\n");

 const blob = new Blob([csvContent], {
 type: "text/csv;charset=utf-8;",
 });
 const fileName = `${safe(deptNameForFile)}_workers_${ts}.csv`;
 saveAs(blob, fileName);

 const totalWorkers = allWorkers.length;
 const totalTeams = sortedTeams.length;
 toast.success(
 `Exported ${totalWorkers} worker(s) across ${totalTeams} team(s) to CSV`
 );
 } catch (error) {
 toast.error("Failed to export teams to CSV");
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
 <h1 className="text-lg sm:text-xl font-semibold text-ink-900">
 Workers
 </h1>
 </div>
 <div className="self-start sm:self-center flex flex-wrap gap-2">
 <button
 className="bg-mustard px-3 py-1.5 sm:px-4 sm:py-2 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-mustard/80"
 onClick={() => navigate("/pending-workers")}
 >
 Pending Workers
 </button>
 <button
 className="bg-forest px-3 py-1.5 sm:px-4 sm:py-2 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-forest/80"
 onClick={() => navigate("/add-worker")}
 >
 Add Worker
 </button>
 <button
 className="bg-purple-600 px-3 py-1.5 sm:px-4 sm:py-2 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-purple-700"
 onClick={exportTeamsToCSV}
 disabled={isLoading || !allWorkers.length}
 >
 Export
 </button>
 <button
 className="bg-ink-500 px-3 py-1.5 sm:px-4 sm:py-2 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-ink-600"
 onClick={() => querySuperAdminWorkers(1, 50)}
 >
 Refresh
 </button>
 </div>
 </div>

 {/* Bulk Actions Section */}
 {selectedWorkers.size > 0 && (
 <div className="mt-4 p-4 bg-mustard/10 border border-mustard/30 rounded-lg">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-4">
 <span className="text-sm font-medium text-mustard">
 {selectedWorkers.size} worker(s) selected
 </span>
 <button
 onClick={clearSelection}
 className="text-sm text-mustard hover:text-mustard/80 font-medium"
 >
 Clear Selection
 </button>
 </div>
 <div className="flex space-x-2">
 <button
 onClick={bulkDeleteWorkers}
 disabled={isLoading}
 className="bg-brick px-4 py-2 text-white rounded-lg text-sm font-medium hover:bg-brick/80 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isLoading ? "Deleting..." : `Delete Selected (${selectedWorkers.size})`}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Search and Filter Section */}
 <div className="mt-6">
 <div className="flex flex-col sm:flex-row gap-4">
 <div className="flex-1">
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 <svg
 className="h-5 w-5 text-ink-400"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
 />
 </svg>
 </div>
 <input
 type="text"
 placeholder="Search by first name, last name, or phone number..."
 value={searchTerm}
 onChange={(e) => handleSearch(e.target.value)}
 className="block w-full pl-10 pr-3 py-2 border border-ink-300 rounded-md leading-5 bg-white placeholder:text-ink-500 focus:outline-none focus:placeholder:text-ink-400 focus:ring-1 focus:ring-ink-900/10 focus:border-ink-900 sm:text-sm"
 />
 {searchTerm && (
 <button
 onClick={clearSearch}
 className="absolute inset-y-0 right-0 pr-3 flex items-center"
 >
 <svg
 className="h-5 w-5 text-ink-400 hover:text-ink-600"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M6 18L18 6M6 6l12 12"
 />
 </svg>
 </button>
 )}
 </div>
 </div>
 
 {/* Filter Button */}
 {isSuperAdmin && (
 <div className="flex-shrink-0">
 <button
 onClick={openFilterModal}
 className="inline-flex items-center px-4 py-2 border border-ink-300 rounded-md text-sm font-medium text-ink-700 bg-white hover:bg-cream focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900/10"
 >
 <svg
 className="w-4 h-4 mr-2"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 1 0 013 7V4z"
 />
 </svg>
 Filter Workers
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Active Filters Display */}
 {isSuperAdmin && Object.values(filters).some((filter) => filter !== "All") && (
 <div className="mt-4 flex items-center space-x-2">
 <span className="text-sm text-ink-500">
 Active filters:
 </span>
 {Object.entries(filters)
 .filter(([_, value]) => value !== "All")
 .map(([key, value]) => (
 <span
 key={key}
 className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-ink-100 text-ink-900"
 >
 {key}: {value}
 <button
 onClick={() => handleFilterChange(key, "All")}
 className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-ink-900"
 >
 <svg
 className="w-3 h-3"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M6 18L18 6M6 6l12 12"
 />
 </svg>
 </button>
 </span>
 ))}
 <button
 onClick={clearAllFilters}
 className="text-xs text-brick hover:text-brick/80 font-medium"
 >
 Clear All
 </button>
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
 ID
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 First Name
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Last Name
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Phone Number
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Department
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Team
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Role
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-ink-200">
 {Array.isArray(data) &&
 data.map((person, idx) => {
 // Use API field names: firstname, lastname, or fallback to fullname split
 const firstName =
 person.firstname ||
 splitName(person.fullname).firstName;
 const lastName =
 person.lastname ||
 splitName(person.fullname).lastName;
 const isExpanded = expandedRows.has(person.id);
 const statsHref = `/worker/${person.id}/attendance?department=${encodeURIComponent(person.department || "")}&team=${encodeURIComponent(person.team || "")}`;

 return (
 <React.Fragment key={person.id}>
 <tr
 onClick={() => navigate(statsHref)}
 className="cursor-pointer hover:bg-cream-200 transition-colors"
 >
 <td
 className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink-900"
 onClick={(e) => e.stopPropagation()}
 >
 <input
 type="checkbox"
 checked={selectedWorkers.has(person.id)}
 onChange={() => handleSelectWorker(person.id)}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink-900">
 {person.id || person.workerid || idx + 1}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 <Link
 to={statsHref}
 onClick={(e) => e.stopPropagation()}
 className="text-ink-900 hover:underline"
 >
 {firstName}
 </Link>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 <Link
 to={statsHref}
 onClick={(e) => e.stopPropagation()}
 className="text-ink-900 hover:underline"
 >
 {lastName}
 </Link>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
 {person.phonenumber
 ? person.phonenumber.startsWith("0")
 ? person.phonenumber
 : `0${person.phonenumber}`
 : ""}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
 {person.department}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
 {person.team}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm">
 <Link
 to={statsHref}
 onClick={(e) => e.stopPropagation()}
 className="text-ink-500 hover:text-ink-900 hover:underline"
 >
 {person.workerrole || person.role || "Worker"}
 </Link>
 </td>
 <td
 className="px-6 py-4 whitespace-nowrap text-sm text-ink-900"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex space-x-2">
 <button
 onClick={() =>
 toggleRowExpansion(person.id)
 }
 className="text-ink-600 hover:text-ink-900"
 title={isExpanded ? "Collapse" : "Expand"}
 >
 {isExpanded ? (
 <ChevronUpIcon className="h-4 w-4" />
 ) : (
 <ChevronDownIcon className="h-4 w-4" />
 )}
 </button>
 <button
 onClick={() =>
 handleEditWorker(person.id)
 }
 className="text-ink-900 hover:text-ink-900"
 title="Edit Worker"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => deleteWorker(person.id)}
 className="text-brick hover:text-brick/80"
 title="Delete Worker"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 {/* Expanded Row */}
 {isExpanded && (
 <tr className="bg-cream">
 <td colSpan="9" className="px-6 py-4">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-ink-700">
 Other Name
 </label>
 <p className="mt-1 text-sm text-ink-900">
 {person.othername || "N/A"}
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-ink-700">
 Email Address
 </label>
 <p className="mt-1 text-sm text-ink-900">
 {person.email || "N/A"}
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-ink-700">
 Marital Status
 </label>
 <p className="mt-1 text-sm text-ink-900">
 {person.maritalstatus || "N/A"}
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-ink-700">
 Birthday
 </label>
 <p className="mt-1 text-sm text-ink-900">
 {person.birthdate || "N/A"}
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-ink-700">
 Age Range
 </label>
 <p className="mt-1 text-sm text-ink-900">
 {person.agerange || "N/A"}
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-ink-700">
 Gender
 </label>
 <p className="mt-1 text-sm text-ink-900">
 {person.gender || "N/A"}
 </p>
 </div>
 <div className="md:col-span-2 lg:col-span-3">
 <label className="block text-sm font-medium text-ink-700">
 Address
 </label>
 <p className="mt-1 text-sm text-ink-900">
 {person.address || "N/A"}
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-ink-700">
 Employment Status
 </label>
 <p className="mt-1 text-sm text-ink-900">
 {person.employment || "N/A"}
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-ink-700">
 Worker Role
 </label>
 <p className="mt-1 text-sm text-ink-900">
 {person.workerrole || person.role || "N/A"}
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-ink-700">
 Occupation
 </label>
 <p className="mt-1 text-sm text-ink-900">
 {person.occupation || "N/A"}
 </p>
 </div>
 </div>
 </td>
 </tr>
 )}
 </React.Fragment>
 );
 })}

 {/* Show message when no data */}
 {Array.isArray(data) && data.length === 0 && (
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
 No workers found
 </p>
 <p className="text-sm text-ink-500">
 {Object.values(filters).some(
 (filter) => filter !== "All"
 )
 ? "Try adjusting your filters to see more results."
 : "No workers are currently available."}
 </p>
 </div>
 </td>
 </tr>
 )}

 {/* Show error message when data is not an array */}
 {!Array.isArray(data) && data && (
 <tr>
 <td
 colSpan="9"
 className="px-6 py-8 text-center text-ink-500"
 >
 <div className="flex flex-col items-center">
 <svg
 className="w-12 h-12 text-brick mb-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
 />
 </svg>
 <p className="text-lg font-medium text-brick mb-2">
 Data format error
 </p>
 <p className="text-sm text-brick">
 The API response is not in the expected format.
 Please check the console for details.
 </p>
 </div>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}

 {/* Pagination Controls */}
 {isSuperAdmin && Array.isArray(data) && data.length > 0 && (
 <div className="px-6 py-4 border-t border-ink-200 bg-cream">
 <div className="flex items-center justify-between">
 <div className="flex items-center text-sm text-ink-700">
 <span>
 Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
 to{" "}
 {Math.min(
 pagination.page * pagination.limit,
 pagination.total
 )}{" "}
 of {pagination.total} results
 </span>
 </div>

 <div className="flex items-center space-x-1">
 {/* Previous Button */}
 <button
 onClick={() => handlePagination(pagination.page - 1)}
 disabled={!pagination.hasPrev}
 className={`px-3 py-1 text-sm font-medium rounded-md ${
 pagination.hasPrev
 ? "text-ink-700 bg-white border border-ink-300 hover:bg-cream"
 : "text-ink-400 bg-cream-200 border border-ink-200 cursor-not-allowed"
 }`}
 >
 ←
 </button>

 {/* Page Numbers - Always show first and last page */}
 {(() => {
 const currentPage = pagination.page;
 const totalPages = pagination.totalPages;
 const pages = [];

 if (totalPages <= 7) {
 // If 7 or fewer pages, show all
 for (let i = 1; i <= totalPages; i++) {
 pages.push(
 <button
 key={i}
 onClick={() => handlePagination(i)}
 className={`px-3 py-1 text-sm font-medium rounded-md ${
 currentPage === i
 ? "bg-ink-900 text-white"
 : "text-ink-700 bg-white border border-ink-300 hover:bg-cream"
 }`}
 >
 {i}
 </button>
 );
 }
 } else {
 // Always show first page
 pages.push(
 <button
 key={1}
 onClick={() => handlePagination(1)}
 className={`px-3 py-1 text-sm font-medium rounded-md ${
 currentPage === 1
 ? "bg-ink-900 text-white"
 : "text-ink-700 bg-white border border-ink-300 hover:bg-cream"
 }`}
 >
 1
 </button>
 );

 // Show ellipsis if current page is far from start
 if (currentPage > 4) {
 pages.push(
 <span key="ellipsis1" className="px-2 py-1 text-sm text-ink-500">
 ...
 </span>
 );
 }

 // Show pages around current page
 let startPage = Math.max(2, currentPage - 1);
 let endPage = Math.min(totalPages - 1, currentPage + 1);

 // Adjust if we're near the beginning or end
 if (currentPage <= 3) {
 endPage = Math.min(5, totalPages - 1);
 }
 if (currentPage >= totalPages - 2) {
 startPage = Math.max(2, totalPages - 4);
 }

 for (let i = startPage; i <= endPage; i++) {
 if (i !== 1 && i !== totalPages) {
 pages.push(
 <button
 key={i}
 onClick={() => handlePagination(i)}
 className={`px-3 py-1 text-sm font-medium rounded-md ${
 currentPage === i
 ? "bg-ink-900 text-white"
 : "text-ink-700 bg-white border border-ink-300 hover:bg-cream"
 }`}
 >
 {i}
 </button>
 );
 }
 }

 // Show ellipsis if current page is far from end
 if (currentPage < totalPages - 3) {
 pages.push(
 <span key="ellipsis2" className="px-2 py-1 text-sm text-ink-500">
 ...
 </span>
 );
 }

 // Always show last page
 pages.push(
 <button
 key={totalPages}
 onClick={() => handlePagination(totalPages)}
 className={`px-3 py-1 text-sm font-medium rounded-md ${
 currentPage === totalPages
 ? "bg-ink-900 text-white"
 : "text-ink-700 bg-white border border-ink-300 hover:bg-cream"
 }`}
 >
 {totalPages}
 </button>
 );
 }

 return pages;
 })()}

 {/* Next Button */}
 <button
 onClick={() => handlePagination(pagination.page + 1)}
 disabled={!pagination.hasNext}
 className={`px-3 py-1 text-sm font-medium rounded-md ${
 pagination.hasNext
 ? "text-ink-700 bg-white border border-ink-300 hover:bg-cream"
 : "text-ink-400 bg-cream-200 border border-ink-200 cursor-not-allowed"
 }`}
 >
 →
 </button>
 </div>
 </div>
 </div>
 )}
 </div>

 </div>

 {/* Filter Modal */}
 <GenericModal
 isOpen={filterModalOpen}
 onClose={closeFilterModal}
 title="Filter Workers"
 size="large"
 >
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Team
 </label>
 <ReactSelectDropdown
 defaultValue={{
 value: filters.team,
 label:
 filterOptions.teams.find((t) => t.value === filters.team)
 ?.label || "All Teams",
 }}
 onChange={(selected) =>
 handleFilterChange("team", selected?.value)
 }
 options={filterOptions.teams}
 className="w-full"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Department
 </label>
 <ReactSelectDropdown
 defaultValue={{
 value: filters.department,
 label:
 availableDepartments.find(
 (d) => d.value === filters.department
 )?.label || "All Departments",
 }}
 onChange={(selected) =>
 handleFilterChange("department", selected?.value)
 }
 options={availableDepartments}
 className="w-full"
 />
 </div>
 </div>

 <div className="flex justify-between items-center pt-4 border-t border-ink-200">
 <button
 onClick={clearAllFilters}
 className="text-sm text-brick hover:text-brick/80 font-medium"
 >
 Clear All Filters
 </button>

 <div className="flex space-x-3">
 <button
 onClick={closeFilterModal}
 className="px-4 py-2 border border-ink-300 rounded-md text-sm font-medium text-ink-700 bg-white hover:bg-cream focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900/10"
 >
 Cancel
 </button>
 <button
 onClick={applyFilters}
 className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-ink-900 hover:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900/10"
 >
 Apply Filters
 </button>
 </div>
 </div>
 </div>
 </GenericModal>
 </Layout>
 </div>
 );
}
