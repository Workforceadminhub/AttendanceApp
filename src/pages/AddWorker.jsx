import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import ReactSelectDropdown from "../components/ReactSelect";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { teamsAndDepartments } from "../utils/teams";

export default function AddWorker() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("single"); // 'single' or 'bulk'
  const [isLoading, setIsLoading] = useState(false);

  // Single worker form state for Super Admin
  const [newWorker, setNewWorker] = useState({
    firstname: "",
    lastname: "",
    othername: "",
    email: "",
    phonenumber: "",
    maritalstatus: "",
    department: "",
    team: "",
    workerrole: "",
    birthdate: "",
    agerange: "",
    gender: "",
    address: "",
    occupation: "",
    employment: "",
  });

  // Bulk upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedWorkers, setParsedWorkers] = useState([]);
  const [bulkUploadProgress, setBulkUploadProgress] = useState({
    total: 0,
    completed: 0,
    errors: [],
  });

  // Filter options for dropdowns
  const [filterOptions, setFilterOptions] = useState({
    departments: [{ value: "All", label: "All Departments" }],
    teams: teamsAndDepartments.map(team => ({ value: team.team, label: team.team })),
  });

  // Check if user is super admin
  useEffect(() => {
    const authUser = JSON.parse(sessionStorage.getItem("authUser"));
    if (!authUser || authUser.department !== "Super Admin") {
      toast.error("Access denied. Super Admin access required.");
      navigate("/workers");
      return;
    }
  }, [navigate]);

  // Update departments when team changes
  useEffect(() => {
    if (newWorker.team) {
      const selectedTeam = teamsAndDepartments.find(team => team.team === newWorker.team);
      if (selectedTeam) {
        setFilterOptions(prev => ({
          ...prev,
          departments: selectedTeam.department.map(dept => ({ value: dept, label: dept }))
        }));
      }
    } else {
      setFilterOptions(prev => ({
        ...prev,
        departments: [{ value: "All", label: "All Departments" }]
      }));
    }
  }, [newWorker.team]);

  // Load filter options from cache
  useEffect(() => {
    const loadFilterOptions = () => {
      try {
        // Clear old cache to ensure fresh data
        localStorage.removeItem("filterCache");
        
        const cachedData = localStorage.getItem("filterCache");
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const now = new Date().getTime();
          const cacheAge = now - timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours

          if (cacheAge < maxAge && data) {
            setFilterOptions(data);
            return;
          }
        }

        // Fallback to proper teams data
        setFilterOptions({
          departments: [{ value: "All", label: "All Departments" }],
          teams: teamsAndDepartments.map(team => ({ value: team.team, label: team.team })),
        });
      } catch (error) {
        // Silent error handling
      }
    };

    loadFilterOptions();
  }, []);

  // Single worker functions
  const addNewWorker = async () => {
    // Validate required fields
    if (
      !newWorker.firstname ||
      !newWorker.lastname ||
      !newWorker.email ||
      !newWorker.phonenumber ||
      !newWorker.department ||
      !newWorker.team
    ) {
      toast.error(
        "Please fill in all required fields (First Name, Last Name, Email, Phone Number, Department, Team)"
      );
      return;
    }

    setIsLoading(true);
    try {
      const accessToken = sessionStorage.getItem("accessToken");

      const response = await fetch(
        "https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/workers",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newWorker),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error occurred" }));
        throw new Error(
          errorData.message || `HTTP ${response.status}: Failed to add worker`
        );
      }

      const result = await response.json();
      toast.success("Worker added successfully");

      // Reset form
      setNewWorker({
        firstname: "",
        lastname: "",
        othername: "",
        email: "",
        phonenumber: "",
        maritalstatus: "Single",
        department: "",
        team: "",
        workerrole: "",
        birthdate: "",
        agerange: "",
        gender: "Male",
        address: "",
        occupation: "",
      });
    } catch (error) {
      toast.error("Failed to add worker");
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk upload functions
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid Excel file (.xlsx, .xls) or CSV file");
      return;
    }

    setUploadedFile(file);
    parseExcelFile(file);
  };

  const parseExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Convert to worker objects
        const workers = convertToWorkerObjects(jsonData);
        setParsedWorkers(workers);

        if (workers.length === 0) {
          toast.error("No valid worker data found in the Excel file");
        } else {
          toast.success(
            `Successfully parsed ${workers.length} workers from Excel file`
          );
        }
      } catch (error) {
        // Silent error handling
        toast.error("Error parsing Excel file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const convertToWorkerObjects = (jsonData) => {
    if (jsonData.length < 2) return [];

    // Assume first row is headers
    const headers = jsonData[0].map(
      (h) => h?.toString().toLowerCase().trim() || ""
    );
    const dataRows = jsonData.slice(1);

    // Map headers to our expected fields
    const fieldMapping = {
      firstname: ["first name", "firstname", "first_name"],
      lastname: ["last name", "lastname", "last_name"],
      othername: [
        "other name",
        "othername",
        "other_name",
        "middle name",
        "middlename",
      ],
      email: ["email", "email address"],
      phonenumber: [
        "phone",
        "phone number",
        "phonenumber",
        "phone_number",
        "mobile",
      ],
      maritalstatus: ["marital status", "maritalstatus", "marital_status"],
      department: ["department", "dept"],
      team: ["team"],
      workerrole: ["worker role", "workerrole", "worker_role", "role"],
      birthdate: ["birth date", "birthdate", "birth_date", "dob"],
      agerange: ["age range", "agerange", "age_range"],
      gender: ["gender", "sex"],
      address: ["address", "location"],
      occupation: ["occupation", "job", "work"],
    };

    const workers = [];

    dataRows.forEach((row, index) => {
      if (row.every((cell) => !cell || cell.toString().trim() === "")) return; // Skip empty rows

      const worker = {
        firstname: "",
        lastname: "",
        othername: "",
        email: "",
        phonenumber: "",
        maritalstatus: "Single",
        department: "",
        team: "",
        workerrole: "",
        birthdate: "",
        agerange: "",
        gender: "Male",
        address: "",
        occupation: "",
      };

      // Map data based on headers
      headers.forEach((header, colIndex) => {
        const value = row[colIndex]?.toString().trim() || "";

        // Find matching field
        routeLoop: for (const [field, aliases] of Object.entries(
          fieldMapping
        )) {
          if (aliases.includes(header)) {
            worker[field] = value;
            break routeLoop;
          }
        }
      });

      // Only add if we have all required fields (same as single worker form)
      if (
        worker.firstname &&
        worker.lastname &&
        worker.email &&
        worker.phonenumber &&
        worker.department &&
        worker.team
      ) {
        workers.push(worker);
      }
    });

    return workers;
  };

  const processBulkUpload = async () => {
    if (parsedWorkers.length === 0) {
      toast.error("No workers to upload");
      return;
    }

    // Validate that all workers have required fields
    const invalidWorkers = parsedWorkers.filter(worker => 
      !worker.firstname || 
      !worker.lastname || 
      !worker.email || 
      !worker.phonenumber || 
      !worker.department || 
      !worker.team
    );

    if (invalidWorkers.length > 0) {
      toast.error(
        `${invalidWorkers.length} workers are missing required fields (First Name, Last Name, Email, Phone Number, Department, Team). Please check your Excel file.`
      );
      return;
    }

    setIsLoading(true);
    setBulkUploadProgress({
      total: parsedWorkers.length,
      completed: 0,
      errors: [],
    });

    const accessToken = sessionStorage.getItem("accessToken");
    const errors = [];

    for (let i = 0; i < parsedWorkers.length; i++) {
      const worker = parsedWorkers[i];

      try {
        const response = await fetch(
          "https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/workers",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(worker),
          }
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Unknown error occurred" }));
          throw new Error(
            errorData.message || `HTTP ${response.status}: Failed to add worker`
          );
        }

        setBulkUploadProgress((prev) => ({
          ...prev,
          completed: prev.completed + 1,
        }));
      } catch (error) {
        // Silent error handling
        errors.push({
          worker: `${worker.firstname} ${worker.lastname}`,
          error: error.message,
        });
      }

      // Small delay to prevent overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setBulkUploadProgress((prev) => ({
      ...prev,
      errors: errors,
    }));

    // Show results
    const successCount = parsedWorkers.length - errors.length;
    if (successCount > 0) {
      toast.success(`Successfully added ${successCount} workers`);
    }
    if (errors.length > 0) {
      toast.error(
        `Failed to add ${errors.length} workers. Check console for details.`
      );
      // Log errors silently
    }

    setIsLoading(false);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <Header />
      <Layout>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Super Admin - Add New Workers
            </h1>
            <p className="text-gray-600 mt-2">
              Add individual workers or upload multiple workers from Excel using
              the Super Admin API endpoint
            </p>
          </div>

          <>
            {/* Mode Toggle */}
            <div className="flex space-x-4 mb-8 border-b border-gray-200">
              <button
                onClick={() => setMode("single")}
                className={`px-6 py-3 text-sm font-medium rounded-md transition-colors ${mode === "single"
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-100 text-gray-600 border border-gray-300"
                  }`}
              >
                Single Worker
              </button>
              <button
                onClick={() => setMode("bulk")}
                className={`px-6 py-3 text-sm font-medium rounded-md transition-colors ${mode === "bulk"
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-100 text-gray-600 border border-gray-300"
                  }`}
              >
                Bulk Upload
              </button>
            </div>

            {/* Single Worker Form */}
            {mode === "single" && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Add Single Worker
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newWorker.firstname}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          firstname: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter first name"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newWorker.lastname}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          lastname: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter last name"
                    />
                  </div>

                  {/* Other Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Other Name
                    </label>
                    <input
                      type="text"
                      value={newWorker.othername}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          othername: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter other name"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newWorker.gender}
                      onChange={(e) =>
                        setNewWorker({ ...newWorker, gender: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newWorker.phonenumber}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          phonenumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newWorker.email}
                      onChange={(e) =>
                        setNewWorker({ ...newWorker, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Team */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newWorker.team}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          team: e.target.value,
                          department: "", // Reset department when team changes
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Team</option>
                      {filterOptions.teams.map((team) => (
                        <option key={team.value} value={team.value}>
                          {team.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newWorker.department}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          department: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Department</option>
                      {filterOptions.departments.map((dept) => (
                        <option key={dept.value} value={dept.value}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Worker Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Worker Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newWorker.workerrole}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          workerrole: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Worker Role</option>
                      <option value="Worker">Worker</option>
                      <option value="Assistant Small Group Leader">Assistant Small Group Leader</option>
                      <option value="Small Group Leader">Small Group Leader</option>
                      <option value="E-Group Leader">E-Group Leader</option>
                      <option value="Assistant Cell Leader">Assistant Cell Leader</option>
                      <option value="Cell Leader">Cell Leader</option>
                      <option value="Interest Group Leader">Interest Group Leader</option>
                      <option value="Assistant HOD">Assistant HOD</option>
                      <option value="Zonal Leader">Zonal Leader</option>
                      <option value="Admin">Admin</option>
                      <option value="District Leader">District Leader</option>
                      <option value="HOD">HOD</option>
                      <option value="Assistant Sub Team Head">Assistant Sub Team Head</option>
                      <option value="Sub Team Head">Sub Team Head</option>
                      <option value="Assistant Community Leader">Assistant Community Leader</option>
                      <option value="Community Leader">Community Leader</option>
                      <option value="Pastoral Leader">Pastoral Leader</option>
                      <option value="Directional Leader">Directional Leader</option>
                    </select>
                  </div>

                  {/* Birth Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Birth Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newWorker.birthdate}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          birthdate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 12th June, 1st January"
                    />
                  </div>

                  {/* Marital Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marital Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newWorker.maritalstatus}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          maritalstatus: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Marital Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widow">Widow</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>

                  {/* Age Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age Range <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newWorker.agerange}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          agerange: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Age Range</option>
                      <option value="18-25">18-25</option>
                      <option value="26-30">26-30</option>
                      <option value="31-35">31-35</option>
                      <option value="36-40">36-40</option>
                      <option value="41-45">41-45</option>
                      <option value="46-50">46-50</option>
                      <option value="51 & Above">51 & Above</option>
                    </select>
                  </div>

                  {/* Employment Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employment Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newWorker.employment}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          employment: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Employment Status</option>
                      <option value="Employed">Employed</option>
                      <option value="Self-Employed">Self-Employed</option>
                      <option value="Student">Student</option>
                      <option value="Unemployed">Unemployed</option>
                    </select>
                  </div>

                  {/* Occupation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Occupation
                    </label>
                    <input
                      type="text"
                      value={newWorker.occupation}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          occupation: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter occupation"
                    />
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newWorker.address}
                      onChange={(e) =>
                        setNewWorker({
                          ...newWorker,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter address"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => navigate("/workers/super-admin")}
                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={addNewWorker}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Adding Workers...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Add Workers
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Bulk Upload Section */}
            {mode === "bulk" && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Bulk Upload Workers
                </h2>
              </div>

              <div className="space-y-6">
                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Excel File
                  </label>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200"
                    onClick={() => document.getElementById('file-upload').click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        handleFileUpload({ target: { files } });
                      }
                    }}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div className="text-center">
                        <p className="text-lg font-medium text-gray-700 mb-2">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-gray-500">
                          Supported formats: .xlsx, .xls, .csv
                        </p>
                        <p className="text-sm text-gray-500">
                          First row should contain headers
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Preview Section */}
                {uploadedFile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">
                      File: {uploadedFile.name}
                    </h3>
                    <p className="text-sm text-blue-700">
                      Parsed {parsedWorkers.length} workers
                    </p>
                  </div>
                )}

                {/* Workers Preview */}
                {parsedWorkers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Workers Preview (First 10)
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-80 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Team
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Department
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {parsedWorkers.slice(0, 10).map((worker, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {worker.firstname} {worker.lastname}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {worker.email}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {worker.team}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {worker.department}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parsedWorkers.length > 10 && (
                          <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50">
                            ... and {parsedWorkers.length - 10} more workers
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {bulkUploadProgress.total > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Upload Progress
                    </h3>
                    <div className="bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                        style={{
                          width: `${(bulkUploadProgress.completed /
                              bulkUploadProgress.total) *
                            100
                            }%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {bulkUploadProgress.completed} of{" "}
                      {bulkUploadProgress.total} workers processed
                    </p>

                    {bulkUploadProgress.errors.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-red-600 font-medium">
                          Errors:
                        </p>
                        <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-200 rounded p-3">
                          {bulkUploadProgress.errors.map((error, index) => (
                            <p key={index} className="text-xs text-red-600">
                              {error.worker}: {error.error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* Bulk Upload Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => navigate("/workers/super-admin")}
                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={processBulkUpload}
                    disabled={isLoading || parsedWorkers.length === 0}
                    className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading
                      ? "Uploading..."
                      : `Upload ${parsedWorkers.length} Workers`}
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        </div>
      </Layout>
    </div>
  );
}
