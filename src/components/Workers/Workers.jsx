import { useLocation, useNavigate } from "react-router-dom";
import Header from "../Header";
import { getDepartmentByUser } from "../../utils/getDepartment";
import { useEffect, useState } from "react";
import { fetchAdminWorkers, fetchWorkers } from "../../services/workers";
import { toast } from "react-toastify";
import { getNextSunday } from "../../utils/getDate";
import ReactSelectDropdown from "../ReactSelect";
import Layout from "../Layout";
import { getAdminSelectOptions } from "../../utils/routeObject";
import { ADMIN_ENUMS } from "../../utils/enums";
import { checkAdminStatus } from "../../utils/checkAdminStatus";
import ViewHistoryButton from "../ViewHistoryButton";
import {
  getCachedFilterData,
  getFilterOptions,
  initializeFilterData,
} from "../../utils/filterCache";
import { teamsAndDepartments } from "../../utils/teams";
import {
  TrashIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import GenericModal from "../GenericModal";
import LoadingState from "../LoadingState";

export default function Workers() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(sessionStorage.getItem("authUser"));

  // All hooks must be called before any conditional returns
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dateForAttendance = getNextSunday();
  const [refresh, setRefresh] = useState(0);
  const [filters, setFilters] = useState({
    department: "All",
    team: "All",
  });
  const team = getDepartmentByUser(location.pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isSuperAdmin = team.department === "Super Admin";
  const isAdminMember = checkAdminStatus(location.pathname);
  const optionsAdmin = getAdminSelectOptions(
    isChurchAdmin || isSuperAdmin,
    team
  );
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterOptions, setFilterOptions] = useState({
    departments: [{ value: "All", label: "All Departments" }],
    teams: [{ value: "All", label: "All Teams" }],
  });

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

  const fallbackFilterOptions = generateFallbackFilterOptions();

  const querySuperAdminWorkers = async (page = 1, limit = 20, search = "") => {
    setIsLoading(true);
    try {
      const accessToken = sessionStorage.getItem("accessToken");

      if (!accessToken) {
        throw new Error("No access token found. Please log in again.");
      }

      const queryParams = new URLSearchParams();

      // Add pagination parameters
      queryParams.append("page", page.toString());
      queryParams.append("limit", limit.toString());

      // Add sorting parameter
      queryParams.append("sortBy", "team");

      // Add search parameter if provided
      if (search && search.trim()) {
        queryParams.append("search", search.trim());
      }

      // Add filter parameters if not "All"
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "All") {
          queryParams.append(key, value);
        }
      });

      const url = `https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/workers?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error occurred" }));
        throw new Error(
          errorData.message ||
            `HTTP ${response.status}: Failed to fetch workers`
        );
      }

      const result = await response.json();

      // Handle the actual API response structure: result.data.data
      let workersData = [];
      let paginationInfo = null;

      if (result.data && result.data.data && Array.isArray(result.data.data)) {
        workersData = result.data.data;
        paginationInfo = result.data.pagination;
      } else if (result.data && Array.isArray(result.data)) {
        workersData = result.data;
      } else if (Array.isArray(result)) {
        workersData = result;
      } else {
        workersData = [];
      }

      // If no data is returned, set empty array instead of undefined
      setData(workersData || []);

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
  };

  const queryAdminWorkers = (search = "") => {
    setIsLoading(true);
    fetchAdminWorkers("All", "All", dateForAttendance, search)
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error(`Error loading workers: ${error.message}`);
        setIsLoading(false);
      });
  };

  const queryWorkers = (search = "") => {
    setIsLoading(true);
    fetchWorkers(team.department, search)
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch((error) => {
        toast.error(`Error loading workers: ${error.message}`);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (isSuperAdmin) {
      querySuperAdminWorkers();
    } else if (isAdminMember) {
      queryAdminWorkers();
    } else {
      queryWorkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isAdminMember, isSuperAdmin, team.team]);

  // Load filter options from cache on component mount
  useEffect(() => {
    const loadFilterOptions = () => {
      const cachedFilterData = getCachedFilterData();

      if (cachedFilterData) {
        const options = getFilterOptions(cachedFilterData);
        if (options) {
          setFilterOptions(options);
        }
      } else {
        // If no cached data, try to initialize it
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
            .catch((error) => {
              setFilterOptions(fallbackFilterOptions);
            });
        } else {
          setFilterOptions(fallbackFilterOptions);
        }
      }
    };

    loadFilterOptions();
  }, []);

  // Initialize available departments on component mount
  useEffect(() => {
    if (isSuperAdmin && availableDepartments.length === 0) {
      updateDepartmentsForTeam("All"); // Initialize with all departments
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      querySuperAdminWorkers();
    } else if (isAdminMember) {
      queryAdminWorkers();
    } else {
      queryWorkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  // Check if user is super admin - restrict access to super admin only
  const isSuperAdminUser = authUser?.department === "Super Admin";

  // Redirect non-super admin users
  if (!isSuperAdminUser) {
    navigate("/login");
    return null;
  }

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

  const updateDepartmentsForTeam = (selectedTeam) => {
    if (selectedTeam === "All") {
      // If "All Teams" is selected, show all departments
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
      // Find the selected team and get its departments
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
        // Fallback if team not found
        setAvailableDepartments([{ value: "All", label: "All Departments" }]);
      }
    }
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
      querySuperAdminWorkers(1, pagination.limit, normalizedTerm);
    } else if (isAdminMember) {
      queryAdminWorkers(normalizedTerm);
    } else {
      queryWorkers(normalizedTerm);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    if (isSuperAdmin) {
      querySuperAdminWorkers();
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
      const accessToken = sessionStorage.getItem("accessToken");

      const response = await fetch(
        `https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/${workerId}/workers`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error occurred" }));
        throw new Error(
          errorData.message ||
            `HTTP ${response.status}: Failed to delete worker`
        );
      }

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
                onClick={() => navigate("/add-worker")}
              >
                Add New Worker
              </button>
              <button
                className="bg-gray-500 px-6 py-2 text-white rounded-lg text-sm font-medium min-w-[140px]"
                onClick={() => querySuperAdminWorkers()}
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
              {isSuperAdmin && (
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
          {isSuperAdmin && Object.values(filters).some((filter) => filter !== "All") && (
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
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
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
                                  {firstName}
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
                                      className="text-gray-600 hover:text-gray-900"
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
                                      className="text-blue-600 hover:text-blue-900"
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
                              {/* Expanded Row */}
                              {isExpanded && (
                                <tr className="bg-gray-50">
                                  <td colSpan="8" className="px-6 py-4">
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
                                          Email Address
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                          {person.email || "N/A"}
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
                                          Birthday
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                          {person.birthdate || "N/A"}
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
                                          Gender
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                          {person.gender || "N/A"}
                                        </p>
                                      </div>
                                      <div className="md:col-span-2 lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700">
                                          Address
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                          {person.address || "N/A"}
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
                                          Worker Role
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                          {person.workerrole || person.role || "N/A"}
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
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}

                      {/* Show message when no data */}
                      {Array.isArray(data) && data.length === 0 && (
                        <tr>
                          <td
                            colSpan="8"
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
                                No workers found
                              </p>
                              <p className="text-sm text-gray-500">
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
                            colSpan="8"
                            className="px-6 py-8 text-center text-gray-500"
                          >
                            <div className="flex flex-col items-center">
                              <svg
                                className="w-12 h-12 text-red-400 mb-4"
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
                              <p className="text-lg font-medium text-red-900 mb-2">
                                Data format error
                              </p>
                              <p className="text-sm text-red-600">
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
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-700">
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
                        onClick={() =>
                          querySuperAdminWorkers(
                            pagination.page - 1,
                            pagination.limit
                          )
                        }
                        disabled={!pagination.hasPrev}
                        className={`px-3 py-1 text-sm font-medium rounded-md ${
                          pagination.hasPrev
                            ? "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                            : "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
                        }`}
                      >
                        ←
                      </button>

                      {/* Page Numbers - Always show exactly 5 numbers */}
                      {(() => {
                        const currentPage = pagination.page;
                        const totalPages = pagination.totalPages;
                        const pages = [];

                        // Calculate which 5 pages to show
                        let startPage, endPage;

                        if (totalPages <= 5) {
                          // If total pages is 5 or less, show all pages
                          startPage = 1;
                          endPage = totalPages;
                        } else if (currentPage <= 3) {
                          // If current page is in first 3, show pages 1-5
                          startPage = 1;
                          endPage = 5;
                        } else if (currentPage >= totalPages - 2) {
                          // If current page is in last 3, show last 5 pages
                          startPage = totalPages - 4;
                          endPage = totalPages;
                        } else {
                          // Show current page in the middle with 2 pages on each side
                          startPage = currentPage - 2;
                          endPage = currentPage + 2;
                        }

                        // Generate the 5 page numbers
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() =>
                                querySuperAdminWorkers(i, pagination.limit)
                              }
                              className={`px-3 py-1 text-sm font-medium rounded-md ${
                                currentPage === i
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {i}
                            </button>
                          );
                        }

                        return pages;
                      })()}

                      {/* Next Button */}
                      <button
                        onClick={() =>
                          querySuperAdminWorkers(
                            pagination.page + 1,
                            pagination.limit
                          )
                        }
                        disabled={!pagination.hasNext}
                        className={`px-3 py-1 text-sm font-medium rounded-md ${
                          pagination.hasNext
                            ? "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                            : "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
      </Layout>
    </div>
  );
}
