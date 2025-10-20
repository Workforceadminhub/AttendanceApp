import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Layout from '../components/Layout';
// No longer needed
import ReactSelectDropdown from '../components/ReactSelect';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

export default function AddWorker() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('single'); // 'single' or 'bulk'
  const [isLoading, setIsLoading] = useState(false);
  
  // Single worker form state
  const [newWorker, setNewWorker] = useState({
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
    occupation: ""
  });

  // Bulk upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedWorkers, setParsedWorkers] = useState([]);
  const [bulkUploadProgress, setBulkUploadProgress] = useState({
    total: 0,
    completed: 0,
    errors: []
  });

  // Filter options for dropdowns
  const [filterOptions, setFilterOptions] = useState({
    departments: [{ value: "All", label: "All Departments" }],
    teams: [{ value: "All", label: "All Teams" }]
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

  // Load filter options from cache
  useEffect(() => {
    const loadFilterOptions = () => {
      try {
        const cachedData = localStorage.getItem('filterCache');
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
        
        // Fallback to basic options
        setFilterOptions({
          departments: [
            { value: "All", label: "All Departments" },
            { value: "Engineering", label: "Engineering" },
            { value: "Marketing", label: "Marketing" },
            { value: "HR", label: "HR" }
          ],
          teams: [
            { value: "All", label: "All Teams" },
            { value: "Backend", label: "Backend" },
            { value: "Frontend", label: "Frontend" },
            { value: "DevOps", label: "DevOps" }
          ]
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
    if (!newWorker.firstname || !newWorker.lastname || !newWorker.email || !newWorker.phonenumber || !newWorker.department || !newWorker.team) {
      toast.error("Please fill in all required fields (First Name, Last Name, Email, Phone Number, Department, Team)");
      return;
    }

    setIsLoading(true);
    try {
      const accessToken = sessionStorage.getItem("accessToken");
      
      const response = await fetch('https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/workers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWorker)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to add worker`);
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
        occupation: ""
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid Excel file (.xlsx, .xls) or CSV file');
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
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Convert to worker objects
        const workers = convertToWorkerObjects(jsonData);
        setParsedWorkers(workers);
        
        if (workers.length === 0) {
          toast.error('No valid worker data found in the Excel file');
        } else {
          toast.success(`Successfully parsed ${workers.length} workers from Excel file`);
        }
      } catch (error) {
        // Silent error handling
        toast.error('Error parsing Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const convertToWorkerObjects = (jsonData) => {
    if (jsonData.length < 2) return [];

    // Assume first row is headers
    const headers = jsonData[0].map(h => h?.toString().toLowerCase().trim() || '');
    const dataRows = jsonData.slice(1);

    // Map headers to our expected fields
    const fieldMapping = {
      'firstname': ['first name', 'firstname', 'first_name'],
      'lastname': ['last name', 'lastname', 'last_name'],
      'othername': ['other name', 'othername', 'other_name', 'middle name', 'middlename'],
      'email': ['email', 'email address'],
      'phonenumber': ['phone', 'phone number', 'phonenumber', 'phone_number', 'mobile'],
      'maritalstatus': ['marital status', 'maritalstatus', 'marital_status'],
      'department': ['department', 'dept'],
      'team': ['team'],
      'workerrole': ['worker role', 'workerrole', 'worker_role', 'role'],
      'birthdate': ['birth date', 'birthdate', 'birth_date', 'dob'],
      'agerange': ['age range', 'agerange', 'age_range'],
      'gender': ['gender', 'sex'],
      'address': ['address', 'location'],
      'occupation': ['occupation', 'job', 'work']
    };

    const workers = [];

    dataRows.forEach((row, index) => {
      if (row.every(cell => !cell || cell.toString().trim() === '')) return; // Skip empty rows

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
        occupation: ""
      };

      // Map data based on headers
      headers.forEach((header, colIndex) => {
        const value = row[colIndex]?.toString().trim() || '';
        
        // Find matching field
        routeLoop: for (const [field, aliases] of Object.entries(fieldMapping)) {
          if (aliases.includes(header)) {
            worker[field] = value;
            break routeLoop;
          }
        }
      });

      // Only add if we have at least firstname and email
      if (worker.firstname && worker.email) {
        workers.push(worker);
      }
    });

    return workers;
  };

  const processBulkUpload = async () => {
    if (parsedWorkers.length === 0) {
      toast.error('No workers to upload');
      return;
    }

    setIsLoading(true);
    setBulkUploadProgress({
      total: parsedWorkers.length,
      completed: 0,
      errors: []
    });

    const accessToken = sessionStorage.getItem("accessToken");
    const errors = [];

    for (let i = 0; i < parsedWorkers.length; i++) {
      const worker = parsedWorkers[i];
      
      try {
        const response = await fetch('https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/workers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(worker)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
          throw new Error(errorData.message || `HTTP ${response.status}: Failed to add worker`);
        }

        setBulkUploadProgress(prev => ({
          ...prev,
          completed: prev.completed + 1
        }));

      } catch (error) {
        // Silent error handling
        errors.push({
          worker: `${worker.firstname} ${worker.lastname}`,
          error: error.message
        });
      }

      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setBulkUploadProgress(prev => ({
      ...prev,
      errors: errors
    }));

    // Show results
    const successCount = parsedWorkers.length - errors.length;
    if (successCount > 0) {
      toast.success(`Successfully added ${successCount} workers`);
    }
    if (errors.length > 0) {
      toast.error(`Failed to add ${errors.length} workers. Check console for details.`);
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
            <h1 className="text-3xl font-bold text-gray-900">Add New Workers</h1>
            <p className="text-gray-600 mt-2">Add individual workers or upload multiple workers from Excel</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex space-x-4 mb-8 border-b border-gray-200">
            <button
              onClick={() => setMode('single')}
              className={`px-6 py-3 text-sm font-medium rounded-md transition-colors ${
                mode === 'single'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              Single Worker
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`px-6 py-3 text-sm font-medium rounded-md transition-colors ${
                mode === 'bulk'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              Bulk Upload
            </button>
          </div>

          {/* Single Worker Form */}
          {mode === 'single' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Add Single Worker</h2>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newWorker.firstname}
                        onChange={(e) => setNewWorker({...newWorker, firstname: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter first name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={newWorker.lastname}
                        onChange={(e) => setNewWorker({...newWorker, lastname: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter last name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Other Name
                      </label>
                      <input
                        type="text"
                        value={newWorker.othername}
                        onChange={(e) => setNewWorker({...newWorker, othername: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter other name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={newWorker.email}
                        onChange={(e) => setNewWorker({...newWorker, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={newWorker.phonenumber}
                        onChange={(e) => setNewWorker({...newWorker, phonenumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter phone number"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender
                      </label>
                      <select
                        value={newWorker.gender}
                        onChange={(e) => setNewWorker({...newWorker, gender: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Work Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Work Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Team *
                      </label>
                      <ReactSelectDropdown
                        defaultValue={{
                          value: newWorker.team,
                          label: newWorker.team || "Select Team"
                        }}
                        onChange={(selected) => setNewWorker({...newWorker, team: selected?.value || ""})}
                        options={filterOptions.teams}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department *
                      </label>
                      <ReactSelectDropdown
                        defaultValue={{
                          value: newWorker.department,
                          label: newWorker.department || "Select Department"
                        }}
                        onChange={(selected) => setNewWorker({...newWorker, department: selected?.value || ""})}
                        options={filterOptions.departments}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Worker Role
                      </label>
                      <input
                        type="text"
                        value={newWorker.workerrole}
                        onChange={(e) => setNewWorker({...newWorker, workerrole: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter worker role"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Occupation
                      </label>
                      <input
                        type="text"
                        value={newWorker.occupation}
                        onChange={(e) => setNewWorker({...newWorker, occupation: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter occupation"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marital Status
                      </label>
                      <select
                        value={newWorker.maritalstatus}
                        onChange={(e) => setNewWorker({...newWorker, maritalstatus: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Birth Date
                      </label>
                      <input
                        type="text"
                        value={newWorker.birthdate}
                        onChange={(e) => setNewWorker({...newWorker, birthdate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., June 2012"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age Range
                      </label>
                      <input
                        type="text"
                        value={newWorker.agerange}
                        onChange={(e) => setNewWorker({...newWorker, agerange: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 30-39"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        value={newWorker.address}
                        onChange={(e) => setNewWorker({...newWorker, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter address"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => navigate("/workers")}
                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={addNewWorker}
                    disabled={isLoading}
                    className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isLoading ? "Adding..." : "Add Worker"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Upload Section */}
          {mode === 'bulk' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Bulk Upload Workers</h2>
              
              <div className="space-y-6">
                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Excel File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Supported formats: .xlsx, .xls, .csv. First row should contain headers.
                    </p>
                  </div>
                </div>

                {/* File Preview Section */}
                {uploadedFile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">File: {uploadedFile.name}</h3>
                    <p className="text-sm text-blue-700">Parsed {parsedWorkers.length} workers</p>
                  </div>
                )}

                {/* Workers Preview */}
                {parsedWorkers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Workers Preview (First 10)</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-80 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
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
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Upload Progress</h3>
                    <div className="bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${(bulkUploadProgress.completed / bulkUploadProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {bulkUploadProgress.completed} of {bulkUploadProgress.total} workers processed
                    </p>
                    
                    {bulkUploadProgress.errors.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-red-600 font-medium">Errors:</p>
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

                {/* Excel Format Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-blue-900 mb-3">Excel File Format Guide</h4>
                  <p className="text-sm text-blue-700 mb-4">Your Excel file should have these columns (header names are flexible):</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                    <div>
                      <strong className="text-blue-900">Required Fields:</strong>
                      <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                        <li>First Name</li>
                        <li>Last Name</li>
                        <li>Email</li>
                        <li>Phone Number</li>
                        <li>Team</li>
                        <li>Department</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-blue-900">Optional Fields:</strong>
                      <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                        <li>Other Name</li>
                        <li>Marital Status</li>
                        <li>Worker Role</li>
                        <li>Birth Date</li>
                        <li>Age Range</li>
                        <li>Gender</li>
                        <li>Address</li>
                        <li>Occupation</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Bulk Upload Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => navigate("/workers")}
                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={processBulkUpload}
                    disabled={isLoading || parsedWorkers.length === 0}
                    className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? "Uploading..." : `Upload ${parsedWorkers.length} Workers`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </div>
  );
}
