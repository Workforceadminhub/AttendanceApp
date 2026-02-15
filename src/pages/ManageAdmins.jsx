import { useState, useEffect, useRef, useMemo, Fragment } from "react";
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
} from "../services/admins";
import { fetchDepartments } from "../services/departments";
import {
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PencilSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
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
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasFetched = useRef(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Collapsed team groups (true = collapsed, default all collapsed)
  const [collapsedTeams, setCollapsedTeams] = useState(null);

  // Add admin form
  const [formData, setFormData] = useState({
    code: "",
    role: "",
    route: "",
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

  // Get unique team and department names from departments data
  const teamOptions = useMemo(() => {
    const teams = departments
      .map((d) => d.team)
      .filter((team) => team && team.trim() !== "");
    return [...new Set(teams)].sort();
  }, [departments]);

  const departmentOptions = useMemo(() => {
    const depts = departments
      .map((d) => d.name)
      .filter((name) => name && name.trim() !== "");
    return [...new Set(depts)].sort();
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

  // Fetch admins and departments
  const loadAdmins = async () => {
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
  };

  const loadDepartments = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      // Silent fail - departments are for dropdown options
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadAdmins();
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
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
      route: "",
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

    setIsSubmitting(true);
    try {
      const adminData = {
        ...formData,
        department: formData.department.trim(),
        team: formData.team.join(", "),
      };
      if (!includeRole) {
        delete adminData.role;
      }
      await createAdmin(adminData);
      toast.success("Admin created successfully");
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
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <Header />
      <Layout>
        <div>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                Admin Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage admin users, roles, and permissions
              </p>
            </div>
            <div className="self-start sm:self-center flex space-x-2">
              <button
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[120px]"
                onClick={handleOpenAddModal}
                disabled={isLoading}
              >
                Add Admin
              </button>
              <button
                className="bg-gray-500 hover:bg-gray-600 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[100px]"
                onClick={loadAdmins}
                disabled={isLoading}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Table Section */}
          <div className="mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {isLoading ? (
                <div className="p-8">
                  <LoadingState />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort("id")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>ID</span>
                            {getSortIcon("id")}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort("code")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>Code</span>
                            {getSortIcon("code")}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort("role")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>Role</span>
                            {getSortIcon("role")}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort("department")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>Department</span>
                            {getSortIcon("department")}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Permissions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {groupedByTeam.map((group) => (
                        <Fragment key={group.team}>
                          {/* Team group header */}
                          <tr
                            className="bg-gray-100 cursor-pointer select-none hover:bg-gray-200 transition-colors"
                            onClick={() => toggleTeamCollapse(group.team)}
                          >
                            <td
                              colSpan="6"
                              className="px-6 py-2 text-sm font-semibold text-gray-700"
                            >
                              <div className="flex items-center">
                                {!collapsedTeams || collapsedTeams[group.team] ? (
                                  <ChevronRightIcon className="h-4 w-4 mr-2 text-gray-500" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4 mr-2 text-gray-500" />
                                )}
                                {group.team}
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                  ({group.admins.length} admin{group.admins.length !== 1 ? "s" : ""})
                                </span>
                              </div>
                            </td>
                          </tr>
                          {collapsedTeams && !collapsedTeams[group.team] && group.admins.map((admin) => (
                            <tr key={admin.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {admin.id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {admin.code}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {admin.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {admin.department}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {Array.isArray(admin.permissions) &&
                                  admin.permissions.length > 0 ? (
                                    admin.permissions.map((perm) => (
                                      <span
                                        key={perm}
                                        className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700"
                                      >
                                        {perm}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 text-xs">
                                      None
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleOpenEditModal(admin)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Edit Admin"
                                  >
                                    <PencilSquareIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(admin)}
                                    disabled={isLoading}
                                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
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
                            colSpan="6"
                            className="px-6 py-8 text-center text-gray-500"
                          >
                            <div className="flex flex-col items-center">
                              <svg
                                className="w-12 h-12 text-gray-400 mb-4"
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
                              <p className="text-lg font-medium text-gray-900 mb-2">
                                No admins found
                              </p>
                              <p className="text-sm text-gray-500">
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
              className="block text-sm font-medium text-gray-700"
            >
              Admin Code *
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
              placeholder="e.g. ADMIN1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRole}
                  onChange={(e) => setIncludeRole(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-xs text-gray-500">Include role</span>
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
              <p className="text-xs text-gray-400 mt-1">Check "Include role" to assign a role</p>
            )}
          </div>

          <div>
            <label
              htmlFor="department"
              className="block text-sm font-medium text-gray-700"
            >
              Department *
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
              placeholder="e.g. Pastoral Care"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team *
            </label>
            <Select
              isMulti
              options={teamOptions.map((t) => ({ value: t, label: t }))}
              value={formData.team.map((t) => ({ value: t, label: t }))}
              onChange={(opts) => setFormData((prev) => ({ ...prev, team: opts ? opts.map((o) => o.value) : [] }))}
              placeholder="Select team(s)"
              styles={selectStyles}
              menuPlacement="auto"
              isClearable
            />
          </div>

          <div>
            <label
              htmlFor="route"
              className="block text-sm font-medium text-gray-700"
            >
              Route
            </label>
            <input
              type="text"
              id="route"
              name="route"
              value={formData.route}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
              placeholder="/route-path"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
              {departmentOptions.map((dept) => (
                <label
                  key={dept}
                  className="flex items-center space-x-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(dept)}
                    onChange={() => handlePermissionToggle(dept)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{dept}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
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
            <label className="block text-sm font-medium text-gray-400">
              Admin Code
            </label>
            <input
              type="text"
              value={editFormData.code}
              disabled
              className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 text-gray-500 sm:text-sm border px-3 py-2 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400">
              Department
            </label>
            <input
              type="text"
              value={editFormData.department}
              disabled
              className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 text-gray-500 sm:text-sm border px-3 py-2 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400">
              Team
            </label>
            <input
              type="text"
              value={Array.isArray(editFormData.team) ? editFormData.team.join(", ") : editFormData.team}
              disabled
              className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 text-gray-500 sm:text-sm border px-3 py-2 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400">
              Route
            </label>
            <input
              type="text"
              value={editFormData.route}
              disabled
              className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 text-gray-500 sm:text-sm border px-3 py-2 cursor-not-allowed"
            />
          </div>

          <hr className="border-gray-200" />

          {/* Editable fields */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateRole}
                  onChange={(e) => setUpdateRole(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-xs text-gray-500">Update role</span>
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
              <p className="text-xs text-gray-400 mt-1">Check "Update role" to change the role</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
              {departmentOptions.map((dept) => (
                <label
                  key={dept}
                  className="flex items-center space-x-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={editFormData.permissions.includes(dept)}
                    onChange={() => handleEditPermissionToggle(dept)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{dept}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedAdmin(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Update Admin"}
            </button>
          </div>
        </form>
      </GenericModal>
    </div>
  );
}
