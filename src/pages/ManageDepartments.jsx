import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import GenericModal from "../components/GenericModal";
import LoadingState from "../components/LoadingState";
import { toast } from "react-toastify";
import {
 fetchDepartments,
 addDepartment,
 updateDepartment,
 toggleDepartmentStatus,
 deleteDepartment,
} from "../services/departments";
import { useDepartmentsContext, useInvalidateDepartments } from "../contexts/DepartmentsContext";
import {
 PencilIcon,
 TrashIcon,
 ArrowUpIcon,
 ArrowDownIcon,
 ChevronDownIcon,
 ChevronRightIcon,
} from "@heroicons/react/24/outline";

export default function ManageDepartments() {
 const navigate = useNavigate();
 const { refetch: refetchDepartmentsContext } = useDepartmentsContext();
 const invalidateDepartments = useInvalidateDepartments();
 const [departments, setDepartments] = useState([]);
 const [isLoading, setIsLoading] = useState(false);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingDepartment, setEditingDepartment] = useState(null);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const hasFetched = useRef(false);
 const [sortConfig, setSortConfig] = useState({
 key: "name",
 direction: "asc",
 });
 // Missing/false = expanded; true = collapsed
 const [collapsedTeams, setCollapsedTeams] = useState({});

 // Form state
 const [formData, setFormData] = useState({
 name: "",
 team: "",
 route: "",
 code: "",
 isactive: true,
 });

 // Get unique team names from API data for dropdown
 const teamOptions = useMemo(() => {
 const teams = departments
 .map((d) => d.team)
 .filter((team) => team && team.trim() !== "");
 return [...new Set(teams)].sort();
 }, [departments]);

 // Check if user is super admin
 useEffect(() => {
 const authUser = JSON.parse(sessionStorage.getItem("authUser"));
 if (!authUser || authUser.department !== "Super Admin") {
 toast.error("Access denied. Super Admin access required.");
 navigate("/login");
 return;
 }
 }, [navigate]);

 // Fetch departments
 const loadDepartments = useCallback(async () => {
 if (isLoading) return;
 setIsLoading(true);
 try {
 const data = await fetchDepartments();
 setDepartments(Array.isArray(data) ? data : []);
 } catch (error) {
 toast.error("Failed to fetch departments");
 } finally {
 setIsLoading(false);
 }
 }, [isLoading]);

 useEffect(() => {
 if (hasFetched.current) return;
 hasFetched.current = true;
 loadDepartments();
 }, [loadDepartments]);

 // Handle form input changes
 const handleInputChange = (e) => {
 const { name, value, type, checked } = e.target;
 setFormData((prev) => ({
 ...prev,
 [name]: type === "checkbox" ? checked : value,
 }));
 };

 // Open modal for adding new department
 const handleAddNew = () => {
 setEditingDepartment(null);
 setFormData({
 name: "",
 team: "",
 route: "",
 code: "",
 isactive: true,
 });
 setIsModalOpen(true);
 };

 // Open modal for editing department
 const handleEdit = (department) => {
 setEditingDepartment(department);
 setFormData({
 name: department.name || "",
 team: department.team || "",
 route: department.route || "",
 code: department.code || "",
 isactive: department.isactive ?? true,
 });
 setIsModalOpen(true);
 };

 // Close modal
 const handleCloseModal = () => {
 setIsModalOpen(false);
 setEditingDepartment(null);
 setFormData({
 name: "",
 team: "",
 route: "",
 code: "",
 isactive: true,
 });
 };

 // Submit form (add or update)
 const handleSubmit = async (e) => {
 e.preventDefault();

 // Validation
 if (!formData.name.trim()) {
 toast.error("Department name is required");
 return;
 }
 if (!formData.team.trim()) {
 toast.error("Team is required");
 return;
 }

 // Auto-derive route from name if not supplied (kebab-case + leading slash)
 const derivedRoute =
 formData.route.trim() ||
 `/${formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;

 const submission = {
 name: formData.name.trim(),
 team: formData.team.trim(),
 route: derivedRoute,
 isactive: formData.isactive,
 };

 if (formData.code && formData.code.trim()) {
 submission.code = formData.code.trim();
 }

 setIsSubmitting(true);
 try {
 if (editingDepartment) {
 // Update existing department
 await updateDepartment({
 id: editingDepartment.id,
 ...submission,
 });
 toast.success("Department updated successfully");
 } else {
 // Add new department
 await addDepartment(submission);
 toast.success("Department added successfully");
 }
 handleCloseModal();
 loadDepartments();
 invalidateDepartments();
 refetchDepartmentsContext();
 } catch (error) {
 toast.error(
 error.message ||
 `Failed to ${editingDepartment ? "update" : "add"} department`
 );
 } finally {
 setIsSubmitting(false);
 }
 };

 // Toggle department status
 const handleToggleStatus = async (department) => {
 const newStatus = !department.isactive;
 const action = newStatus ? "enable" : "disable";

 if (
 !window.confirm(
 `Are you sure you want to ${action} "${department.name}"?`
 )
 ) {
 return;
 }

 setIsLoading(true);
 try {
 await toggleDepartmentStatus(department.id, newStatus);
 toast.success(
 `Department ${newStatus ? "enabled" : "disabled"} successfully`
 );
 loadDepartments();
 invalidateDepartments();
 refetchDepartmentsContext();
 } catch (error) {
 toast.error(`Failed to ${action} department: ${error.message}`);
 } finally {
 setIsLoading(false);
 }
 };

 // Delete department
 const handleDelete = async (department) => {
 if (
 !window.confirm(
 `Are you sure you want to delete "${department.name}"? This action cannot be undone.`
 )
 ) {
 return;
 }

 setIsLoading(true);
 try {
 await deleteDepartment(department.id);
 toast.success("Department deleted successfully");
 loadDepartments();
 invalidateDepartments();
 refetchDepartmentsContext();
 } catch (error) {
 toast.error(`Failed to delete department: ${error.message}`);
 } finally {
 setIsLoading(false);
 }
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

 // Sorted departments (within each team group)
 const sortedDepartments = useMemo(() => {
 const items = Array.isArray(departments) ? [...departments] : [];

 if (!sortConfig.key) {
 return items;
 }

 return items.sort((a, b) => {
 let aValue = a[sortConfig.key];
 let bValue = b[sortConfig.key];

 // Handle boolean for isactive
 if (sortConfig.key === "isactive") {
 aValue = aValue ? 1 : 0;
 bValue = bValue ? 1 : 0;
 return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
 }

 if (aValue === null || aValue === undefined || aValue === "") return 1;
 if (bValue === null || bValue === undefined || bValue === "") return -1;

 // Handle numeric sorting for IDs and numbers
 const numA = Number(aValue);
 const numB = Number(bValue);
 if (!isNaN(numA) && !isNaN(numB) && (sortConfig.key === "id" || typeof aValue === "number" || typeof bValue === "number")) {
 return sortConfig.direction === "asc" ? numA - numB : numB - numA;
 }

 const aStr = String(aValue).toLowerCase();
 const bStr = String(bValue).toLowerCase();

 if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
 if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
 return 0;
 });
 }, [departments, sortConfig]);

 // Group departments by team (alphabetical team order; Unassigned last)
 const groupedByTeam = useMemo(() => {
 const groups = {};
 sortedDepartments.forEach((department) => {
 const team =
 department.team && String(department.team).trim()
 ? String(department.team).trim()
 : "Unassigned";
 if (!groups[team]) groups[team] = [];
 groups[team].push(department);
 });
 const teamNames = Object.keys(groups).sort((a, b) => {
 if (a === "Unassigned") return 1;
 if (b === "Unassigned") return -1;
 return a.localeCompare(b);
 });
 return teamNames.map((team) => ({ team, departments: groups[team] }));
 }, [sortedDepartments]);

 const toggleTeamCollapse = (team) => {
 setCollapsedTeams((prev) => ({ ...prev, [team]: !prev[team] }));
 };

 return (
 <div className="min-h-screen bg-cream">
 <Header />
 <Layout>
 <div>
 <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
 <div>
 <div className="qc-eyebrow">Super Admin</div>
 <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
 Departments
 </h1>
 <p className="mt-1 text-sm text-ink-500">
 Manage all departments in the system, grouped by team.
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 className="qc-btn-primary"
 onClick={handleAddNew}
 disabled={isLoading}
 >
 Add department
 </button>
 <button
 type="button"
 className="qc-btn-ghost"
 onClick={loadDepartments}
 disabled={isLoading}
 >
 Refresh
 </button>
 </div>
 </div>

 {/* Table Section */}
 <div>
 <div className="qc-card overflow-hidden">
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
 onClick={() => handleSort("route")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Route</span>
 {getSortIcon("route")}
 </button>
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <button
 onClick={() => handleSort("code")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Code</span>
 {getSortIcon("code")}
 </button>
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 <button
 onClick={() => handleSort("isactive")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Status</span>
 {getSortIcon("isactive")}
 </button>
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-ink-200">
 {groupedByTeam.map((group) => (
 <Fragment key={group.team}>
 <tr
 className="bg-cream-200 cursor-pointer select-none hover:bg-ink-200 transition-colors"
 onClick={() => toggleTeamCollapse(group.team)}
 >
 <td
 colSpan="6"
 className="px-6 py-2 text-sm font-semibold text-ink-700"
 >
 <div className="flex items-center">
 {collapsedTeams[group.team] ? (
 <ChevronRightIcon className="h-4 w-4 mr-2 text-ink-500" />
 ) : (
 <ChevronDownIcon className="h-4 w-4 mr-2 text-ink-500" />
 )}
 {group.team}
 <span className="ml-2 text-xs font-normal text-ink-500">
 ({group.departments.length} department
 {group.departments.length !== 1 ? "s" : ""})
 </span>
 </div>
 </td>
 </tr>
 {!collapsedTeams[group.team] &&
 group.departments.map((department) => (
 <tr key={department.id} className="hover:bg-cream">
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink-900">
 {department.id}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {department.name}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {department.route}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {department.code}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm">
 <span
 className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
 department.isactive
 ? "bg-forest/10 text-forest"
 : "bg-brick/10 text-brick"
 }`}
 >
 {department.isactive ? "Active" : "Inactive"}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 <div className="flex space-x-2">
 <button
 onClick={() => handleEdit(department)}
 className="text-ink-900 hover:text-ink-900"
 title="Edit"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleToggleStatus(department)}
 disabled={isLoading}
 className={`px-3 py-1 text-xs font-medium rounded ${
 department.isactive
 ? "bg-brick/10 text-brick hover:bg-brick/20"
 : "bg-forest/10 text-forest hover:bg-forest/20"
 } disabled:opacity-50`}
 >
 {department.isactive ? "Disable" : "Enable"}
 </button>
 <button
 onClick={() => handleDelete(department)}
 disabled={isLoading}
 className="text-brick hover:text-brick/80 disabled:opacity-50"
 title="Delete"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </Fragment>
 ))}

 {groupedByTeam.length === 0 && (
 <tr>
 <td
 colSpan="6"
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
 d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
 />
 </svg>
 <p className="text-lg font-medium text-ink-900 mb-2">
 No departments found
 </p>
 <p className="text-sm text-ink-500">
 Click "Add Department" to create one.
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
 </div>
 </Layout>

 {/* Add/Edit Modal */}
 <GenericModal
 isOpen={isModalOpen}
 onClose={handleCloseModal}
 title={editingDepartment ? "Edit Department" : "Add Department"}
 size="medium"
 >
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label
 htmlFor="name"
 className="block text-sm font-medium text-ink-700"
 >
 Department Name *
 </label>
 <input
 type="text"
 id="name"
 name="name"
 value={formData.name}
 onChange={handleInputChange}
 className="mt-1 block w-full rounded-md border-ink-300 focus:border-ink-900 focus:ring-ink-900/10 sm:text-sm border px-3 py-2"
 placeholder="Enter department name"
 />
 </div>

 <div>
 <label
 htmlFor="team"
 className="block text-sm font-medium text-ink-700"
 >
 Team *
 </label>
 <input
 type="text"
 id="team"
 name="team"
 list="team-options"
 value={formData.team}
 onChange={handleInputChange}
 className="mt-1 block w-full rounded-md border-ink-300 focus:border-ink-900 focus:ring-ink-900/10 sm:text-sm border px-3 py-2"
 placeholder="Enter or select a team"
 />
 <datalist id="team-options">
 {teamOptions.map((team) => (
 <option key={team} value={team} />
 ))}
 </datalist>
 </div>

 <div>
 <label
 htmlFor="route"
 className="block text-sm font-medium text-ink-700"
 >
 Route *
 </label>
 <input
 type="text"
 id="route"
 name="route"
 value={formData.route}
 onChange={handleInputChange}
 className="mt-1 block w-full rounded-md border-ink-300 focus:border-ink-900 focus:ring-ink-900/10 sm:text-sm border px-3 py-2"
 placeholder="/route-path"
 />
 </div>

 <div>
 <label
 htmlFor="code"
 className="block text-sm font-medium text-ink-700"
 >
 Code (Optional)
 </label>
 <input
 type="text"
 id="code"
 name="code"
 value={formData.code}
 onChange={handleInputChange}
 className="mt-1 block w-full rounded-md border-ink-300 focus:border-ink-900 focus:ring-ink-900/10 sm:text-sm border px-3 py-2"
 placeholder="dept-code"
 />
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="isactive"
 name="isactive"
 checked={formData.isactive}
 onChange={handleInputChange}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 <label
 htmlFor="isactive"
 className="ml-2 block text-sm text-ink-700"
 >
 Active
 </label>
 </div>

 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={handleCloseModal}
 className="px-4 py-2 text-sm font-medium text-ink-700 bg-cream-200 rounded-md hover:bg-ink-200"
 disabled={isSubmitting}
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 text-sm font-medium text-white bg-ink-900 rounded-md hover:bg-ink-800 disabled:opacity-50"
 disabled={isSubmitting}
 >
 {isSubmitting
 ? "Saving..."
 : editingDepartment
 ? "Update"
 : "Add"}
 </button>
 </div>
 </form>
 </GenericModal>
 </div>
 );
}
