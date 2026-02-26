import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Header from "../Header";
import { getDepartmentByUser } from "../../utils/getDepartment";
import { fetchAdminWorkers, fetchWorkers } from "../../services/workers";
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
import { getUser } from "../../utils/getUser";

export default function ChurchAdminWorkers() {
  const navigate = useNavigate();
  const location = useLocation();
  // All hooks must be called before any conditional returns
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dateForAttendance = getNextSunday();
  const [filters, setFilters] = useState({
    department: "All",
    team: "All",
  });
  const team = getDepartmentByUser(location.pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isSuperAdmin = team.department === "Super Admin";
  const isAdminMember = checkAdminStatus(location.pathname);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    teams: [],
    departments: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  
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
      } catch (error) {
        // Fallback to empty options
        setFilterOptions({ teams: [], departments: [] });
      }
    };

    initializeFilters();
  }, []);

  // Query functions for Church Admin - uses same API as Super Admin but with Church Admin token
  const queryChurchAdminWorkers = async (page = 1, limit = 20, search = "") => {
    setIsLoading(true);
    try {
      const params = { page, limit, sortBy: "team" };
      if (search && search.trim()) {
        params.search = search.trim();
      }
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "All") {
          params[key] = value;
        }
      });

      const result = await apiRequest("GET", "/api/super/admin/workers", params);
      // Handle nested data structure: result.data.data contains the workers array
      setData(result.data?.data || result.workers || []);
      
      // Handle pagination info if available
      let paginationInfo = null;
      if (result.data?.pagination) {
        paginationInfo = result.data.pagination;
      } else if (result.pagination) {
        paginationInfo = result.pagination;
      }
      
      // Set pagination info if available
      if (paginationInfo) {
        setPagination({
          page: paginationInfo.page || page,
          limit: paginationInfo.limit || limit,
          total: paginationInfo.total || 0,
          totalPages: paginationInfo.totalPages || 0,
          hasNext: paginationInfo.hasNext || false,
          hasPrev: paginationInfo.hasPrev || false,
        });
      }
    } catch (error) {
      toast.error("Failed to fetch workers");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Query function for Super Admin (kept for compatibility)
  const querySuperAdminWorkers = async (page = 1, limit = 20, search = "") => {
    setIsLoading(true);
    try {
      const params = { page, limit, sortBy: "team" };
      if (search && search.trim()) {
        params.search = search.trim();
      }
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "All") {
          params[key] = value;
        }
      });

      const result = await apiRequest("GET", "/api/super/admin/workers", params);
      // Handle nested data structure: result.data.data contains the workers array
      setData(result.data?.data || result.workers || []);
    } catch (error) {
      toast.error("Failed to fetch workers");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const queryAdminWorkers = async (search = "") => {
    setIsLoading(true);
    try {
      const user = getUser();
      const rawPermissions = user?.permissions ?? [];
      // Filter out team name from permissions (team name shouldn't be in permissions array)
      const permissions = rawPermissions.filter((perm) => perm !== user?.team);
      const result = await fetchAdminWorkers(
        filters.team,
        filters.department,
        dateForAttendance,
        search,
        permissions
      );
      setData(result);
    } catch (error) {
      toast.error("Failed to fetch workers");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const queryWorkers = async (search = "") => {
    const user = getUser();
    const rawPermissions = user?.permissions ?? [];
    // Filter out team name from permissions (team name shouldn't be in permissions array)
    const permissions = rawPermissions.filter((perm) => perm !== user?.team);
    setIsLoading(true);
    try {
      const result = await fetchWorkers(
        filters.department,
        dateForAttendance,
        // we get permissions from logged in user
        permissions,
        search
      );
      setData(result);
    } catch (error) {
      toast.error("Failed to fetch workers");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data based on user type
  useEffect(() => {
    if (isSuperAdmin) {
      querySuperAdminWorkers(1, 20, debouncedSearchTerm);
    } else if (isChurchAdmin) {
      queryChurchAdminWorkers(1, 20, debouncedSearchTerm);
    } else if (isAdminMember) {
      queryAdminWorkers(debouncedSearchTerm);
    } else {
      queryWorkers(debouncedSearchTerm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debouncedSearchTerm]);

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
        querySuperAdminWorkers(1, 20, searchTerm);
      } else if (isChurchAdmin) {
        queryChurchAdminWorkers(1, 20, searchTerm);
      } else if (isAdminMember) {
        queryAdminWorkers(searchTerm);
      } else {
        queryWorkers(searchTerm);
      }
    } catch (error) {
      toast.error("Failed to delete worker");
    } finally {
      setIsLoading(false);
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
  const splitName = (fullName) => {
    if (!fullName) return { firstName: "", lastName: "" };
    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    return { firstName, lastName };
  };

  if (isLoading && data.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <Header />
      <Layout>
        <div>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                Workers
              </h1>
            </div>
            <div className="self-start sm:self-center flex space-x-2">
              <button
                className="bg-green-500 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[140px]"
                onClick={() => navigate("/church-admin/add-worker")}
              >
                Add New Worker
              </button>
              <button
                className="bg-gray-500 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[140px]"
                  onClick={() => {
                    if (isSuperAdmin) {
                      querySuperAdminWorkers(1, 20, searchTerm);
                    } else if (isChurchAdmin) {
                      queryChurchAdminWorkers(1, 20, searchTerm);
                    } else if (isAdminMember) {
                      queryAdminWorkers(searchTerm);
                    } else {
                      queryWorkers(searchTerm);
                    }
                  }}
              >
                Refresh Workers
              </button>
              <button
                className="bg-blue-600 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[140px] hover:bg-blue-700"
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
                      className="h-5 w-5 text-gray-400"
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
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg
                        className="h-5 w-5 text-gray-400 hover:text-gray-600"
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
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
              <span className="text-sm text-gray-500">
                Active filters:
              </span>
              {Object.entries(filters)
                .filter(([_, value]) => value !== "All")
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {key}: {value}
                    <button
                      onClick={() => handleFilterChange(key, "All")}
                      className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
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
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          First Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Team
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
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

                          return (
                            <>
                              <tr key={person.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {person.id || person.workerid || idx + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <Link
                                    to={`/worker/${person.id}/attendance?department=${encodeURIComponent(person.department || "")}&team=${encodeURIComponent(person.team || "")}`}
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {firstName}
                                  </Link>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {lastName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {person.phonenumber
                                    ? person.phonenumber.startsWith("0")
                                      ? person.phonenumber
                                      : `0${person.phonenumber}`
                                    : ""}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {person.department}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {person.team}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {person.workerrole || person.role || "Worker"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() =>
                                        toggleRowExpansion(person.id)
                                      }
                                      className="text-blue-600 hover:text-blue-900"
                                      title="View Details"
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
                                      className="text-green-600 hover:text-green-900"
                                      title="Edit Worker"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteWorker(person.id)}
                                      className="text-red-600 hover:text-red-900"
                                      title="Delete Worker"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan="8" className="px-6 py-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Other Name
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                  {person.othername || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Email
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                  {person.email || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Birth Date
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                  {person.birthdate || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Gender
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                  {person.gender || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Marital Status
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                  {person.maritalstatus || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Age Range
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                  {person.agerange || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Employment Status
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                  {person.employment || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Occupation
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                  {person.occupation || "N/A"}
                                </p>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Address
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                  {person.address || "N/A"}
                                </p>
                              </div>
                            </div>
                          </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {pagination.total > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => {
                    if (isSuperAdmin) {
                      querySuperAdminWorkers(
                        pagination.page - 1,
                        pagination.limit
                      );
                    } else if (isChurchAdmin) {
                      queryChurchAdminWorkers(
                        pagination.page - 1,
                        pagination.limit
                      );
                    }
                  }}
                  disabled={!pagination.hasPrev}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                    pagination.hasPrev
                      ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    if (isSuperAdmin) {
                      querySuperAdminWorkers(
                        pagination.page + 1,
                        pagination.limit
                      );
                    } else if (isChurchAdmin) {
                      queryChurchAdminWorkers(
                        pagination.page + 1,
                        pagination.limit
                      );
                    }
                  }}
                  disabled={!pagination.hasNext}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                    pagination.hasNext
                      ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
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
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => {
                        if (isSuperAdmin) {
                          querySuperAdminWorkers(
                            pagination.page - 1,
                            pagination.limit
                          );
                        } else if (isChurchAdmin) {
                          queryChurchAdminWorkers(
                            pagination.page - 1,
                            pagination.limit
                          );
                        }
                      }}
                      disabled={!pagination.hasPrev}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                        pagination.hasPrev
                          ? "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
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
                          key={index}
                          onClick={() => {
                            if (typeof page === "number") {
                              if (isSuperAdmin) {
                                querySuperAdminWorkers(page, pagination.limit);
                              } else if (isChurchAdmin) {
                                queryChurchAdminWorkers(page, pagination.limit);
                              }
                            }
                          }}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
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
                        if (isSuperAdmin) {
                          querySuperAdminWorkers(
                            pagination.page + 1,
                            pagination.limit
                          );
                        } else if (isChurchAdmin) {
                          queryChurchAdminWorkers(
                            pagination.page + 1,
                            pagination.limit
                          );
                        }
                      }}
                      disabled={!pagination.hasNext}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                        pagination.hasNext
                          ? "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team
                  </label>
                  <ReactSelectDropdown
                    defaultValue={{
                      value: filters.team,
                      label:
                        filterOptions?.teams?.find((t) => t.value === filters.team)
                          ?.label || "All Teams",
                    }}
                    onChange={(selected) => {
                      handleFilterChange("team", selected?.value);
                      updateDepartmentsForTeam(selected?.value);
                    }}
                    options={filterOptions?.teams || []}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <ReactSelectDropdown
                    defaultValue={{
                      value: filters.department,
                      label:
                        filterOptions?.departments?.find(
                          (d) => d.value === filters.department
                        )?.label || "All Departments",
                    }}
                    onChange={(selected) =>
                      handleFilterChange("department", selected?.value)
                    }
                    options={filterOptions?.departments || []}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All Filters
                </button>

                <div className="flex space-x-3">
                  <button
                    onClick={closeFilterModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
