import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import LoadingState from "../components/LoadingState";
import { 
 EyeIcon, 
 ArrowUpIcon, 
 ArrowDownIcon,
 WrenchScrewdriverIcon,
 CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { teamsAndDepartments, normalizeWorkerRole } from "../utils/teams";
import apiRequest from "../utils/apiClient";

/**
 * Normalize a department name so API variants like "Pastoral leader"
 * match the canonical config value "Pastoral Leaders".
 */
const normDept = (d) => normalizeWorkerRole(d) ?? d;

// Check if a worker has a team-department mismatch
const isMismatched = (worker) => {
 if (!worker.team || !worker.department) return false;
 const teamConfig = teamsAndDepartments.find(t => t.team === worker.team);
 if (!teamConfig) return true; // Unknown team is a mismatch
 const normalized = normDept(worker.department);
 return !teamConfig.department.some(d => normDept(d) === normalized);
};

// Get the suggested team based on the department
const getSuggestedTeam = (department) => {
 if (!department) return null;
 const normalized = normDept(department);
 const match = teamsAndDepartments.find(t =>
 t.department.some(d => normDept(d) === normalized)
 );
 return match?.team || null;
};

export default function TeamMismatch() {
 const navigate = useNavigate();
 const [allWorkers, setAllWorkers] = useState([]);
 const [mismatchedWorkers, setMismatchedWorkers] = useState([]);
 const [isLoading, setIsLoading] = useState(false);
 const [isFixing, setIsFixing] = useState(false);
 const [selectedWorkers, setSelectedWorkers] = useState(new Set());
 const [isSelectAll, setIsSelectAll] = useState(false);

 // Column filters state
 const [columnFilters, setColumnFilters] = useState({
 id: "",
 name: "",
 team: "",
 department: "",
 suggestedTeam: "",
 });

 // Sorting state
 const [sortConfig, setSortConfig] = useState({
 key: null,
 direction: "asc",
 });

 // Check if user is super admin
 useEffect(() => {
 const authUser = JSON.parse(sessionStorage.getItem("authUser"));
 if (!authUser || authUser.department !== "Super Admin") {
 toast.error("Access denied. Super Admin access required.");
 navigate("/login");
 return;
 }
 }, [navigate]);

 // Fetch all workers and filter mismatched ones
 const fetchAllWorkers = async () => {
 setIsLoading(true);
 try {
 const result = await apiRequest("GET", "/api/super/admin/workers", {
 limit: 10000,
 });

 // Handle different response structures
 let workersData = [];
 if (result.data && result.data.data && Array.isArray(result.data.data)) {
 workersData = result.data.data;
 } else if (result.data && Array.isArray(result.data)) {
 workersData = result.data;
 } else if (Array.isArray(result)) {
 workersData = result;
 }

 setAllWorkers(workersData);

 // Filter to only mismatched workers
 const mismatched = workersData.filter(isMismatched);
 setMismatchedWorkers(mismatched);
 } catch (error) {
 toast.error("Failed to fetch workers");
 setAllWorkers([]);
 setMismatchedWorkers([]);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchAllWorkers();
 }, []);

 // Fix a single worker's team
 const fixWorkerTeam = async (worker) => {
 const suggestedTeam = getSuggestedTeam(worker.department);
 if (!suggestedTeam) {
 toast.error(`Cannot determine correct team for department: ${worker.department}`);
 return;
 }

 setIsFixing(true);
 try {
 await apiRequest("PUT", "/api/super/admin/workers", {
 id: parseInt(worker.id),
 team: suggestedTeam,
 });

 toast.success(`Fixed team for ${worker.firstname} ${worker.lastname}`);
 fetchAllWorkers();
 clearSelection();
 } catch (error) {
 toast.error(`Failed to fix worker: ${error.message}`);
 } finally {
 setIsFixing(false);
 }
 };

 // Bulk fix selected workers
 const bulkFixWorkers = async () => {
 if (selectedWorkers.size === 0) {
 toast.error("No workers selected");
 return;
 }

 const confirmMessage = `Are you sure you want to fix the team assignment for ${selectedWorkers.size} worker(s)?`;
 if (!window.confirm(confirmMessage)) return;

 setIsFixing(true);
 try {
 let successCount = 0;
 let errorCount = 0;

 for (const workerId of selectedWorkers) {
 const worker = mismatchedWorkers.find(w => w.id === workerId);
 if (!worker) continue;

 const suggestedTeam = getSuggestedTeam(worker.department);
 if (!suggestedTeam) {
 errorCount++;
 continue;
 }

 try {
 await apiRequest("PUT", "/api/super/admin/workers", {
 id: parseInt(workerId),
 team: suggestedTeam,
 });
 successCount++;
 } catch (error) {
 errorCount++;
 }
 }

 if (successCount > 0) {
 toast.success(`Fixed ${successCount} worker(s) successfully`);
 }
 if (errorCount > 0) {
 toast.error(`Failed to fix ${errorCount} worker(s)`);
 }

 fetchAllWorkers();
 clearSelection();
 } catch (error) {
 toast.error(`Failed to fix workers: ${error.message}`);
 } finally {
 setIsFixing(false);
 }
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
 setIsSelectAll(newSelectedWorkers.size === filteredWorkers.length && filteredWorkers.length > 0);
 };

 const handleSelectAll = () => {
 if (isSelectAll) {
 setSelectedWorkers(new Set());
 setIsSelectAll(false);
 } else {
 const allWorkerIds = new Set(filteredWorkers.map(worker => worker.id));
 setSelectedWorkers(allWorkerIds);
 setIsSelectAll(true);
 }
 };

 const clearSelection = () => {
 setSelectedWorkers(new Set());
 setIsSelectAll(false);
 };

 // Handle filter input change
 const handleFilterChange = (column, value) => {
 setColumnFilters((prev) => ({
 ...prev,
 [column]: value,
 }));
 };

 // Handle column sorting
 const handleSort = (columnKey) => {
 setSortConfig((prevConfig) => {
 if (prevConfig.key === columnKey) {
 return {
 key: columnKey,
 direction: prevConfig.direction === "asc" ? "desc" : "asc",
 };
 } else {
 return {
 key: columnKey,
 direction: "asc",
 };
 }
 });
 };

 // Get sort icon for a column
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

 // Apply filters and sorting
 const filteredWorkers = useMemo(() => {
 let filtered = [...mismatchedWorkers];

 // Apply each column filter
 Object.entries(columnFilters).forEach(([column, filterValue]) => {
 if (filterValue && filterValue.trim() !== "") {
 const searchTerm = filterValue.toLowerCase().trim();
 filtered = filtered.filter((worker) => {
 let cellValue;
 if (column === "name") {
 cellValue = `${worker.firstname || ""} ${worker.lastname || ""}`;
 } else if (column === "suggestedTeam") {
 cellValue = getSuggestedTeam(worker.department) || "";
 } else {
 cellValue = worker[column];
 }
 if (cellValue === null || cellValue === undefined) {
 return false;
 }
 return String(cellValue).toLowerCase().includes(searchTerm);
 });
 }
 });

 // Apply sorting
 if (sortConfig.key) {
 filtered.sort((a, b) => {
 let aValue, bValue;

 if (sortConfig.key === "name") {
 aValue = `${a.firstname || ""} ${a.lastname || ""}`;
 bValue = `${b.firstname || ""} ${b.lastname || ""}`;
 } else if (sortConfig.key === "suggestedTeam") {
 aValue = getSuggestedTeam(a.department) || "";
 bValue = getSuggestedTeam(b.department) || "";
 } else {
 aValue = a[sortConfig.key];
 bValue = b[sortConfig.key];
 }

 // Handle null/undefined values
 if (aValue === null || aValue === undefined) return 1;
 if (bValue === null || bValue === undefined) return -1;

 // Convert to string for comparison
 const aStr = String(aValue).toLowerCase();
 const bStr = String(bValue).toLowerCase();

 // Try numeric comparison first
 const aNum = Number(aValue);
 const bNum = Number(bValue);
 if (!isNaN(aNum) && !isNaN(bNum)) {
 return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
 }

 // String comparison
 if (aStr < bStr) {
 return sortConfig.direction === "asc" ? -1 : 1;
 }
 if (aStr > bStr) {
 return sortConfig.direction === "asc" ? 1 : -1;
 }
 return 0;
 });
 }

 return filtered;
 }, [mismatchedWorkers, columnFilters, sortConfig]);

 return (
 <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
 <Header />
 <Layout>
 <div>
 {/* Header Section */}
 <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
 <div className="flex-1">
 <h1 className="text-lg sm:text-xl font-semibold text-ink-900">
 Team Mismatch Management
 </h1>
 <p className="text-sm text-ink-500 mt-1">
 Workers whose department doesn't match their assigned team
 </p>
 </div>
 <div className="flex space-x-2">
 <button
 onClick={fetchAllWorkers}
 disabled={isLoading}
 className="bg-ink-900 hover:bg-ink-900 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
 >
 Refresh
 </button>
 </div>
 </div>

 {/* Summary Alert */}
 {!isLoading && (
 <div className={`mb-6 p-4 rounded-lg border ${
 mismatchedWorkers.length > 0 
 ? "bg-mustard/10 border-mustard/30" 
 : "bg-forest/10 border-forest/30"
 }`}>
 <div className="flex items-center">
 {mismatchedWorkers.length > 0 ? (
 <>
 <WrenchScrewdriverIcon className="h-5 w-5 text-mustard mr-2" />
 <span className="text-mustard font-medium">
 {mismatchedWorkers.length} worker(s) with team mismatches found
 </span>
 <span className="text-mustard ml-2">
 (showing {filteredWorkers.length} after filters)
 </span>
 </>
 ) : (
 <>
 <CheckCircleIcon className="h-5 w-5 text-forest mr-2" />
 <span className="text-forest font-medium">
 No team mismatches found! All workers are correctly assigned.
 </span>
 </>
 )}
 </div>
 </div>
 )}

 {/* Bulk Actions */}
 {selectedWorkers.size > 0 && (
 <div className="mb-4 p-4 bg-ink-100 border border-ink-200 rounded-lg">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-4">
 <span className="text-sm font-medium text-ink-900">
 {selectedWorkers.size} worker(s) selected
 </span>
 <button
 onClick={clearSelection}
 className="text-sm text-ink-900 hover:text-ink-900 font-medium"
 >
 Clear Selection
 </button>
 </div>
 <button
 onClick={bulkFixWorkers}
 disabled={isFixing}
 className="bg-forest px-4 py-2 text-white rounded-lg text-sm font-medium hover:bg-forest/80 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isFixing ? "Fixing..." : `Fix Selected (${selectedWorkers.size})`}
 </button>
 </div>
 </div>
 )}

 {/* Table Section */}
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
 <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <input
 type="checkbox"
 checked={isSelectAll}
 onChange={handleSelectAll}
 disabled={filteredWorkers.length === 0}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 </th>
 <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <div className="flex flex-col">
 <button
 onClick={() => handleSort("id")}
 className="flex items-center justify-start mb-2 hover:text-ink-700 cursor-pointer"
 >
 <span>ID</span>
 {getSortIcon("id")}
 </button>
 <input
 type="text"
 value={columnFilters.id}
 onChange={(e) => handleFilterChange("id", e.target.value)}
 placeholder="Filter..."
 className="px-2 py-1 text-xs border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-ink-900/10 w-20"
 onClick={(e) => e.stopPropagation()}
 />
 </div>
 </th>
 <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <div className="flex flex-col">
 <button
 onClick={() => handleSort("name")}
 className="flex items-center justify-start mb-2 hover:text-ink-700 cursor-pointer"
 >
 <span>Name</span>
 {getSortIcon("name")}
 </button>
 <input
 type="text"
 value={columnFilters.name}
 onChange={(e) => handleFilterChange("name", e.target.value)}
 placeholder="Filter name..."
 className="px-2 py-1 text-xs border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 onClick={(e) => e.stopPropagation()}
 />
 </div>
 </th>
 <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <div className="flex flex-col">
 <button
 onClick={() => handleSort("team")}
 className="flex items-center justify-start mb-2 hover:text-ink-700 cursor-pointer"
 >
 <span>Current Team</span>
 {getSortIcon("team")}
 </button>
 <input
 type="text"
 value={columnFilters.team}
 onChange={(e) => handleFilterChange("team", e.target.value)}
 placeholder="Filter team..."
 className="px-2 py-1 text-xs border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 onClick={(e) => e.stopPropagation()}
 />
 </div>
 </th>
 <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <div className="flex flex-col">
 <button
 onClick={() => handleSort("department")}
 className="flex items-center justify-start mb-2 hover:text-ink-700 cursor-pointer"
 >
 <span>Department</span>
 {getSortIcon("department")}
 </button>
 <input
 type="text"
 value={columnFilters.department}
 onChange={(e) => handleFilterChange("department", e.target.value)}
 placeholder="Filter dept..."
 className="px-2 py-1 text-xs border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 onClick={(e) => e.stopPropagation()}
 />
 </div>
 </th>
 <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <div className="flex flex-col">
 <button
 onClick={() => handleSort("suggestedTeam")}
 className="flex items-center justify-start mb-2 hover:text-ink-700 cursor-pointer"
 >
 <span>Suggested Team</span>
 {getSortIcon("suggestedTeam")}
 </button>
 <input
 type="text"
 value={columnFilters.suggestedTeam}
 onChange={(e) => handleFilterChange("suggestedTeam", e.target.value)}
 placeholder="Filter..."
 className="px-2 py-1 text-xs border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 onClick={(e) => e.stopPropagation()}
 />
 </div>
 </th>
 <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-ink-200">
 {filteredWorkers.length > 0 ? (
 filteredWorkers.map((worker, idx) => {
 const suggestedTeam = getSuggestedTeam(worker.department);
 return (
 <tr key={worker.id || idx} className="hover:bg-cream">
 <td className="px-4 py-3 whitespace-nowrap">
 <input
 type="checkbox"
 checked={selectedWorkers.has(worker.id)}
 onChange={() => handleSelectWorker(worker.id)}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 </td>
 <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-ink-900">
 {worker.id || worker.workerid || idx + 1}
 </td>
 <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-900">
 {worker.firstname} {worker.lastname}
 </td>
 <td className="px-4 py-3 whitespace-nowrap text-sm">
 <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-brick/10 text-brick">
 {worker.team || "N/A"}
 </span>
 </td>
 <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-900">
 {worker.department || "N/A"}
 </td>
 <td className="px-4 py-3 whitespace-nowrap text-sm">
 {suggestedTeam ? (
 <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-forest/10 text-forest">
 {suggestedTeam}
 </span>
 ) : (
 <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-cream-200 text-ink-800">
 Unknown
 </span>
 )}
 </td>
 <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-900">
 <div className="flex space-x-2">
 <button
 onClick={() => fixWorkerTeam(worker)}
 disabled={isFixing || !suggestedTeam}
 className="text-forest hover:text-forest/80 disabled:opacity-50 disabled:cursor-not-allowed"
 title="Fix Team"
 >
 <WrenchScrewdriverIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => navigate(`/worker/${worker.id}?from=team-mismatch`)}
 className="text-ink-900 hover:text-ink-900"
 title="View/Edit Details"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 );
 })
 ) : (
 <tr>
 <td
 colSpan="7"
 className="px-6 py-8 text-center text-ink-500"
 >
 <div className="flex flex-col items-center">
 {mismatchedWorkers.length === 0 ? (
 <>
 <CheckCircleIcon className="w-12 h-12 text-forest mb-4" />
 <p className="text-lg font-medium text-ink-900 mb-2">
 All Clear!
 </p>
 <p className="text-sm text-ink-500">
 No team mismatches detected in the system.
 </p>
 </>
 ) : (
 <>
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
 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
 />
 </svg>
 <p className="text-lg font-medium text-ink-900 mb-2">
 No workers match the current filters
 </p>
 <p className="text-sm text-ink-500">
 Try adjusting your filter criteria.
 </p>
 </>
 )}
 </div>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Results count */}
 {!isLoading && filteredWorkers.length > 0 && (
 <div className="mt-4 text-sm text-ink-500">
 Showing {filteredWorkers.length} of {mismatchedWorkers.length} mismatched workers
 (out of {allWorkers.length} total workers)
 </div>
 )}
 </div>
 </Layout>
 </div>
 );
}
