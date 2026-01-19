import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { teamsAndDepartments } from "../utils/teams";
import BirthDatePicker from "../components/BirthDatePicker";

export default function ChurchAdminAddWorker() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("single"); // 'single' or 'bulk'
  const [isLoading, setIsLoading] = useState(false);

  // Single worker form state for Church Admin
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

  // Load filter options
  const loadFilterOptions = () => {
    const teams = teamsAndDepartments.map(team => ({ 
      value: team.team, 
      label: team.team 
    }));
    
    const departments = teamsAndDepartments.flatMap(team => 
      team.department.map(dept => ({ 
        value: dept, 
        label: dept 
      }))
    );

    setFilterOptions({
      teams,
      departments: [{ value: "All", label: "All Departments" }, ...departments]
    });
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Handle single worker form submission
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['firstname', 'lastname', 'email', 'phonenumber', 'department', 'team', 'workerrole', 'birthdate', 'agerange', 'gender', 'maritalstatus', 'employment', 'address'];
    const missingFields = requiredFields.filter(field => !newWorker[field]);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      const accessToken = sessionStorage.getItem("accessToken");
      
      // Normalize workerrole for case-sensitive values before sending
      // Convert singular to plural for backend
      const workerToSend = { ...newWorker };
      if (workerToSend.workerrole) {
        const roleLower = workerToSend.workerrole.toLowerCase().trim();
        if (roleLower === "pastoral leader" || roleLower === "pastoral leaders") {
          workerToSend.workerrole = "Pastoral Leaders";
        } else if (roleLower === "directional leader" || roleLower === "directional leaders") {
          workerToSend.workerrole = "Directional Leaders";
        }
      }
      
      const response = await fetch(
        "https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/workers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(workerToSend),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to add worker`);
      }

      await response.json();
      toast.success("Worker added successfully!");
      
      // Reset form
      setNewWorker({
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
      
    } catch (error) {
      console.error("Error adding worker:", error);
      toast.error(error.message || "Failed to add worker");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk upload
  const handleBulkUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setParsedWorkers([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Convert to worker objects
        const workers = convertToWorkerObjects(jsonData);
        setParsedWorkers(workers);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Error parsing file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Convert Excel data to worker objects
  const convertToWorkerObjects = (data) => {
    return data
      .map((row, index) => {
        // Map common column names
        const worker = {
          firstname: row["First Name"] || row["firstname"] || row["First Name"] || "",
          lastname: row["Last Name"] || row["lastname"] || row["Last Name"] || "",
          othername: row["Other Name"] || row["othername"] || row["Other Name"] || "",
          email: row["Email"] || row["email"] || row["Email Address"] || "",
          phonenumber: row["Phone"] || row["phonenumber"] || row["Phone Number"] || "",
          department: row["Department"] || row["department"] || "",
          team: row["Team"] || row["team"] || "",
          workerrole: row["Worker Role"] || row["workerrole"] || row["Role"] || row["role"] || "Worker",
          birthdate: row["Birth Date"] || row["birthdate"] || row["Birth Date"] || "",
          agerange: row["Age Range"] || row["agerange"] || row["Age Range"] || "",
          gender: row["Gender"] || row["gender"] || "",
          maritalstatus: row["Marital Status"] || row["maritalstatus"] || row["Marital Status"] || "",
          employment: row["Employment Status"] || row["employment"] || row["Employment"] || "",
          occupation: row["Occupation"] || row["occupation"] || "",
          address: row["Address"] || row["address"] || "",
        };

        // Normalize workerrole for case-sensitive values
        // Convert singular to plural for backend
        if (worker.workerrole) {
          const roleLower = worker.workerrole.toLowerCase().trim();
          if (roleLower === "pastoral leader" || roleLower === "pastoral leaders") {
            worker.workerrole = "Pastoral Leaders";
          } else if (roleLower === "directional leader" || roleLower === "directional leaders") {
            worker.workerrole = "Directional Leaders";
          }
        }

        // Validate required fields
        const requiredFields = ['firstname', 'lastname', 'email', 'phonenumber', 'department', 'team'];
        const missingFields = requiredFields.filter(field => !worker[field]);
        
        if (missingFields.length > 0) {
          return { ...worker, _error: `Missing required fields: ${missingFields.join(', ')}`, _row: index + 2 };
        }

        return worker;
      })
      .filter(worker => worker.firstname || worker.lastname); // Only include rows with at least a name
  };

  // Process bulk upload
  const processBulkUpload = async () => {
    if (parsedWorkers.length === 0) {
      toast.error("No valid workers found in the file");
      return;
    }

    // Pre-upload validation
    const validWorkers = parsedWorkers.filter(worker => !worker._error);
    const invalidWorkers = parsedWorkers.filter(worker => worker._error);

    if (invalidWorkers.length > 0) {
      toast.error(`Found ${invalidWorkers.length} invalid rows. Please fix the data and try again.`);
      return;
    }

    setIsLoading(true);
    setBulkUploadProgress({ total: validWorkers.length, completed: 0, errors: [] });

    const accessToken = sessionStorage.getItem("accessToken");
    const errors = [];

    for (let i = 0; i < validWorkers.length; i++) {
      try {
        const worker = { ...validWorkers[i] };

        // Normalize workerrole for case-sensitive values before sending
        // Convert singular to plural for backend
        if (worker.workerrole) {
          const roleLower = worker.workerrole.toLowerCase().trim();
          if (roleLower === "pastoral leader" || roleLower === "pastoral leaders") {
            worker.workerrole = "Pastoral Leaders";
          } else if (roleLower === "directional leader" || roleLower === "directional leaders") {
            worker.workerrole = "Directional Leaders";
          }
        }

        const response = await fetch(
          "https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/workers",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(worker),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
          errors.push({
            worker: `${worker.firstname} ${worker.lastname}`,
            error: errorData.message || `HTTP ${response.status}: Failed to add worker`,
          });
        }
      } catch (error) {
        errors.push({
          worker: `${validWorkers[i].firstname} ${validWorkers[i].lastname}`,
          error: error.message,
        });
      }

      setBulkUploadProgress(prev => ({
        ...prev,
        completed: i + 1,
        errors,
      }));
    }

    setIsLoading(false);
    
    if (errors.length === 0) {
      toast.success(`Successfully added ${validWorkers.length} workers!`);
      setParsedWorkers([]);
      setUploadedFile(null);
    } else {
      toast.error(`Added ${validWorkers.length - errors.length} workers successfully, but ${errors.length} failed.`);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
          file.type === "application/vnd.ms-excel" ||
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.xls')) {
        setUploadedFile(file);
        const event = { target: { files: [file] } };
        handleBulkUpload(event);
      } else {
        toast.error("Please upload an Excel file (.xlsx or .xls)");
      }
    }
  };

  return (
    <Layout>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-3xl font-bold text-gray-900">Add Workers</h1>
                <p className="text-gray-600">Add new workers to the system</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate("/church-admin/workers")}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setMode("single")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === "single"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Single Worker
              </button>
              <button
                onClick={() => setMode("bulk")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === "bulk"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Bulk Upload
              </button>
            </div>
          </div>

          {/* Single Worker Form */}
          {mode === "single" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Add Single Worker</h2>
              
              <form onSubmit={handleSingleSubmit} className="space-y-6">
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
                    <BirthDatePicker
                      value={newWorker.birthdate}
                      onChange={(value) =>
                        setNewWorker({
                          ...newWorker,
                          birthdate: value,
                        })
                      }
                      placeholder="Select birth date (e.g. 12th January)"
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

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate("/church-admin/workers")}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Adding..." : "Add Worker"}
                </button>
              </div>
            </form>
          </div>
          )}

          {/* Bulk Upload Form */}
          {mode === "bulk" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Bulk Upload Workers</h2>
              
              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('bulk-upload').click()}
              >
                <div className="space-y-4">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">Upload Excel File</p>
                    <p className="text-sm text-gray-500">Drag and drop your Excel file here, or click to browse</p>
                  </div>
                  <input
                    id="bulk-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBulkUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File Info */}
              {uploadedFile && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>File:</strong> {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              )}

              {/* Parsed Data Preview */}
              {parsedWorkers.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Preview ({parsedWorkers.length} workers found)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {parsedWorkers.slice(0, 10).map((worker, index) => (
                          <tr key={index} className={worker._error ? "bg-red-50" : ""}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {worker.firstname} {worker.lastname}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {worker.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {worker.phonenumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {worker.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {worker._error ? (
                                <span className="text-red-600">{worker._error}</span>
                              ) : (
                                <span className="text-green-600">Valid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedWorkers.length > 10 && (
                      <p className="mt-2 text-sm text-gray-500">
                        Showing first 10 workers. {parsedWorkers.length - 10} more workers will be processed.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {bulkUploadProgress.total > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Upload Progress</span>
                    <span className="text-sm text-gray-500">
                      {bulkUploadProgress.completed} / {bulkUploadProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(bulkUploadProgress.completed / bulkUploadProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  {bulkUploadProgress.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-red-600 mb-2">Errors:</h4>
                      <div className="space-y-1">
                        {bulkUploadProgress.errors.slice(0, 5).map((error, index) => (
                          <p key={index} className="text-xs text-red-600">
                            {error.worker}: {error.error}
                          </p>
                        ))}
                        {bulkUploadProgress.errors.length > 5 && (
                          <p className="text-xs text-red-600">
                            ... and {bulkUploadProgress.errors.length - 5} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => navigate("/church-admin/workers")}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={processBulkUpload}
                  disabled={parsedWorkers.length === 0 || isLoading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Uploading..." : "Upload Workers"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
