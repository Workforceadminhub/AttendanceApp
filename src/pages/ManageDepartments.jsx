import { useState, useEffect, useRef, useMemo } from "react";
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
} from "../services/departments";
import {
  PencilIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";

export default function ManageDepartments() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasFetched = useRef(false);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

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
  const loadDepartments = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const data = await fetchDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to fetch departments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!formData.route.trim()) {
      toast.error("Route is required");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Code is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDepartment) {
        // Update existing department
        await updateDepartment({
          id: editingDepartment.id,
          ...formData,
        });
        toast.success("Department updated successfully");
      } else {
        // Add new department
        await addDepartment(formData);
        toast.success("Department added successfully");
      }
      handleCloseModal();
      loadDepartments();
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
    } catch (error) {
      toast.error(`Failed to ${action} department: ${error.message}`);
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

  // Sorted departments
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

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [departments, sortConfig]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <Header />
      <Layout>
        <div>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                Department Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage all departments in the system
              </p>
            </div>
            <div className="self-start sm:self-center flex space-x-2">
              <button
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[140px]"
                onClick={handleAddNew}
                disabled={isLoading}
              >
                Add Department
              </button>
              <button
                className="bg-gray-500 hover:bg-gray-600 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[100px]"
                onClick={loadDepartments}
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
                            onClick={() => handleSort("name")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>Name</span>
                            {getSortIcon("name")}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort("team")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>Team</span>
                            {getSortIcon("team")}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort("route")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>Route</span>
                            {getSortIcon("route")}
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
                            onClick={() => handleSort("isactive")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>Status</span>
                            {getSortIcon("isactive")}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedDepartments.map((department) => (
                        <tr key={department.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {department.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {department.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {department.team}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {department.route}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {department.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                department.isactive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {department.isactive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(department)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(department)}
                                disabled={isLoading}
                                className={`px-3 py-1 text-xs font-medium rounded ${
                                  department.isactive
                                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                } disabled:opacity-50`}
                              >
                                {department.isactive ? "Disable" : "Enable"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Show message when no data */}
                      {sortedDepartments.length === 0 && (
                        <tr>
                          <td
                            colSpan="7"
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
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                              <p className="text-lg font-medium text-gray-900 mb-2">
                                No departments found
                              </p>
                              <p className="text-sm text-gray-500">
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
              className="block text-sm font-medium text-gray-700"
            >
              Department Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
              placeholder="Enter department name"
            />
          </div>

          <div>
            <label
              htmlFor="team"
              className="block text-sm font-medium text-gray-700"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
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
              className="block text-sm font-medium text-gray-700"
            >
              Route *
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
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700"
            >
              Code *
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isactive"
              className="ml-2 block text-sm text-gray-700"
            >
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
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
