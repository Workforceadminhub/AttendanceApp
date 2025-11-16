import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import { teamsAndDepartments } from "../utils/teams";

export default function ViewWorker() {
  const navigate = useNavigate();
  const { workerId } = useParams();
  const location = useLocation();
  const [worker, setWorker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedWorker, setEditedWorker] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Check if user is super admin or church admin
  useEffect(() => {
    const authUser = JSON.parse(sessionStorage.getItem("authUser"));
    if (!authUser || (authUser.department !== "Super Admin" && authUser.department !== "Church Admin")) {
      toast.error("Access denied. Super Admin or Church Admin access required.");
      // Navigate to appropriate workers page based on user type
      if (authUser?.department === "Church Admin") {
        navigate("/church-admin/workers");
      } else {
        navigate("/workers/super-admin");
      }
      return;
    }
  }, [navigate]);

  // Fetch worker details
  useEffect(() => {
    const fetchWorkerDetails = async () => {
      try {
        const accessToken = sessionStorage.getItem("accessToken");
        const response = await fetch(
          `https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/${workerId}/workers/details`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch worker details`);
        }

        const responseData = await response.json();
        console.log("API Response:", responseData); // Debug log
        
        // Handle different possible response structures
        let workerData = responseData;
        if (responseData.data) {
          workerData = responseData.data;
        } else if (responseData.worker) {
          workerData = responseData.worker;
        }
        
        console.log("Worker Data:", workerData); // Debug log
        setWorker(workerData);
        setEditedWorker(workerData);
      } catch (error) {
        toast.error("Failed to fetch worker details");
        console.error("Error fetching worker:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (workerId) {
      fetchWorkerDetails();
    }
  }, [workerId]);

  const handleCancel = () => {
    // Check if user came from pending workers or all workers page
    const urlParams = new URLSearchParams(location.search);
    const from = urlParams.get('from');
    
    if (from === 'pending-workers') {
      navigate("/pending-workers");
      return;
    }
    
    if (from === 'all-workers') {
      navigate("/all-workers");
      return;
    }
    
    // Default navigation based on user department
    const authUser = JSON.parse(sessionStorage.getItem("authUser"));
    if (authUser?.department === "Church Admin") {
      navigate("/church-admin/workers");
    } else {
      navigate("/workers/super-admin");
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (
      !editedWorker.firstname ||
      !editedWorker.lastname ||
      !editedWorker.email ||
      !editedWorker.phonenumber ||
      !editedWorker.department ||
      !editedWorker.team
    ) {
      toast.error(
        "Please fill in all required fields (First Name, Last Name, Email, Phone Number, Department, Team)"
      );
      return;
    }

    // Find only the fields that have changed
    const changedFields = {};
    const fieldsToCheck = [
      'firstname', 'lastname', 'othername', 'fullname', 'fullnamereverse', 'email', 'phonenumber',
      'maritalstatus', 'department', 'team', 'workerrole', 'birthdate',
      'agerange', 'gender', 'address', 'occupation', 'employment'
    ];

    fieldsToCheck.forEach(field => {
      if (editedWorker[field] !== worker[field]) {
        changedFields[field] = editedWorker[field];
      }
    });

    // If no fields have changed, show message and return
    if (Object.keys(changedFields).length === 0) {
      toast.info("No changes detected");
      return;
    }

    setIsSaving(true);
    try {
      const accessToken = sessionStorage.getItem("accessToken");
      
      // Normalize workerrole for case-sensitive values before sending
      // Convert singular to plural for backend
      const fieldsToSend = { ...changedFields };
      if (fieldsToSend.workerrole) {
        const roleLower = fieldsToSend.workerrole.toLowerCase().trim();
        if (roleLower === "pastoral leader" || roleLower === "pastoral leaders") {
          fieldsToSend.workerrole = "Pastoral Leaders";
        } else if (roleLower === "directional leader" || roleLower === "directional leaders") {
          fieldsToSend.workerrole = "Directional Leaders";
        }
      }
      
      const response = await fetch(
        "https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/workers",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: parseInt(workerId),
            ...fieldsToSend,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error occurred" }));
        throw new Error(
          errorData.message || `HTTP ${response.status}: Failed to update worker`
        );
      }

      toast.success("Worker updated successfully");
      setWorker(editedWorker);
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to update worker");
      console.error("Error updating worker:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const checkForChanges = (newEditedWorker) => {
    if (!worker) return false;
    
    const fieldsToCheck = [
      'firstname', 'lastname', 'othername', 'fullname', 'fullnamereverse', 'email', 'phonenumber',
      'maritalstatus', 'department', 'team', 'workerrole', 'birthdate',
      'agerange', 'gender', 'address', 'occupation', 'employment'
    ];

    return fieldsToCheck.some(field => {
      return newEditedWorker[field] !== worker[field];
    });
  };

  const handleInputChange = (field, value) => {
    const newEditedWorker = {
      ...editedWorker,
      [field]: value,
    };
    
    setEditedWorker(newEditedWorker);
    setHasChanges(checkForChanges(newEditedWorker));
  };

  // Debug: Log the current worker data
  useEffect(() => {
    if (worker) {
      console.log("Current worker data:", worker);
      console.log("Edited worker data:", editedWorker);
    }
  }, [worker, editedWorker]);

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Header />
        <Layout>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </Layout>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Header />
        <Layout>
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Worker Not Found
              </h1>
              <p className="text-gray-600 mb-6">
                The worker you're looking for doesn't exist or has been removed.
              </p>
              <button
                onClick={handleCancel}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Back to Workers
              </button>
            </div>
          </div>
        </Layout>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <Header />
      <Layout>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Edit Worker
                </h1>
                <p className="text-gray-600 mt-2">
                  Update worker information
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancel}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Back to Workers
                </button>
              </div>
            </div>
          </div>

          {/* Worker Details Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editedWorker.firstname || editedWorker.first_name || ""}
                    onChange={(e) => handleInputChange("firstname", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editedWorker.lastname || editedWorker.last_name || ""}
                    onChange={(e) => handleInputChange("lastname", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Other Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Name
                  </label>
                  <input
                    type="text"
                    value={editedWorker.othername || ""}
                    onChange={(e) => handleInputChange("othername", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editedWorker.fullname || ""}
                    onChange={(e) => handleInputChange("fullname", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Full Name Reverse */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name Reverse
                  </label>
                  <input
                    type="text"
                    value={editedWorker.fullnamereverse || ""}
                    onChange={(e) => handleInputChange("fullnamereverse", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editedWorker.gender || ""}
                    onChange={(e) => handleInputChange("gender", e.target.value)}
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
                    value={editedWorker.phonenumber || editedWorker.phone_number || editedWorker.phone || ""}
                    onChange={(e) => handleInputChange("phonenumber", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editedWorker.email || editedWorker.email_address || ""}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Team */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editedWorker.team || ""}
                    onChange={(e) => handleInputChange("team", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Team</option>
                    {teamsAndDepartments.map((team) => (
                      <option key={team.team} value={team.team}>
                        {team.team}
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
                    value={editedWorker.department || ""}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {teamsAndDepartments
                      .find((team) => team.team === editedWorker.team)
                      ?.department?.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
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
                    value={editedWorker.workerrole || ""}
                    onChange={(e) => handleInputChange("workerrole", e.target.value)}
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
                    value={editedWorker.birthdate || ""}
                    onChange={(e) => handleInputChange("birthdate", e.target.value)}
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
                    value={editedWorker.maritalstatus || ""}
                    onChange={(e) => handleInputChange("maritalstatus", e.target.value)}
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
                    value={editedWorker.agerange || ""}
                    onChange={(e) => handleInputChange("agerange", e.target.value)}
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
                    value={editedWorker.employment || ""}
                    onChange={(e) => handleInputChange("employment", e.target.value)}
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
                    value={editedWorker.occupation || ""}
                    onChange={(e) => handleInputChange("occupation", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editedWorker.address || ""}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
}
