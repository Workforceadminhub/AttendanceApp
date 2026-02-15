import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { routeObject, getDepartmentNameFromRoute, getDepartmentRoute } from "../utils/routeObject";
import { normalizeWorkerRole } from "../utils/teams";
import { getUserRole, canAccessDepartment } from "../utils/getUserRole";
import apiRequest from "../utils/apiClient";

export default function HODBulkAddWorker() {
  const navigate = useNavigate();
  const { departmentRoute: routeParam } = useParams();
  const decodedParam = decodeURIComponent(routeParam || "");
  const decodedDepartment = getDepartmentNameFromRoute(decodedParam) || decodedParam;

  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedWorkers, setParsedWorkers] = useState([]);
  const [bulkUploadProgress, setBulkUploadProgress] = useState({
    total: 0,
    completed: 0,
    errors: [],
  });

  const departmentInfo = routeObject.find((r) => r.department === decodedDepartment);
  const team = departmentInfo?.team || "";

  const { isSuperAdmin, isChurchAdmin, isHOD, isTeamAdmin, isSubTeamAdmin } = getUserRole();
  const canAddWorkers =
    (isSuperAdmin || isChurchAdmin || isHOD || isTeamAdmin || isSubTeamAdmin) &&
    canAccessDepartment(decodedDepartment);

  useEffect(() => {
    if (!decodedDepartment || !canAddWorkers) {
      toast.error("Access denied. You cannot add workers to this department.");
      navigate("/attendance/summary");
    }
  }, [decodedDepartment, canAddWorkers, navigate]);

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

        const workers = convertToWorkerObjects(jsonData);
        setParsedWorkers(workers);
      } catch (error) {
        toast.error("Error parsing file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const convertToWorkerObjects = (data) => {
    return data
      .map((row, index) => {
        const worker = {
          firstname: row["First Name"] || row["firstname"] || "",
          lastname: row["Last Name"] || row["lastname"] || "",
          othername: row["Other Name"] || row["othername"] || "",
          email: row["Email"] || row["email"] || row["Email Address"] || "",
          phonenumber: row["Phone"] || row["phonenumber"] || row["Phone Number"] || "",
          department: decodedDepartment,
          team,
          workerrole: row["Worker Role"] || row["workerrole"] || row["Role"] || row["role"] || "Worker",
          birthdate: row["Birth Date"] || row["birthdate"] || "",
          agerange: row["Age Range"] || row["agerange"] || "",
          gender: row["Gender"] || row["gender"] || "",
          maritalstatus: row["Marital Status"] || row["maritalstatus"] || "",
          employment: row["Employment Status"] || row["employment"] || row["Employment"] || "",
          occupation: row["Occupation"] || row["occupation"] || "",
          address: row["Address"] || row["address"] || "",
        };

        worker.workerrole = normalizeWorkerRole(worker.workerrole);

        const requiredFields = ["firstname", "lastname", "email", "phonenumber"];
        const missingFields = requiredFields.filter((field) => !worker[field]);

        if (missingFields.length > 0) {
          return { ...worker, _error: `Missing: ${missingFields.join(", ")}`, _row: index + 2 };
        }

        return worker;
      })
      .filter((w) => w.firstname || w.lastname);
  };

  const processBulkUpload = async () => {
    if (parsedWorkers.length === 0) {
      toast.error("No valid workers found in the file");
      return;
    }

    const validWorkers = parsedWorkers.filter((w) => !w._error);
    const invalidWorkers = parsedWorkers.filter((w) => w._error);

    if (invalidWorkers.length > 0) {
      toast.error(`Found ${invalidWorkers.length} invalid rows. Please fix the data and try again.`);
      return;
    }

    setIsLoading(true);
    setBulkUploadProgress({ total: validWorkers.length, completed: 0, errors: [] });
    const errors = [];

    for (let i = 0; i < validWorkers.length; i++) {
      try {
        const worker = { ...validWorkers[i] };

        worker.workerrole = normalizeWorkerRole(worker.workerrole);

        await apiRequest("POST", "/api/super/admin/workers", worker);
      } catch (error) {
        errors.push({
          worker: `${validWorkers[i].firstname} ${validWorkers[i].lastname}`,
          error: error.message,
        });
      }

      setBulkUploadProgress((prev) => ({
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
      toast.error(
        `Added ${validWorkers.length - errors.length} workers. ${errors.length} failed.`
      );
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      const file = files[0];
      if (
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel" ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls")
      ) {
        setUploadedFile(file);
        handleBulkUpload({ target: { files: [file] } });
      } else {
        toast.error("Please upload an Excel file (.xlsx or .xls)");
      }
    }
  };

  const backUrl = `/department/${getDepartmentRoute(decodedDepartment) || encodeURIComponent(decodedDepartment)}`;

  if (!canAddWorkers) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link to="/attendance/summary" className="hover:underline">
                Summary
              </Link>
              <span>/</span>
              <Link to={backUrl} className="hover:underline">
                {decodedDepartment}
              </Link>
              <span>/</span>
              <span className="font-semibold text-gray-900">Bulk Add Workers</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Bulk Add Workers</h1>
            <p className="text-gray-600 mb-6">
              Add workers to <strong>{decodedDepartment}</strong> (Team: {team}). Department and
              team are fixed for all rows.
            </p>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("hod-bulk-upload").click()}
            >
              <div className="space-y-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div>
                  <p className="text-lg font-medium text-gray-900">Upload Excel File</p>
                  <p className="text-sm text-gray-500">
                    Drag and drop or click to browse. Required columns: First Name, Last Name,
                    Email, Phone.
                  </p>
                </div>
                <input
                  id="hod-bulk-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleBulkUpload}
                  className="hidden"
                />
              </div>
            </div>

            {uploadedFile && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>File:</strong> {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)}{" "}
                  KB)
                </p>
              </div>
            )}

            {parsedWorkers.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Preview ({parsedWorkers.length} workers)
                </h3>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Phone
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedWorkers.slice(0, 15).map((worker, index) => (
                        <tr key={index} className={worker._error ? "bg-red-50" : ""}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {worker.firstname} {worker.lastname}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{worker.email}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{worker.phonenumber}</td>
                          <td className="px-4 py-2 text-sm">
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
                </div>
                {parsedWorkers.length > 15 && (
                  <p className="mt-2 text-sm text-gray-500">
                    Showing first 15. {parsedWorkers.length - 15} more will be processed.
                  </p>
                )}

                {bulkUploadProgress.total > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm text-gray-500">
                        {bulkUploadProgress.completed} / {bulkUploadProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(bulkUploadProgress.completed / bulkUploadProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                    {bulkUploadProgress.errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {bulkUploadProgress.errors.slice(0, 3).map((err, i) => (
                          <p key={i} className="text-xs text-red-600">
                            {err.worker}: {err.error}
                          </p>
                        ))}
                        {bulkUploadProgress.errors.length > 3 && (
                          <p className="text-xs text-red-600">
                            ... +{bulkUploadProgress.errors.length - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
              <Link
                to={backUrl}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </Link>
              <button
                onClick={processBulkUpload}
                disabled={parsedWorkers.length === 0 || isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Uploading..." : "Upload Workers"}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
}
