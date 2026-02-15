import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import { fetchPendingAdd, fetchPendingRemove } from "../services/workers";
import LoadingState from "../components/LoadingState";
import { saveAs } from "file-saver";
import { getUserRole, canAccessDepartment } from "../utils/getUserRole";
import apiRequest from "../utils/apiClient";
import { 
  CheckIcon, 
  XMarkIcon, 
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

  const { isSuperAdmin, isChurchAdmin, isTeamAdmin, isSubTeamAdmin } = getUserRole();
  const canAccessPendingWorkers =
    isSuperAdmin || isChurchAdmin || isTeamAdmin || isSubTeamAdmin;

  useEffect(() => {
    if (!canAccessPendingWorkers) {
      toast.error("Access denied. Admin access required.");
      navigate("/login");
      return;
    }
  }, [canAccessPendingWorkers, navigate]);

  const filterByAccess = (workers) => {
    if (isSuperAdmin || isChurchAdmin) return workers;
    return workers.filter((w) => canAccessDepartment(w.department || w.department_name));
  };

  // Fetch all pending workers (no pagination from API)
  const fetchAllPendingWorkers = async () => {
    if (isLoading) return; // Prevent multiple simultaneous calls
    setIsLoading(true);
    try {
      const [addWorkers, removeWorkers] = await Promise.all([
        fetchPendingAdd(1, 1000), // Fetch large number to get all
        fetchPendingRemove(1, 1000)
      ]);
      
      const allAddWorkers = filterByAccess(addWorkers?.data || []);
      const allRemoveWorkers = filterByAccess(removeWorkers?.data || []);
      
      setAllPendingAddWorkers(allAddWorkers);
      setAllPendingRemoveWorkers(allRemoveWorkers);
      
      // Update pagination for current tab
      updatePaginationForTab(activeTab, allAddWorkers, allRemoveWorkers);
      
    } catch (error) {
      toast.error("Failed to fetch pending workers");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete single worker (permanent)
  const deleteWorker = async (workerId) => {
    const confirmDelete = window.confirm(
      "⚠️ This will permanently delete this worker. This action cannot be undone.\n\nAre you sure you want to continue?"
    );
    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      await apiRequest("DELETE", `/api/super/admin/${workerId}/workers`);

      toast.success("Worker deleted successfully");
      fetchAllPendingWorkers();
      clearSelection();
    } catch (error) {
      toast.error(`Failed to delete worker: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Update pagination for specific tab
  const updatePaginationForTab = (tab, allAddWorkers, allRemoveWorkers) => {
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
    //
    
    setPagination(newPagination);
    
    // Set current page data
    const startIndex = 0;
    const endIndex = pagination.limit;
    const currentPageData = currentWorkers.slice(startIndex, endIndex);
    
    if (tab === "add") {
      setPendingAddWorkers(currentPageData);
    } else {
      setPendingRemoveWorkers(currentPageData);
    }
  };

  useEffect(() => {
    if (hasFetched.current) {
      return;
    }
    hasFetched.current = true;
    fetchAllPendingWorkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

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
    setIsLoading(true);
    try {
      await apiRequest("PUT", `/api/super/admin/${workerId}/workers/approve`);

      toast.success("Worker approved successfully");
      fetchAllPendingWorkers();
      clearSelection();
    } catch (error) {
      toast.error(`Failed to approve worker: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reject worker
  const rejectWorker = async (workerId) => {
    setIsLoading(true);
    try {
      await apiRequest("PUT", `/api/super/admin/${workerId}/workers`, {
        status: "REJECTED",
      });

      toast.success("Worker rejected successfully");
      fetchAllPendingWorkers();
      clearSelection();
    } catch (error) {
      toast.error(`Failed to reject worker: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk delete (permanently deletes workers)
  const bulkDelete = async () => {
    if (selectedWorkers.size === 0) {
      toast.error("No workers selected for deletion");
      return;
    }

    const confirmMessage = `⚠️ WARNING: This will permanently delete ${selectedWorkers.size} worker(s). This action cannot be undone.

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
      let successCount = 0;
      let errorCount = 0;

      for (const workerId of selectedWorkers) {
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

      fetchAllPendingWorkers();
      clearSelection();
    } catch (error) {
      toast.error(`Failed to delete workers: ${error.message}`);
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const workerId of selectedWorkers) {
        try {
          await apiRequest("PUT", `/api/super/admin/${workerId}/workers/approve`);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} worker(s) approved successfully`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to approve ${errorCount} worker(s)`);
      }

      fetchAllPendingWorkers();
      clearSelection();
    } catch (error) {
      toast.error(`Failed to approve workers: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Export to CSV function
  const exportToCSV = () => {
    try {
      const workersToExport = activeTab === "add" ? allPendingAddWorkers : allPendingRemoveWorkers;
      
      if (workersToExport.length === 0) {
        toast.error(`No pending ${activeTab === "add" ? "add" : "remove"} workers to export`);
        return;
      }

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
      const fileName = `pending_${activeTab === "add" ? "add" : "remove"}_workers_${new Date().toISOString().split("T")[0]}.csv`;
      saveAs(blob, fileName);
      
      toast.success(`Exported ${workersToExport.length} worker(s) to CSV`);
    } catch (error) {
      toast.error("Failed to export workers to CSV");
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
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                Pending Workers Management
              </h1>
            </div>
            <div className="self-start sm:self-center flex space-x-2">
              <button
                className="bg-green-600 hover:bg-green-700 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[140px]"
                onClick={exportToCSV}
                disabled={isLoading}
              >
                Export CSV
              </button>
              <button
                className="bg-gray-500 hover:bg-gray-600 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[140px]"
                onClick={fetchAllPendingWorkers}
                disabled={isLoading}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => handleTabChange("add")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "add"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Pending Add ({allPendingAddWorkers.length})
                </button>
                <button
                  onClick={() => handleTabChange("remove")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "remove"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Pending Remove ({allPendingRemoveWorkers.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedWorkers.size > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-yellow-800">
                    {selectedWorkers.size} worker(s) selected
                  </span>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="flex space-x-2">
                  {/* Pending Add: Approve first, then Delete */}
                  {activeTab === "add" && (
                    <>
                      <button
                        onClick={bulkApprove}
                        disabled={isLoading}
                        className="bg-green-600 px-4 py-2 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Processing..." : `Approve Selected (${selectedWorkers.size})`}
                      </button>
                      <button
                        onClick={bulkDelete}
                        disabled={isLoading}
                        className="bg-red-600 px-4 py-2 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Processing..." : `Delete Selected (${selectedWorkers.size})`}
                      </button>
                    </>
                  )}

                  {/* Pending Remove: Delete then Reject (approve removal) */}
                  {activeTab === "remove" && (
                    <>
                      <button
                        onClick={bulkDelete}
                        disabled={isLoading}
                        className="bg-red-600 px-4 py-2 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Processing..." : `Delete Selected (${selectedWorkers.size})`}
                      </button>
                      <button
                        onClick={bulkApprove}
                        disabled={isLoading}
                        className="bg-green-600 px-4 py-2 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Processing..." : `Reject Selected (${selectedWorkers.size})`}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

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
                          <input
                            type="checkbox"
                            checked={isSelectAll}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
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
                            onClick={() => handleSort("email")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>Email</span>
                            {getSortIcon("email")}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort("phonenumber")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>Phone</span>
                            {getSortIcon("phonenumber")}
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
                            onClick={() => handleSort("status")}
                            className="flex items-center hover:text-gray-700"
                          >
                            <span>Status</span>
                            {getSortIcon("status")}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(sortedWorkers) &&
                        sortedWorkers.map((worker, idx) => (
                          <tr key={worker.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <input
                                type="checkbox"
                                checked={selectedWorkers.has(worker.id)}
                                onChange={() => handleSelectWorker(worker.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {worker.id || worker.workerid || idx + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {worker.firstname} {worker.lastname}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {worker.email || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {worker.phonenumber || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {worker.department || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {worker.team || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                worker.status === "PENDING_ADD" 
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {worker.status || "Unknown"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => navigate(`/worker/${worker.id}?from=pending-workers`)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="View Details"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => approveWorker(worker.id)}
                                  disabled={isLoading}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                  title="Approve"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteWorker(worker.id)}
                                  disabled={isLoading}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                                {activeTab === "remove" && (
                                  <button
                                    onClick={() => rejectWorker(worker.id)}
                                    disabled={isLoading}
                                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                    title="Reject"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}

                      {/* Show message when no data */}
                      {Array.isArray(sortedWorkers) && sortedWorkers.length === 0 && (
                        <tr>
                          <td
                            colSpan="9"
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
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              <p className="text-lg font-medium text-gray-900 mb-2">
                                No pending {activeTab === "add" ? "add" : "remove"} workers
                              </p>
                              <p className="text-sm text-gray-500">
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
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} results
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePagination(pagination.page - 1)}
                  disabled={!pagination.hasPrev || isLoading}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={isLoading}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          pageNum === pagination.page
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePagination(pagination.page + 1)}
                  disabled={!pagination.hasNext || isLoading}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </div>
  );
}
