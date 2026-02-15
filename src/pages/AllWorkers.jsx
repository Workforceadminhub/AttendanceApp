import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import LoadingState from "../components/LoadingState";
import { EyeIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { saveAs } from "file-saver";
import apiRequest from "../utils/apiClient";

export default function AllWorkers() {
  const navigate = useNavigate();
  const [allWorkers, setAllWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Column filters state
  const [columnFilters, setColumnFilters] = useState({
    id: "",
    firstname: "",
    lastname: "",
    email: "",
    phonenumber: "",
    department: "",
    team: "",
    status: "",
  });

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc", // 'asc' or 'desc'
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

  // Fetch all workers
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
      setFilteredWorkers(workersData);
    } catch (error) {
      toast.error("Failed to fetch workers");
      setAllWorkers([]);
      setFilteredWorkers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllWorkers();
  }, []);

  // Apply filters and sorting whenever columnFilters, sortConfig, or allWorkers change
  useEffect(() => {
    let filtered = [...allWorkers];

    // Apply each column filter
    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (filterValue && filterValue.trim() !== "") {
        const searchTerm = filterValue.toLowerCase().trim();
        filtered = filtered.filter((worker) => {
          const cellValue = worker[column];
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
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

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

    setFilteredWorkers(filtered);
  }, [columnFilters, sortConfig, allWorkers]);

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

  // Export current (filtered) workers to CSV
  const exportToCSV = () => {
    try {
      if (!filteredWorkers.length) {
        toast.error("No workers to export");
        return;
      }

      const headers = [
        "ID",
        "First Name",
        "Last Name",
        "Email",
        "Phone Number",
        "Department",
        "Team",
        "Status",
      ];

      const rows = filteredWorkers.map((worker, idx) => [
        worker.id || worker.workerid || idx + 1,
        worker.firstname || "",
        worker.lastname || "",
        worker.email || "N/A",
        worker.phonenumber || "N/A",
        worker.department || "N/A",
        worker.team || "N/A",
        worker.status || "Unknown",
      ]);

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

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) => row.map(escapeCSV).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const fileName = `all_workers_${new Date().toISOString().split("T")[0]}.csv`;
      saveAs(blob, fileName);

      toast.success(`Exported ${filteredWorkers.length} worker(s) to CSV`);
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                All Workers
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Showing {filteredWorkers.length} of {allWorkers.length} workers
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => navigate("/team-mismatch")}
                className="bg-orange-500 hover:bg-orange-600 px-4 py-2 text-white rounded-lg text-sm font-medium"
              >
                Team Mismatch
              </button>
              <button
                onClick={exportToCSV}
                disabled={isLoading || !filteredWorkers.length}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Export
              </button>
              <button
                onClick={fetchAllWorkers}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Table Section */}
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleSort("id")}
                            className="flex items-center justify-start mb-2 hover:text-gray-700 cursor-pointer"
                          >
                            <span>ID</span>
                            {getSortIcon("id")}
                          </button>
                          <input
                            type="text"
                            value={columnFilters.id}
                            onChange={(e) => handleFilterChange("id", e.target.value)}
                            placeholder="Filter ID..."
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleSort("firstname")}
                            className="flex items-center justify-start mb-2 hover:text-gray-700 cursor-pointer"
                          >
                            <span>First Name</span>
                            {getSortIcon("firstname")}
                          </button>
                          <input
                            type="text"
                            value={columnFilters.firstname}
                            onChange={(e) => handleFilterChange("firstname", e.target.value)}
                            placeholder="Filter first name..."
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleSort("lastname")}
                            className="flex items-center justify-start mb-2 hover:text-gray-700 cursor-pointer"
                          >
                            <span>Last Name</span>
                            {getSortIcon("lastname")}
                          </button>
                          <input
                            type="text"
                            value={columnFilters.lastname}
                            onChange={(e) => handleFilterChange("lastname", e.target.value)}
                            placeholder="Filter last name..."
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleSort("email")}
                            className="flex items-center justify-start mb-2 hover:text-gray-700 cursor-pointer"
                          >
                            <span>Email</span>
                            {getSortIcon("email")}
                          </button>
                          <input
                            type="text"
                            value={columnFilters.email}
                            onChange={(e) => handleFilterChange("email", e.target.value)}
                            placeholder="Filter email..."
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleSort("phonenumber")}
                            className="flex items-center justify-start mb-2 hover:text-gray-700 cursor-pointer"
                          >
                            <span>Phone</span>
                            {getSortIcon("phonenumber")}
                          </button>
                          <input
                            type="text"
                            value={columnFilters.phonenumber}
                            onChange={(e) => handleFilterChange("phonenumber", e.target.value)}
                            placeholder="Filter phone..."
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleSort("department")}
                            className="flex items-center justify-start mb-2 hover:text-gray-700 cursor-pointer"
                          >
                            <span>Department</span>
                            {getSortIcon("department")}
                          </button>
                          <input
                            type="text"
                            value={columnFilters.department}
                            onChange={(e) => handleFilterChange("department", e.target.value)}
                            placeholder="Filter department..."
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleSort("team")}
                            className="flex items-center justify-start mb-2 hover:text-gray-700 cursor-pointer"
                          >
                            <span>Team</span>
                            {getSortIcon("team")}
                          </button>
                          <input
                            type="text"
                            value={columnFilters.team}
                            onChange={(e) => handleFilterChange("team", e.target.value)}
                            placeholder="Filter team..."
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleSort("status")}
                            className="flex items-center justify-start mb-2 hover:text-gray-700 cursor-pointer"
                          >
                            <span>Status</span>
                            {getSortIcon("status")}
                          </button>
                          <input
                            type="text"
                            value={columnFilters.status}
                            onChange={(e) => handleFilterChange("status", e.target.value)}
                            placeholder="Filter status..."
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(filteredWorkers) && filteredWorkers.length > 0 ? (
                      filteredWorkers.map((worker, idx) => (
                        <tr key={worker.id || idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {worker.id || worker.workerid || idx + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {worker.firstname || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {worker.lastname || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {worker.email || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {worker.phonenumber || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {worker.department || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {worker.team || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              worker.status === "ACTIVE" 
                                ? "bg-green-100 text-green-800"
                                : worker.status === "PENDING_ADD"
                                ? "bg-yellow-100 text-yellow-800"
                                : worker.status === "PENDING_DELETE"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {worker.status || "Unknown"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <button
                              onClick={() => navigate(`/worker/${worker.id}?from=all-workers`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
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
                              {allWorkers.length === 0 
                                ? "No workers found" 
                                : "No workers match the current filters"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {allWorkers.length === 0
                                ? "Try refreshing the page."
                                : "Try adjusting your filter criteria."}
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
      </Layout>
    </div>
  );
}

