import { useConfirm } from "../../components/ui/ConfirmDialog";
import { Navigate } from "react-router-dom";
import { getPostLoginPath } from "../../utils/routeObject";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { getDepartmentByUser } from "../../utils/getDepartment";
import { fetchAdminWorkersPage, fetchWorkers, listSuperAdminWorkers } from "../../services/workers";
import { toast } from "react-toastify";
import { getNextSunday } from "../../utils/getDate";
import ReactSelectDropdown from "../ReactSelect";
import Layout from "../Layout";
import { ADMIN_ENUMS } from "../../utils/enums";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import apiRequest from "../../utils/apiClient";
import { teamsAndDepartments } from "../../utils/teams";
import {
 TrashIcon,
 PencilIcon,
 ChevronDownIcon,
 ChevronUpIcon,
 ChevronLeftIcon,
 ChevronRightIcon,
} from "@heroicons/react/24/outline";
import GenericModal from "../GenericModal";
import LoadingState from "../LoadingState";
import WorkerDirectoryTable, { WorkerDetailsGrid, formatWorkerPhone } from "./WorkerDirectoryTable";
import { workerFirstName, workerLastName } from "../../utils/workerSort";
import { getUser } from "../../utils/getUser";
import { getUserRole } from "../../utils/getUserRole";


const PAGE_LIMIT = 20;
const EMPTY_PAGINATION = { page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 0, hasNext: false, hasPrev: false };

export default function ChurchAdminWorkers() {
 const { isChurchAdmin, isSuperAdmin, user } = getUserRole();
 if (!isChurchAdmin && !isSuperAdmin) return <Navigate to={getPostLoginPath(user)} replace />;
 return <ChurchAdminDirectory />;
}

function ChurchAdminDirectory() {
 const navigate = useNavigate();
 const confirm = useConfirm();
 const location = useLocation();
 const queryClient = useQueryClient();
 // All hooks must be called before any conditional returns
 // Set while a delete request is in flight.
 const [isDeleting, setIsDeleting] = useState(false);
 const dateForAttendance = getNextSunday();
 const [filters, setFilters] = useState({
 department: "All",
 team: "All",
 });
 const team = getDepartmentByUser(location.pathname);
 const { isChurchAdmin: isChurchAdminRole, isSuperAdmin: isSuperAdminRole } = getUserRole();
 const isChurchAdmin = isChurchAdminRole || team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
 const isSuperAdmin = isSuperAdminRole || team.department === "Super Admin";
 const isAdminMember = checkAdminStatus(location.pathname);
 const [filterModalOpen, setFilterModalOpen] = useState(false);
 const [filterOptions, setFilterOptions] = useState({
 teams: [],
 departments: [],
 });
 const [searchTerm, setSearchTerm] = useState("");
 const [expandedRows, setExpandedRows] = useState(new Set());
 
 // Debounced search hook
 const { debouncedSearch, search: debouncedSearchTerm } = useDebouncedSearch();

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

 // Initialize filter data on component mount
 useEffect(() => {
 const initializeFilters = () => {
 try {
 // Create teams and departments options from teamsAndDepartments
 const teams = [
 { value: "All", label: "All Teams" },
 ...teamsAndDepartments.map(team => ({
 value: team.team,
 label: team.team
 }))
 ];

 const departments = [
 { value: "All", label: "All Departments" },
 ...teamsAndDepartments.flatMap(team => 
 team.department.map(dept => ({
 value: dept,
 label: dept
 }))
 )
 ];

 setFilterOptions({ teams, departments });
 } catch {
 // Fallback to empty options
 setFilterOptions({ teams: [], departments: [] });
 }
 };

 initializeFilters();
 }, []);

 // One cached query per role, filter, search and page, so going back to a
 // page already seen (e.g. after opening a worker) is instant. Super and
 // Church Admins use the super-admin listing; team admins page on the
 // server; other roles load their department.
 const role = isSuperAdmin || isChurchAdmin ? "directory" : isAdminMember ? "admin" : "member";
 // Any filter or search change starts again from page 1.
 const listKey = JSON.stringify([filters, debouncedSearchTerm]);
 const [pageState, setPageState] = useState({ key: listKey, page: 1 });
 const page = pageState.key === listKey ? pageState.page : 1;
 const setPage = (next) => setPageState({ key: listKey, page: next });

 const {
 data: listData,
 isLoading: isFirstLoad,
 isPlaceholderData,
 error: listError,
 } = useQuery({
 queryKey: [
 "churchAdminWorkers",
 role,
 filters.team,
 filters.department,
 debouncedSearchTerm,
 role === "member" ? null : page,
 dateForAttendance,
 ],
 queryFn: async () => {
 if (role === "directory") {
 return listSuperAdminWorkers({
 page,
 limit: PAGE_LIMIT,
 search: debouncedSearchTerm,
 team: filters.team,
 department: filters.department,
 });
 }
 const user = getUser();
 // Filter out team name from permissions (team name shouldn't be in permissions array)
 const permissions = (user?.permissions ?? []).filter((perm) => perm !== user?.team);
 if (role === "admin") {
 return fetchAdminWorkersPage(filters.team, filters.department, dateForAttendance, permissions, {
 page,
 limit: PAGE_LIMIT,
 search: debouncedSearchTerm,
 });
 }
 return {
 data: await fetchWorkers(filters.department, dateForAttendance, permissions, debouncedSearchTerm),
 pagination: null,
 };
 },
 placeholderData: (prev) => prev,
 });
 const data = listData?.data ?? [];
 const pagination = listData?.pagination ?? EMPTY_PAGINATION;
 const isLoading = isFirstLoad || isPlaceholderData || isDeleting;

 useEffect(() => {
 if (listError) toast.error("Failed to fetch workers");
 }, [listError]);

 const handleSearch = (term) => {
 setSearchTerm(term);
 const normalizedTerm = normalizeSearchTerm(term);
 debouncedSearch(normalizedTerm);
 };

 const clearSearch = () => {
 setSearchTerm("");
 debouncedSearch("");
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

 const clearAllFilters = () => {
 setFilters({
 department: "All",
 team: "All",
 });
 // Reset to all departments when clearing filters
 updateDepartmentsForTeam("All");
 setFilterModalOpen(false);
 };

 const deleteWorker = async (workerId) => {
 if (!workerId) {
 toast.error("Invalid worker ID");
 return;
 }

 // Strong confirmation dialog for deletion
 const confirmed = await confirm({
      title: "Delete worker permanently",
      message: "This removes the worker and all of their records. It cannot be undone.",
      confirmLabel: "Delete worker",
      danger: true,
      requireText: "DELETE",
    });
    if (!confirmed) return;

 setIsDeleting(true);
 try {
 await apiRequest("DELETE", `/api/super/admin/${workerId}/workers`);

 toast.success("Worker deleted successfully");

 // Refresh the data from the first page
 setPage(1);
 queryClient.invalidateQueries({ queryKey: ["churchAdminWorkers"] });
 } catch {
 toast.error("Failed to delete worker");
 } finally {
 setIsDeleting(false);
 }
 };

 const handleEditWorker = (workerId) => {
 navigate(`/worker/${workerId}`);
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

 const handleFilterChange = (filterType, value) => {
 setFilters((prev) => ({
 ...prev,
 [filterType]: value,
 }));
 
 // If team changes, reset department to "All"
 if (filterType === "team") {
 setFilters((prev) => ({
 ...prev,
 department: "All",
 }));
 }
 };

 // Update departments when team changes
 const updateDepartmentsForTeam = (selectedTeam) => {
 if (selectedTeam === "All") {
 // Show all departments
 const allDepartments = [
 { value: "All", label: "All Departments" },
 ...teamsAndDepartments.flatMap(team => 
 team.department.map(dept => ({
 value: dept,
 label: dept
 }))
 )
 ];
 setFilterOptions(prev => ({ ...prev, departments: allDepartments }));
 } else {
 // Show only departments for selected team
 const teamData = teamsAndDepartments.find(team => team.team === selectedTeam);
 const teamDepartments = [
 { value: "All", label: "All Departments" },
 ...(teamData?.department || []).map(dept => ({
 value: dept,
 label: dept
 }))
 ];
 setFilterOptions(prev => ({ ...prev, departments: teamDepartments }));
 }
 };

 // Helper function to split full name into first and last name
 const statsHref = (person) =>
 `/worker/${person.id}/attendance?department=${encodeURIComponent(person.department || "")}&team=${encodeURIComponent(person.team || "")}`;
 const rowLink = (person, text, className) => (
 <Link to={statsHref(person)} onClick={(e) => e.stopPropagation()} className={className}>
 {text}
 </Link>
 );
 const directoryColumns = [
 { key: "id", header: "ID", className: "font-medium text-ink-900", render: (person, idx) => person.id || person.workerid || idx + 1 },
 { key: "firstname", header: "First Name", render: (person) => rowLink(person, workerFirstName(person), "text-ink-900 hover:underline") },
 { key: "lastname", header: "Last Name", render: (person) => rowLink(person, workerLastName(person), "text-ink-900 hover:underline") },
 { key: "phone", header: "Phone Number", render: (person) => formatWorkerPhone(person.phonenumber) },
 { key: "department", header: "Department", render: (person) => person.department },
 { key: "team", header: "Team", render: (person) => person.team },
 { key: "role", header: "Role", render: (person) => rowLink(person, person.workerrole || person.role || "Worker", "text-ink-500 hover:text-ink-900 hover:underline") },
 {
 key: "actions",
 header: "Actions",
 interactive: true,
 className: "text-ink-900",
 render: (person) => {
 const isExpanded = expandedRows.has(person.id);
 return (
 <div className="flex space-x-2">
 <button
 type="button"
 onClick={() => toggleRowExpansion(person.id)}
 className="text-ink-900 hover:text-ink-900"
 title={isExpanded ? "Hide Details" : "View Details"}
 aria-label={isExpanded ? "Hide Details" : "View Details"}
 >
 {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
 </button>
 <button
 type="button"
 onClick={() => handleEditWorker(person.id)}
 className="text-forest hover:text-forest/80"
 title="Edit Worker"
 aria-label="Edit Worker"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 type="button"
 onClick={() => deleteWorker(person.id)}
 className="text-brick hover:text-brick/80"
 title="Delete Worker"
 aria-label="Delete Worker"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 );
 },
 },
 ];

 if (isLoading && data.length === 0) {
 return <LoadingState />;
 }

 return (
 <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
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
 className="bg-forest px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[140px] min-h-touch"
 onClick={() => navigate("/church-admin/add-worker")}
 >
 Add New Worker
 </button>
 <button
 className="bg-ink-500 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[140px] min-h-touch"
 onClick={() => {
 setPage(1);
 queryClient.invalidateQueries({ queryKey: ["churchAdminWorkers"] });
 }}
 >
 Refresh Workers
 </button>
 <button
 className="bg-ink-900 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[140px] min-h-touch hover:bg-ink-800"
 onClick={() => navigate(`/workers/history/${team.department}`)}
 >
 View History
 </button>
 </div>
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
 {(isSuperAdmin || isChurchAdmin) && (
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
 {(isSuperAdmin || isChurchAdmin) && Object.values(filters).some((filter) => filter !== "All") && (
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
 <WorkerDirectoryTable
 columns={directoryColumns}
 rows={Array.isArray(data) ? data : []}
 rowKey={(person, idx) => person.id || person.workerid || `worker-${idx}`}
 getRowHref={statsHref}
 isExpanded={(person) => expandedRows.has(person.id)}
 renderDetails={(person) => (
 <WorkerDetailsGrid
 items={[
 { label: "Other Name", value: person.othername },
 { label: "Email", value: person.email },
 { label: "Birth Date", value: person.birthdate },
 { label: "Gender", value: person.gender },
 { label: "Marital Status", value: person.maritalstatus },
 { label: "Age Range", value: person.agerange },
 { label: "Employment Status", value: person.employment },
 { label: "Occupation", value: person.occupation },
 { label: "Address", value: person.address, wide: true },
 ]}
 />
 )}
 />
 )}
 </div>
 </div>

 {/* Pagination Controls */}
 {pagination.total > 0 && (
 <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-ink-200 sm:px-6">
 <div className="flex-1 flex justify-between sm:hidden">
 <button
 onClick={() => {
 setPage(pagination.page - 1);
 }}
 disabled={!pagination.hasPrev}
 className={`relative inline-flex items-center px-4 py-2 min-h-touch min-w-touch border text-sm font-medium rounded-md ${
 pagination.hasPrev
 ? "bg-white border-ink-300 text-ink-700 hover:bg-cream"
 : "bg-cream-200 border-ink-300 text-ink-400 cursor-not-allowed"
 }`}
 >
 Previous
 </button>
 <button
 onClick={() => {
 setPage(pagination.page + 1);
 }}
 disabled={!pagination.hasNext}
 className={`ml-3 relative inline-flex items-center px-4 py-2 min-h-touch min-w-touch border text-sm font-medium rounded-md ${
 pagination.hasNext
 ? "bg-white border-ink-300 text-ink-700 hover:bg-cream"
 : "bg-cream-200 border-ink-300 text-ink-400 cursor-not-allowed"
 }`}
 >
 Next
 </button>
 </div>
 <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
 <div>
 <p className="text-sm text-ink-700">
 Showing{" "}
 <span className="font-medium">
 {(pagination.page - 1) * pagination.limit + 1}
 </span>{" "}
 to{" "}
 <span className="font-medium">
 {Math.min(
 pagination.page * pagination.limit,
 pagination.total
 )}
 </span>{" "}
 of <span className="font-medium">{pagination.total}</span>{" "}
 results
 </p>
 </div>
 <div>
 <nav
 className="relative z-0 inline-flex rounded-md -space-x-px"
 aria-label="Pagination"
 >
 <button
 onClick={() => {
 setPage(pagination.page - 1);
 }}
 disabled={!pagination.hasPrev}
 className={`relative inline-flex items-center px-2 py-2 min-h-touch min-w-touch rounded-l-md border text-sm font-medium ${
 pagination.hasPrev
 ? "bg-white border-ink-300 text-ink-500 hover:bg-cream"
 : "bg-cream-200 border-ink-300 text-ink-400 cursor-not-allowed"
 }`}
 >
 <span className="sr-only">Previous</span>
 <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
 </button>

 {/* Page numbers */}
 {(() => {
 const currentPage = pagination.page;
 const totalPages = pagination.totalPages;
 const pages = [];

 // Show first page
 if (currentPage > 3) {
 pages.push(1);
 if (currentPage > 4) {
 pages.push("...");
 }
 }

 // Show pages around current page
 for (
 let i = Math.max(1, currentPage - 2);
 i <= Math.min(totalPages, currentPage + 2);
 i++
 ) {
 pages.push(i);
 }

 // Show last page
 if (currentPage < totalPages - 2) {
 if (currentPage < totalPages - 3) {
 pages.push("...");
 }
 pages.push(totalPages);
 }

 return pages.map((page, index) => (
 <button
 key={`${page}-${index}`}
 onClick={() => {
 if (typeof page === "number") {
 setPage(page);
 }
 }}
 className={`relative inline-flex items-center px-4 py-2 min-h-touch min-w-touch border text-sm font-medium ${
 page === currentPage
 ? "z-10 bg-ink-100 border-ink-200 text-ink-900"
 : "bg-white border-ink-300 text-ink-500 hover:bg-cream"
 } ${
 typeof page === "string"
 ? "cursor-default"
 : "cursor-pointer"
 }`}
 disabled={typeof page === "string"}
 >
 {page}
 </button>
 ));
 })()}

 <button
 onClick={() => {
 setPage(pagination.page + 1);
 }}
 disabled={!pagination.hasNext}
 className={`relative inline-flex items-center px-2 py-2 min-h-touch min-w-touch rounded-r-md border text-sm font-medium ${
 pagination.hasNext
 ? "bg-white border-ink-300 text-ink-500 hover:bg-cream"
 : "bg-cream-200 border-ink-300 text-ink-400 cursor-not-allowed"
 }`}
 >
 <span className="sr-only">Next</span>
 <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
 </button>
 </nav>
 </div>
 </div>
 </div>
 )}

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
 value={{
 value: filters.team,
 label:
 filterOptions?.teams?.find((t) => t.value === filters.team)
 ?.label || "All Teams",
 }}
 onChange={(selected) => {
 const val = selected?.value ?? "All";
 handleFilterChange("team", val);
 updateDepartmentsForTeam(val);
 }}
 options={filterOptions?.teams || []}
 className="w-full"
 />
 </div>

 {(filters.team === "Districts" || filters.team === "District") && (
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 District/Sub-team
 </label>
 <ReactSelectDropdown
 value={{
 value: filters.district_sub_team || "All",
 label: filters.district_sub_team || "All District/Sub-teams",
 }}
 onChange={(selected) =>
 handleFilterChange("district_sub_team", selected?.value ?? "All")
 }
 options={[
 { value: "All", label: "All District/Sub-teams" },
 { value: "Pastor Biola Cluster", label: "Pastor Biola Cluster" },
 { value: "Pastor Isaac Cluster", label: "Pastor Isaac Cluster" },
 ]}
 className="w-full"
 />
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Department
 </label>
 <ReactSelectDropdown
 value={{
 value: filters.department,
 label:
 filterOptions?.departments?.find(
 (d) => d.value === filters.department
 )?.label || "All Departments",
 }}
 onChange={(selected) =>
 handleFilterChange("department", selected?.value ?? "All")
 }
 options={filterOptions?.departments || []}
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
 </div>
 </Layout>
 </div>
 );
}
