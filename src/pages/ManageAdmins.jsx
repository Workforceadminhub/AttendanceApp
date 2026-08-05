import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import Header from "../components/Header";
import Layout from "../components/Layout";
import GenericModal from "../components/GenericModal";
import LoadingState from "../components/LoadingState";
import { toast } from "react-toastify";
import {
 fetchAdmins,
 createAdmin,
 updateAdmin,
 deleteAdmin,
 inviteAdminByEmail,
 assignAccessByEmail,
} from "../services/admins";
import { fetchDepartments } from "../services/departments";
import {
 getEffectiveRouteList,
 getTeamForDepartment,
 resolveAdminRoute,
 registerAdminRoute,
} from "../utils/routeObject";
import { useInvalidateDepartments } from "../contexts/DepartmentsContext";
import {
 TrashIcon,
 ArrowUpIcon,
 ArrowDownIcon,
 PencilSquareIcon,
 ChevronDownIcon,
 ChevronRightIcon,
 UserCircleIcon,
 EnvelopeIcon,
} from "@heroicons/react/24/outline";

const selectStyles = {
 control: (base, state) => ({
 ...base,
 borderRadius: "0.375rem",
 borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
 boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
 "&:hover": { borderColor: state.isFocused ? "#3b82f6" : "#9ca3af" },
 minHeight: "38px",
 fontSize: "0.875rem",
 }),
 menu: (base) => ({
 ...base,
 zIndex: 999999,
 borderRadius: "0.375rem",
 boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
 }),
 menuList: (base) => ({ ...base, maxHeight: "180px", padding: "4px" }),
 option: (base, { isFocused, isSelected }) => ({
 ...base,
 backgroundColor: isSelected ? "#3b82f6" : isFocused ? "#eff6ff" : "white",
 color: isSelected ? "white" : "#111827",
 borderRadius: "0.25rem",
 cursor: "pointer",
 fontSize: "0.875rem",
 }),
 singleValue: (base) => ({ ...base, fontSize: "0.875rem" }),
 placeholder: (base) => ({ ...base, fontSize: "0.875rem", color: "#9ca3af" }),
};

const ROLE_OPTIONS = [
 { label: "HOD", value: "HOD" },
 { label: "Sub Team Admin", value: "sub-team-admin" },
 { label: "Admin", value: "admin" },
 { label: "Super Admin", value: "super-admin" },
 { label: "Church Admin", value: "church-admin" },
 { label: "Workforce Admin", value: "wf-admin" },
];

export default function ManageAdmins() {
 const navigate = useNavigate();
 const invalidateDepartments = useInvalidateDepartments();
 const [admins, setAdmins] = useState([]);
 const [departments, setDepartments] = useState([]);
 const [isLoading, setIsLoading] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const hasFetched = useRef(false);

 // Modal states
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [selectedAdmin, setSelectedAdmin] = useState(null);
 const [viewPermissionsAdmin, setViewPermissionsAdmin] = useState(null);
 const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);
 const [assignRoleAdmin, setAssignRoleAdmin] = useState(null);
 const [assignRoleRole, setAssignRoleRole] = useState("");

 // Email RBAC modal: "invite" (temp password + email) or "access" (upsert access only)
 const [emailModalMode, setEmailModalMode] = useState(null);
 const [emailFormData, setEmailFormData] = useState({
 email: "",
 role: "",
 department: "",
 team: [],
 permissions: [],
 isactive: true,
 });

 // Sorting
 const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

 // Collapsed team groups (true = collapsed, default all collapsed)
 const [collapsedTeams, setCollapsedTeams] = useState(null);

 // Add admin form (route is derived on submit — not stored in form state)
 const [formData, setFormData] = useState({
 code: "",
 role: "",
 department: "",
 team: [],
 permissions: [],
 });
 const [includeRole, setIncludeRole] = useState(false);

 // Edit admin form
 const [editFormData, setEditFormData] = useState({
 code: "",
 role: "",
 route: "",
 department: "",
 team: [],
 permissions: [],
 });
 const [updateRole, setUpdateRole] = useState(false);

 // Get unique team names from departments data
 const teamOptions = useMemo(() => {
 const teams = departments
 .map((d) => d.team)
 .filter((team) => team && team.trim() !== "");
 return [...new Set(teams)].sort();
 }, [departments]);

 const departmentOptions = useMemo(() => {
 const names = [
 ...new Set(
 getEffectiveRouteList()
 .map((item) => item.department)
 .filter(Boolean)
 ),
 ].sort((a, b) => a.localeCompare(b));
 return names.map((name) => ({ value: name, label: name }));
 }, []);

 const landingRoute = useMemo(
 () =>
 resolveAdminRoute({
 role: includeRole ? formData.role : undefined,
 department: formData.department,
 team: formData.team,
 }),
 [formData.department, formData.team, formData.role, includeRole]
 );

 // Group departments by team for permissions UI
 const permissionsByTeam = useMemo(() => {
 const groups = {};
 getEffectiveRouteList().forEach((item) => {
 if (!groups[item.team]) groups[item.team] = [];
 groups[item.team].push(item.department);
 });
 // Sort teams alphabetically, sort departments within each team
 return Object.keys(groups)
 .sort()
 .map((team) => ({ team, departments: groups[team].sort() }));
 }, [departments]);

 // All department names from routeObject for "Check All" across all teams
 const allPermissionDepts = useMemo(
 () => permissionsByTeam.flatMap((g) => g.departments),
 [permissionsByTeam]
 );

 const [collapsedPermTeams, setCollapsedPermTeams] = useState({});

 // Default all permission teams (in add/edit modals) to collapsed on first load
 useEffect(() => {
 setCollapsedPermTeams((prev) => {
 // If we've already initialized (or user has toggled), keep existing state
 if (prev && Object.keys(prev).length > 0) return prev;

 const initial = {};
 permissionsByTeam.forEach((group) => {
 initial[group.team] = true;
 });
 return initial;
 });
 }, [permissionsByTeam]);

 const togglePermTeamCollapse = (team) => {
 setCollapsedPermTeams((prev) => ({ ...prev, [team]: !prev[team] }));
 };

 // Check if user is super admin
 useEffect(() => {
 const authUser = JSON.parse(sessionStorage.getItem("authUser"));
 if (!authUser || authUser.department !== "Super Admin") {
 toast.error("Access denied. Super Admin access required.");
 navigate("/login");
 return;
 }
 }, [navigate]);

 // Fetch admins and departments
 const loadAdmins = useCallback(async () => {
 if (isLoading) return;
 setIsLoading(true);
 try {
 const data = await fetchAdmins();
 setAdmins(Array.isArray(data) ? data : []);
 } catch (error) {
 toast.error("Failed to fetch admins");
 } finally {
 setIsLoading(false);
 }
 }, [isLoading]);

 const loadDepartments = useCallback(async () => {
 try {
 const data = await fetchDepartments();
 setDepartments(Array.isArray(data) ? data : []);
 } catch (error) {
 // Silent fail - departments are for dropdown options
 }
 }, []);

 useEffect(() => {
 if (hasFetched.current) return;
 hasFetched.current = true;
 loadAdmins();
 loadDepartments();
 }, [loadAdmins, loadDepartments]);

 // Form handlers
 const handleInputChange = (e) => {
 const { name, value } = e.target;
 setFormData((prev) => ({ ...prev, [name]: value }));
 };

 const handlePermissionToggle = (permission) => {
 setFormData((prev) => ({
 ...prev,
 permissions: prev.permissions.includes(permission)
 ? prev.permissions.filter((p) => p !== permission)
 : [...prev.permissions, permission],
 }));
 };

 const handleEditPermissionToggle = (permission) => {
 setEditFormData((prev) => ({
 ...prev,
 permissions: prev.permissions.includes(permission)
 ? prev.permissions.filter((p) => p !== permission)
 : [...prev.permissions, permission],
 }));
 };

 // Add admin
 const handleOpenAddModal = () => {
 setFormData({
 code: "",
 role: "",
 department: "",
 team: [],
 permissions: [],
 });
 setIncludeRole(false);
 setIsAddModalOpen(true);
 };

 const handleAddSubmit = async (e) => {
 e.preventDefault();
 if (!formData.code.trim()) {
 toast.error("Admin code is required");
 return;
 }
 if (!formData.department.trim()) {
 toast.error("Department is required");
 return;
 }
 if (!formData.team.length) {
 toast.error("Team is required");
 return;
 }
 if (includeRole && !formData.role) {
 toast.error("Please select a role");
 return;
 }
 if (!landingRoute) {
 toast.error(
 "Could not determine a landing route. Pick a known department and matching team."
 );
 return;
 }

 setIsSubmitting(true);
 try {
 const adminData = {
 code: formData.code.trim(),
 department: formData.department.trim(),
 team: formData.team.join(", "),
 route: landingRoute,
 permissions: formData.permissions,
 ...(includeRole && formData.role ? { role: formData.role } : {}),
 };
 await createAdmin(adminData);
 registerAdminRoute({
 department: adminData.department,
 route: adminData.route,
 team: adminData.team,
 });
 toast.success("Admin created successfully");
 invalidateDepartments();
 setIsAddModalOpen(false);
 loadAdmins();
 } catch (error) {
 toast.error(error.message || "Failed to create admin");
 } finally {
 setIsSubmitting(false);
 }
 };

 // Edit admin
 const handleOpenEditModal = (admin) => {
 setSelectedAdmin(admin);
 // Parse team — could be a comma-separated string or array
 let teamArr = [];
 if (Array.isArray(admin.team)) {
 teamArr = admin.team;
 } else if (typeof admin.team === "string" && admin.team.trim()) {
 teamArr = admin.team.split(",").map((t) => t.trim()).filter(Boolean);
 }
 setEditFormData({
 code: admin.code || "",
 role: admin.role || "",
 route: admin.route || "",
 department: admin.department || "",
 team: teamArr,
 permissions: Array.isArray(admin.permissions) ? [...admin.permissions] : [],
 });
 setUpdateRole(false);
 setIsEditModalOpen(true);
 };

 // Quick "Assign Role" action – opens dedicated modal with only role field
 const handleAssignRole = (admin) => {
 setAssignRoleAdmin(admin);
 setAssignRoleRole(admin.role || "");
 setIsAssignRoleModalOpen(true);
 };

 const handleAssignRoleSubmit = async (e) => {
 e.preventDefault();
 if (!assignRoleAdmin) return;

 if (!assignRoleRole) {
 toast.error("Please select a role");
 return;
 }

 setIsSubmitting(true);
 try {
 await updateAdmin(assignRoleAdmin.id, { role: assignRoleRole });
 toast.success("Role updated successfully");
 setIsAssignRoleModalOpen(false);
 setAssignRoleAdmin(null);
 setAssignRoleRole("");
 loadAdmins();
 } catch (error) {
 toast.error(error.message || "Failed to update role");
 } finally {
 setIsSubmitting(false);
 }
 };

 // Email RBAC: open invite modal (blank) or access modal (optionally prefilled from a row)
 const handleOpenEmailModal = (mode, admin = null) => {
 let teamArr = [];
 if (admin) {
 if (Array.isArray(admin.team)) {
 teamArr = admin.team;
 } else if (typeof admin.team === "string" && admin.team.trim()) {
 teamArr = admin.team.split(",").map((t) => t.trim()).filter(Boolean);
 }
 }
 setEmailFormData({
 email: admin?.email || "",
 role: admin?.role || "",
 department: admin?.department || "",
 team: teamArr,
 permissions: admin && Array.isArray(admin.permissions) ? [...admin.permissions] : [],
 isactive: admin?.isactive !== false,
 });
 setEmailModalMode(mode);
 };

 const handleEmailPermissionToggle = (permission) => {
 setEmailFormData((prev) => ({
 ...prev,
 permissions: prev.permissions.includes(permission)
 ? prev.permissions.filter((p) => p !== permission)
 : [...prev.permissions, permission],
 }));
 };

 const handleEmailModalSubmit = async (e) => {
 e.preventDefault();
 const email = emailFormData.email.trim();
 if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
 toast.error("A valid email is required");
 return;
 }

 setIsSubmitting(true);
 try {
 // Backend scope filtering reads departments from `permissions`, so the
 // selected department must always be included or the invitee sees no data.
 const payload = {
 email,
 team: emailFormData.team.join(", "),
 department: emailFormData.department,
 permissions: emailFormData.department
 ? [...new Set([...emailFormData.permissions, emailFormData.department])]
 : emailFormData.permissions,
 role: emailFormData.role,
 };
 if (emailModalMode === "invite") {
 await inviteAdminByEmail(payload);
 toast.success("Invite sent. The user will receive a temporary password by email.");
 } else {
 await assignAccessByEmail({ ...payload, isactive: emailFormData.isactive });
 toast.success("Access updated successfully");
 }
 setEmailModalMode(null);
 loadAdmins();
 } catch (error) {
 // 502 on invite means the access row and temp password were saved but the
 // invite email failed to send, so treat it as a partial success.
 if (emailModalMode === "invite" && error?.status === 502) {
 toast.warn(
 "Invite saved, but the email could not be sent. Retry the invite to resend it."
 );
 setEmailModalMode(null);
 loadAdmins();
 } else {
 toast.error(
 error.message ||
 (emailModalMode === "invite" ? "Failed to send invite" : "Failed to assign access")
 );
 }
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleEditSubmit = async (e) => {
 e.preventDefault();
 if (!selectedAdmin) return;

 if (updateRole && !editFormData.role) {
 toast.error("Please select a role");
 return;
 }

 setIsSubmitting(true);
 try {
 const updateData = {
 permissions: editFormData.permissions,
 };
 if (updateRole) {
 updateData.role = editFormData.role;
 }
 await updateAdmin(selectedAdmin.id, updateData);
 toast.success("Admin updated successfully");
 setIsEditModalOpen(false);
 setSelectedAdmin(null);
 loadAdmins();
 } catch (error) {
 toast.error(error.message || "Failed to update admin");
 } finally {
 setIsSubmitting(false);
 }
 };

 // Delete admin
 const handleDelete = async (admin) => {
 if (
 !window.confirm(
 `Are you sure you want to delete admin "${admin.code || admin.department}"? This action cannot be undone.`
 )
 ) {
 return;
 }

 setIsLoading(true);
 try {
 await deleteAdmin(admin.id);
 toast.success("Admin deleted successfully");
 loadAdmins();
 } catch (error) {
 toast.error(error.message || "Failed to delete admin");
 } finally {
 setIsLoading(false);
 }
 };

 // Sorting
 const handleSort = (columnKey) => {
 setSortConfig((prev) => {
 if (prev.key === columnKey) {
 return { key: columnKey, direction: prev.direction === "asc" ? "desc" : "asc" };
 }
 return { key: columnKey, direction: "asc" };
 });
 };

 const getSortIcon = (columnKey) => {
 if (sortConfig.key !== columnKey) return null;
 return sortConfig.direction === "asc" ? (
 <ArrowUpIcon className="h-3 w-3 inline-block ml-1" />
 ) : (
 <ArrowDownIcon className="h-3 w-3 inline-block ml-1" />
 );
 };

 const sortedAdmins = useMemo(() => {
 const items = Array.isArray(admins) ? [...admins] : [];
 if (!sortConfig.key) return items;

 return items.sort((a, b) => {
 let aValue = a[sortConfig.key];
 let bValue = b[sortConfig.key];

 if (Array.isArray(aValue)) aValue = aValue.join(", ");
 if (Array.isArray(bValue)) bValue = bValue.join(", ");

 if (aValue === null || aValue === undefined || aValue === "") return 1;
 if (bValue === null || bValue === undefined || bValue === "") return -1;

 const aStr = String(aValue).toLowerCase();
 const bStr = String(bValue).toLowerCase();

 if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
 if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
 return 0;
 });
 }, [admins, sortConfig]);

 // Group admins by team
 const groupedByTeam = useMemo(() => {
 const groups = {};
 sortedAdmins.forEach((admin) => {
 const team = admin.team && String(admin.team).trim() ? String(admin.team).trim() : "Unassigned";
 if (!groups[team]) groups[team] = [];
 groups[team].push(admin);
 });
 // Sort team names alphabetically, but keep "Unassigned" at the end
 const teamNames = Object.keys(groups).sort((a, b) => {
 if (a === "Unassigned") return 1;
 if (b === "Unassigned") return -1;
 return a.localeCompare(b);
 });
 return teamNames.map((team) => ({ team, admins: groups[team] }));
 }, [sortedAdmins]);

 // Default all teams to collapsed on first load
 useEffect(() => {
 if (collapsedTeams === null && groupedByTeam.length > 0) {
 const initial = {};
 groupedByTeam.forEach((g) => { initial[g.team] = true; });
 setCollapsedTeams(initial);
 }
 }, [groupedByTeam, collapsedTeams]);

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
 Admins
 </h1>
 <p className="mt-1 text-sm text-ink-500">
 Manage admin users, roles, and permissions.
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 className="qc-btn-primary"
 onClick={handleOpenAddModal}
 disabled={isLoading}
 >
 Add admin
 </button>
 <button
 type="button"
 className="qc-btn-ghost"
 onClick={() => handleOpenEmailModal("invite")}
 disabled={isLoading}
 >
 Invite by email
 </button>
 <button
 type="button"
 className="qc-btn-ghost"
 onClick={() => handleOpenEmailModal("access")}
 disabled={isLoading}
 >
 Assign access
 </button>
 <button
 type="button"
 className="qc-btn-ghost"
 onClick={loadAdmins}
 disabled={isLoading}
 >
 Refresh
 </button>
 </div>
 </div>

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
 onClick={() => handleSort("code")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Code</span>
 {getSortIcon("code")}
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
 onClick={() => handleSort("role")}
 className="flex items-center hover:text-ink-700"
 >
 <span>Role</span>
 {getSortIcon("role")}
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
 Permissions
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-ink-200">
 {groupedByTeam.map((group) => (
 <Fragment key={group.team}>
 {/* Team group header */}
 <tr
 className="bg-cream-200 cursor-pointer select-none hover:bg-ink-200 transition-colors"
 onClick={() => toggleTeamCollapse(group.team)}
 >
 <td
 colSpan="7"
 className="px-6 py-2 text-sm font-semibold text-ink-700"
 >
 <div className="flex items-center">
 {!collapsedTeams || collapsedTeams[group.team] ? (
 <ChevronRightIcon className="h-4 w-4 mr-2 text-ink-500" />
 ) : (
 <ChevronDownIcon className="h-4 w-4 mr-2 text-ink-500" />
 )}
 {group.team}
 <span className="ml-2 text-xs font-normal text-ink-500">
 ({group.admins.length} admin{group.admins.length !== 1 ? "s" : ""})
 </span>
 </div>
 </td>
 </tr>
 {collapsedTeams && !collapsedTeams[group.team] && group.admins.map((admin) => (
 <tr key={admin.id} className="hover:bg-cream">
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink-900">
 {admin.id}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {admin.code}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {admin.email || <span className="text-ink-400">-</span>}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm">
 <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-ink-100 text-ink-900">
 {admin.role}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 {admin.department}
 </td>
 <td className="px-6 py-4 text-sm text-ink-900">
 <div className="flex flex-wrap gap-1 max-w-xs">
 {Array.isArray(admin.permissions) &&
 admin.permissions.length > 0 ? (
 <>
 {admin.permissions.slice(0, 5).map((perm) => (
 <span
 key={perm}
 className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-cream-200 text-ink-700"
 >
 {perm}
 </span>
 ))}
 {admin.permissions.length > 5 && (
 <button
 type="button"
 onClick={() => setViewPermissionsAdmin(admin)}
 className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-ink-100 text-ink-900 hover:bg-blue-200 cursor-pointer"
 >
 +{admin.permissions.length - 5} more
 </button>
 )}
 </>
 ) : (
 <span className="text-ink-400 text-xs">
 None
 </span>
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
 <div className="flex items-center space-x-2">
 <button
 onClick={() => handleOpenEditModal(admin)}
 className="text-ink-900 hover:text-ink-900"
 title="Edit Admin"
 >
 <PencilSquareIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleAssignRole(admin)}
 className="text-ink-900 hover:text-ink-900"
 title="Assign Role"
 type="button"
 >
 <UserCircleIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleOpenEmailModal("access", admin)}
 className="text-ink-900 hover:text-ink-900"
 title="Assign Access by Email"
 type="button"
 >
 <EnvelopeIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDelete(admin)}
 disabled={isLoading}
 className="text-brick hover:text-brick/80 disabled:opacity-50"
 title="Delete Admin"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </Fragment>
 ))}

 {sortedAdmins.length === 0 && (
 <tr>
 <td
 colSpan="7"
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
 d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
 />
 </svg>
 <p className="text-lg font-medium text-ink-900 mb-2">
 No admins found
 </p>
 <p className="text-sm text-ink-500">
 Click "Add Admin" to create one.
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

 {/* Add Admin Modal */}
 <GenericModal
 isOpen={isAddModalOpen}
 onClose={() => setIsAddModalOpen(false)}
 title="Add Admin"
 size="medium"
 >
 <form onSubmit={handleAddSubmit} className="space-y-4">
 <div>
 <label
 htmlFor="code"
 className="block text-sm font-medium text-ink-700"
 >
 Admin Code *
 </label>
 <input
 type="text"
 id="code"
 name="code"
 value={formData.code}
 onChange={handleInputChange}
 className="mt-1 block w-full rounded-md border-ink-300 focus:border-ink-900 focus:ring-ink-900/10 sm:text-sm border px-3 py-2"
 placeholder="e.g. ADMIN1"
 />
 </div>

 <div>
 <div className="flex items-center justify-between mb-1">
 <label className="block text-sm font-medium text-ink-700">
 Role
 </label>
 <label className="flex items-center space-x-2 cursor-pointer">
 <input
 type="checkbox"
 checked={includeRole}
 onChange={(e) => {
 setIncludeRole(e.target.checked);
 if (!e.target.checked) {
 setFormData((prev) => ({ ...prev, role: "" }));
 }
 }}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 <span className="text-xs text-ink-500">Include role</span>
 </label>
 </div>
 <Select
 options={ROLE_OPTIONS}
 value={ROLE_OPTIONS.find((r) => r.value === formData.role) || null}
 onChange={(opt) => setFormData((prev) => ({ ...prev, role: opt?.value || "" }))}
 placeholder="Select a role"
 styles={selectStyles}
 menuPlacement="auto"
 isDisabled={!includeRole}
 />
 {!includeRole && (
 <p className="text-xs text-ink-400 mt-1">Check "Include role" to assign a role</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-1">
 Department *
 </label>
 <Select
 options={departmentOptions}
 value={
 departmentOptions.find((d) => d.value === formData.department) || null
 }
 onChange={(opt) => {
 const department = opt?.value || "";
 const teamForDept = department ? getTeamForDepartment(department) : null;
 setFormData((prev) => ({
 ...prev,
 department,
 team: teamForDept ? [teamForDept] : prev.team,
 }));
 }}
 placeholder="Select department"
 styles={selectStyles}
 menuPlacement="auto"
 isClearable
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-1">
 Team *
 </label>
 <Select
 isMulti
 options={teamOptions.map((t) => ({ value: t, label: t }))}
 value={formData.team.map((t) => ({ value: t, label: t }))}
 onChange={(opts) =>
 setFormData((prev) => ({
 ...prev,
 team: opts ? opts.map((o) => o.value) : [],
 }))
 }
 placeholder="Select team(s)"
 styles={selectStyles}
 menuPlacement="auto"
 isClearable
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700">
 Landing route
 </label>
 <div
 className={`mt-1 block w-full rounded-md border sm:text-sm border px-3 py-2 ${
 landingRoute
 ? "border-ink-200 bg-cream-200 text-ink-700"
 : "border-amber-300 bg-amber-50 text-amber-800"
 }`}
 >
 {landingRoute ? (
 <>
 <span className="font-medium">{landingRoute}</span>
 <span className="text-ink-500 ml-2">
 → /dashboard{landingRoute}
 </span>
 </>
 ) : (
 "Select department and team to preview landing page"
 )}
 </div>
 <p className="text-xs text-ink-400 mt-1">
 Auto-set on create. HOD uses the department route; team admin uses /admin/team.
 </p>
 </div>

 <div>
 <div className="flex items-center justify-between mb-2">
 <label className="block text-sm font-medium text-ink-700">
 Permissions
 </label>
 <button
 type="button"
 onClick={() => {
 const allChecked = allPermissionDepts.every((d) => formData.permissions.includes(d));
 setFormData((prev) => ({
 ...prev,
 permissions: allChecked ? [] : [...allPermissionDepts],
 }));
 }}
 className="text-xs text-ink-900 hover:text-ink-900 font-medium"
 >
 {allPermissionDepts.every((d) => formData.permissions.includes(d)) ? "Uncheck All" : "Check All"}
 </button>
 </div>
 <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
 {permissionsByTeam.map((group) => {
 const teamDepts = group.departments;
 const allTeamChecked = teamDepts.every((d) => formData.permissions.includes(d));
 const isCollapsed = collapsedPermTeams[group.team];
 return (
 <div key={group.team} className="mb-1">
 <div className="flex items-center justify-between bg-cream rounded px-2 py-1.5 cursor-pointer select-none hover:bg-cream-200" onClick={() => togglePermTeamCollapse(group.team)}>
 <div className="flex items-center">
 {isCollapsed ? (
 <ChevronRightIcon className="h-3.5 w-3.5 mr-1.5 text-ink-500" />
 ) : (
 <ChevronDownIcon className="h-3.5 w-3.5 mr-1.5 text-ink-500" />
 )}
 <span className="text-xs font-semibold text-ink-600 uppercase tracking-wide">{group.team}</span>
 <span className="ml-1.5 text-xs text-ink-400">({teamDepts.filter((d) => formData.permissions.includes(d)).length}/{teamDepts.length})</span>
 </div>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setFormData((prev) => ({
 ...prev,
 permissions: allTeamChecked
 ? prev.permissions.filter((p) => !teamDepts.includes(p))
 : [...new Set([...prev.permissions, ...teamDepts])],
 }));
 }}
 className="text-xs text-ink-900 hover:text-ink-900 font-medium"
 >
 {allTeamChecked ? "Uncheck" : "Check All"}
 </button>
 </div>
 {!isCollapsed && (
 <div className="ml-5 mt-1 space-y-0.5">
 {teamDepts.map((dept) => (
 <label key={dept} className="flex items-center space-x-2 py-0.5 px-2 hover:bg-cream rounded cursor-pointer">
 <input
 type="checkbox"
 checked={formData.permissions.includes(dept)}
 onChange={() => handlePermissionToggle(dept)}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 <span className="text-sm text-ink-700">{dept}</span>
 </label>
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={() => setIsAddModalOpen(false)}
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
 {isSubmitting ? "Creating..." : "Create Admin"}
 </button>
 </div>
 </form>
 </GenericModal>

 {/* Edit Admin Modal */}
 <GenericModal
 isOpen={isEditModalOpen}
 onClose={() => {
 setIsEditModalOpen(false);
 setSelectedAdmin(null);
 }}
 title={`Edit Admin - ${selectedAdmin?.code || ""}`}
 size="medium"
 >
 <form onSubmit={handleEditSubmit} className="space-y-4">
 {/* Non-editable fields — greyed out */}
 <div>
 <label className="block text-sm font-medium text-ink-400">
 Admin Code
 </label>
 <input
 type="text"
 value={editFormData.code}
 disabled
 className="mt-1 block w-full rounded-md border-ink-200 bg-cream-200 text-ink-500 sm:text-sm border px-3 py-2 cursor-not-allowed"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-400">
 Department
 </label>
 <input
 type="text"
 value={editFormData.department}
 disabled
 className="mt-1 block w-full rounded-md border-ink-200 bg-cream-200 text-ink-500 sm:text-sm border px-3 py-2 cursor-not-allowed"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-400">
 Team
 </label>
 <input
 type="text"
 value={Array.isArray(editFormData.team) ? editFormData.team.join(", ") : editFormData.team}
 disabled
 className="mt-1 block w-full rounded-md border-ink-200 bg-cream-200 text-ink-500 sm:text-sm border px-3 py-2 cursor-not-allowed"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-400">
 Route
 </label>
 <input
 type="text"
 value={editFormData.route}
 disabled
 className="mt-1 block w-full rounded-md border-ink-200 bg-cream-200 text-ink-500 sm:text-sm border px-3 py-2 cursor-not-allowed"
 />
 </div>

 <hr className="border-ink-200" />

 {/* Editable fields */}
 <div>
 <div className="flex items-center justify-between mb-1">
 <label className="block text-sm font-medium text-ink-700">
 Role
 </label>
 <label className="flex items-center space-x-2 cursor-pointer">
 <input
 type="checkbox"
 checked={updateRole}
 onChange={(e) => setUpdateRole(e.target.checked)}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 <span className="text-xs text-ink-500">Update role</span>
 </label>
 </div>
 <Select
 options={ROLE_OPTIONS}
 value={ROLE_OPTIONS.find((r) => r.value === editFormData.role) || null}
 onChange={(opt) => setEditFormData((prev) => ({ ...prev, role: opt?.value || "" }))}
 placeholder="Select a role"
 styles={selectStyles}
 menuPlacement="auto"
 isDisabled={!updateRole}
 />
 {!updateRole && (
 <p className="text-xs text-ink-400 mt-1">Check "Update role" to change the role</p>
 )}
 </div>

 <div>
 <div className="flex items-center justify-between mb-2">
 <label className="block text-sm font-medium text-ink-700">
 Permissions
 </label>
 <button
 type="button"
 onClick={() => {
 const allChecked = allPermissionDepts.every((d) => editFormData.permissions.includes(d));
 setEditFormData((prev) => ({
 ...prev,
 permissions: allChecked ? [] : [...allPermissionDepts],
 }));
 }}
 className="text-xs text-ink-900 hover:text-ink-900 font-medium"
 >
 {allPermissionDepts.every((d) => editFormData.permissions.includes(d)) ? "Uncheck All" : "Check All"}
 </button>
 </div>
 <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
 {permissionsByTeam.map((group) => {
 const teamDepts = group.departments;
 const allTeamChecked = teamDepts.every((d) => editFormData.permissions.includes(d));
 const isCollapsed = collapsedPermTeams[group.team];
 return (
 <div key={group.team} className="mb-1">
 <div className="flex items-center justify-between bg-cream rounded px-2 py-1.5 cursor-pointer select-none hover:bg-cream-200" onClick={() => togglePermTeamCollapse(group.team)}>
 <div className="flex items-center">
 {isCollapsed ? (
 <ChevronRightIcon className="h-3.5 w-3.5 mr-1.5 text-ink-500" />
 ) : (
 <ChevronDownIcon className="h-3.5 w-3.5 mr-1.5 text-ink-500" />
 )}
 <span className="text-xs font-semibold text-ink-600 uppercase tracking-wide">{group.team}</span>
 <span className="ml-1.5 text-xs text-ink-400">({teamDepts.filter((d) => editFormData.permissions.includes(d)).length}/{teamDepts.length})</span>
 </div>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setEditFormData((prev) => ({
 ...prev,
 permissions: allTeamChecked
 ? prev.permissions.filter((p) => !teamDepts.includes(p))
 : [...new Set([...prev.permissions, ...teamDepts])],
 }));
 }}
 className="text-xs text-ink-900 hover:text-ink-900 font-medium"
 >
 {allTeamChecked ? "Uncheck" : "Check All"}
 </button>
 </div>
 {!isCollapsed && (
 <div className="ml-5 mt-1 space-y-0.5">
 {teamDepts.map((dept) => (
 <label key={dept} className="flex items-center space-x-2 py-0.5 px-2 hover:bg-cream rounded cursor-pointer">
 <input
 type="checkbox"
 checked={editFormData.permissions.includes(dept)}
 onChange={() => handleEditPermissionToggle(dept)}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 <span className="text-sm text-ink-700">{dept}</span>
 </label>
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={() => {
 setIsEditModalOpen(false);
 setSelectedAdmin(null);
 }}
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
 {isSubmitting ? "Saving..." : "Update Admin"}
 </button>
 </div>
 </form>
 </GenericModal>

 {/* Assign Role Modal */}
 <GenericModal
 isOpen={isAssignRoleModalOpen}
 onClose={() => {
 setIsAssignRoleModalOpen(false);
 setAssignRoleAdmin(null);
 setAssignRoleRole("");
 }}
 title={`Assign Role - ${assignRoleAdmin?.code || ""}`}
 size="medium"
 >
 <form onSubmit={handleAssignRoleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-ink-700">
 Role
 </label>
 <Select
 options={ROLE_OPTIONS}
 value={ROLE_OPTIONS.find((r) => r.value === assignRoleRole) || null}
 onChange={(opt) => setAssignRoleRole(opt?.value || "")}
 placeholder="Select a role"
 styles={selectStyles}
 menuPlacement="auto"
 />
 </div>

 <div className="flex justify-end space-x-3 pt-2">
 <button
 type="button"
 onClick={() => {
 setIsAssignRoleModalOpen(false);
 setAssignRoleAdmin(null);
 setAssignRoleRole("");
 }}
 className="px-4 py-2 text-sm font-medium text-ink-700 bg-cream-200 rounded-md hover:bg-ink-200"
 disabled={isSubmitting}
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 text-sm font-medium text-white bg-ink-900 rounded-md hover:bg-ink-700 disabled:opacity-50"
 disabled={isSubmitting}
 >
 {isSubmitting ? "Updating..." : "Update Role"}
 </button>
 </div>
 </form>
 </GenericModal>

 {/* Email RBAC Modal — Invite by email / Assign access by email */}
 <GenericModal
 isOpen={!!emailModalMode}
 onClose={() => setEmailModalMode(null)}
 title={emailModalMode === "invite" ? "Invite Admin by Email" : "Assign Access by Email"}
 size="medium"
 >
 <form onSubmit={handleEmailModalSubmit} className="space-y-4">
 <p className="text-xs text-ink-500">
 {emailModalMode === "invite"
 ? "Sends an invite email with a temporary password. The user must reset it on first sign in."
 : "Creates or updates team, department, role, and permissions for this email. No password is set."}
 </p>

 <div>
 <label htmlFor="rbac-email" className="block text-sm font-medium text-ink-700">
 Email *
 </label>
 <input
 type="email"
 id="rbac-email"
 value={emailFormData.email}
 onChange={(e) =>
 setEmailFormData((prev) => ({ ...prev, email: e.target.value }))
 }
 className="mt-1 block w-full rounded-md border-ink-300 focus:border-ink-900 focus:ring-ink-900/10 sm:text-sm border px-3 py-2"
 placeholder="e.g. hod.sound@church.org"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-1">
 Role
 </label>
 <Select
 options={ROLE_OPTIONS}
 value={ROLE_OPTIONS.find((r) => r.value === emailFormData.role) || null}
 onChange={(opt) =>
 setEmailFormData((prev) => ({ ...prev, role: opt?.value || "" }))
 }
 placeholder="Select a role (optional)"
 styles={selectStyles}
 menuPlacement="auto"
 isClearable
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-1">
 Department
 </label>
 <Select
 options={departmentOptions}
 value={
 departmentOptions.find((d) => d.value === emailFormData.department) || null
 }
 onChange={(opt) => {
 const department = opt?.value || "";
 const teamForDept = department ? getTeamForDepartment(department) : null;
 setEmailFormData((prev) => ({
 ...prev,
 department,
 team: teamForDept ? [teamForDept] : prev.team,
 }));
 }}
 placeholder="Select department (optional)"
 styles={selectStyles}
 menuPlacement="auto"
 isClearable
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-1">
 Team
 </label>
 <Select
 isMulti
 options={teamOptions.map((t) => ({ value: t, label: t }))}
 value={emailFormData.team.map((t) => ({ value: t, label: t }))}
 onChange={(opts) =>
 setEmailFormData((prev) => ({
 ...prev,
 team: opts ? opts.map((o) => o.value) : [],
 }))
 }
 placeholder="Select team(s) (optional)"
 styles={selectStyles}
 menuPlacement="auto"
 isClearable
 />
 </div>

 {emailModalMode === "access" && (
 <label className="flex items-center space-x-2 cursor-pointer">
 <input
 type="checkbox"
 checked={emailFormData.isactive}
 onChange={(e) =>
 setEmailFormData((prev) => ({ ...prev, isactive: e.target.checked }))
 }
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 <span className="text-sm text-ink-700">Active</span>
 </label>
 )}

 <div>
 <div className="flex items-center justify-between mb-2">
 <label className="block text-sm font-medium text-ink-700">
 Permissions
 </label>
 <button
 type="button"
 onClick={() => {
 const allChecked = allPermissionDepts.every((d) =>
 emailFormData.permissions.includes(d)
 );
 setEmailFormData((prev) => ({
 ...prev,
 permissions: allChecked ? [] : [...allPermissionDepts],
 }));
 }}
 className="text-xs text-ink-900 hover:text-ink-900 font-medium"
 >
 {allPermissionDepts.every((d) => emailFormData.permissions.includes(d))
 ? "Uncheck All"
 : "Check All"}
 </button>
 </div>
 <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
 {permissionsByTeam.map((group) => {
 const teamDepts = group.departments;
 const allTeamChecked = teamDepts.every((d) =>
 emailFormData.permissions.includes(d)
 );
 const isCollapsed = collapsedPermTeams[group.team];
 return (
 <div key={group.team} className="mb-1">
 <div
 className="flex items-center justify-between bg-cream rounded px-2 py-1.5 cursor-pointer select-none hover:bg-cream-200"
 onClick={() => togglePermTeamCollapse(group.team)}
 >
 <div className="flex items-center">
 {isCollapsed ? (
 <ChevronRightIcon className="h-3.5 w-3.5 mr-1.5 text-ink-500" />
 ) : (
 <ChevronDownIcon className="h-3.5 w-3.5 mr-1.5 text-ink-500" />
 )}
 <span className="text-xs font-semibold text-ink-600 uppercase tracking-wide">
 {group.team}
 </span>
 <span className="ml-1.5 text-xs text-ink-400">
 ({teamDepts.filter((d) => emailFormData.permissions.includes(d)).length}/{teamDepts.length})
 </span>
 </div>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setEmailFormData((prev) => ({
 ...prev,
 permissions: allTeamChecked
 ? prev.permissions.filter((p) => !teamDepts.includes(p))
 : [...new Set([...prev.permissions, ...teamDepts])],
 }));
 }}
 className="text-xs text-ink-900 hover:text-ink-900 font-medium"
 >
 {allTeamChecked ? "Uncheck" : "Check All"}
 </button>
 </div>
 {!isCollapsed && (
 <div className="ml-5 mt-1 space-y-0.5">
 {teamDepts.map((dept) => (
 <label
 key={dept}
 className="flex items-center space-x-2 py-0.5 px-2 hover:bg-cream rounded cursor-pointer"
 >
 <input
 type="checkbox"
 checked={emailFormData.permissions.includes(dept)}
 onChange={() => handleEmailPermissionToggle(dept)}
 className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
 />
 <span className="text-sm text-ink-700">{dept}</span>
 </label>
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={() => setEmailModalMode(null)}
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
 ? emailModalMode === "invite" ? "Sending..." : "Saving..."
 : emailModalMode === "invite" ? "Send Invite" : "Assign Access"}
 </button>
 </div>
 </form>
 </GenericModal>

 {/* View Permissions Modal */}
 <GenericModal
 isOpen={!!viewPermissionsAdmin}
 onClose={() => setViewPermissionsAdmin(null)}
 title={`Permissions - ${viewPermissionsAdmin?.code || ""}`}
 size="medium"
 >
 {viewPermissionsAdmin && (
 <div>
 <p className="text-sm text-ink-500 mb-3">
 {viewPermissionsAdmin.permissions?.length || 0} permission{viewPermissionsAdmin.permissions?.length !== 1 ? "s" : ""}
 </p>
 <div className="max-h-80 overflow-y-auto space-y-1">
 {permissionsByTeam.map((group) => {
 const matched = group.departments.filter(
 (d) => viewPermissionsAdmin.permissions?.includes(d)
 );
 if (matched.length === 0) return null;
 return (
 <div key={group.team} className="mb-2">
 <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide px-2 py-1 bg-cream rounded">
 {group.team}
 </div>
 <div className="mt-1 space-y-0.5">
 {matched.map((perm) => (
 <div
 key={perm}
 className="px-3 py-1.5 text-sm text-ink-700"
 >
 {perm}
 </div>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </GenericModal>
 </div>
 );
}
