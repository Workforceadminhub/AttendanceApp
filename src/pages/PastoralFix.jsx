import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import LoadingState from "../components/LoadingState";
import { WrenchScrewdriverIcon, CheckCircleIcon, EyeIcon } from "@heroicons/react/24/outline";
import apiRequest from "../utils/apiClient";

const CORRECT = "Pastoral Leaders";

/** Returns true when the value looks like "pastoral leaders" but is NOT the canonical casing */
const isWrongCasing = (value) =>
  value && value.toLowerCase() === "pastoral leaders" && value !== CORRECT;

export default function PastoralFix() {
  const navigate = useNavigate();
  const [affectedWorkers, setAffectedWorkers] = useState([]);
  const [totalFetched, setTotalFetched] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  // Super Admin guard
  useEffect(() => {
    const authUser = JSON.parse(sessionStorage.getItem("authUser"));
    if (!authUser || authUser.department !== "Super Admin") {
      toast.error("Access denied. Super Admin access required.");
      navigate("/login");
    }
  }, [navigate]);

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const result = await apiRequest("GET", "/api/super/admin/workers", { limit: 10000 });

      let workersData = [];
      if (result?.data?.data && Array.isArray(result.data.data)) {
        workersData = result.data.data;
      } else if (result?.data && Array.isArray(result.data)) {
        workersData = result.data;
      } else if (Array.isArray(result)) {
        workersData = result;
      }

      setTotalFetched(workersData.length);

      const affected = workersData.filter(
        (w) => isWrongCasing(w.department) || isWrongCasing(w.workerrole)
      );
      setAffectedWorkers(affected);
    } catch (error) {
      toast.error("Failed to fetch workers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fixAllWorkers = async () => {
    if (affectedWorkers.length === 0) return;

    if (!window.confirm(`Fix casing for ${affectedWorkers.length} worker(s)? This will update their records to use "Pastoral Leaders".`)) return;

    setIsFixing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const worker of affectedWorkers) {
      const wrongDept = isWrongCasing(worker.department);
      const wrongRole = isWrongCasing(worker.workerrole);

      try {
        await apiRequest("PUT", "/api/super/admin/workers", {
          id: parseInt(worker.id),
          ...(wrongDept && { department: CORRECT }),
          ...(wrongRole && { workerrole: CORRECT }),
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) toast.success(`Fixed ${successCount} worker(s) successfully`);
    if (errorCount > 0) toast.error(`Failed to fix ${errorCount} worker(s)`);

    setIsFixing(false);
    fetchWorkers();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <Header />
      <Layout>
        <div>
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                Pastoral Leaders Casing Fix
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Workers whose department or role is stored as{" "}
                <code className="bg-gray-100 px-1 rounded text-red-600">Pastoral leaders</code>{" "}
                (wrong) instead of{" "}
                <code className="bg-gray-100 px-1 rounded text-green-600">Pastoral Leaders</code>{" "}
                (correct)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchWorkers}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Refresh
              </button>
              {affectedWorkers.length > 0 && (
                <button
                  onClick={fixAllWorkers}
                  disabled={isFixing || isLoading}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <WrenchScrewdriverIcon className="h-4 w-4" />
                  {isFixing ? "Fixing..." : `Fix All (${affectedWorkers.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Summary alert */}
          {!isLoading && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                affectedWorkers.length > 0
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div className="flex items-center">
                {affectedWorkers.length > 0 ? (
                  <>
                    <WrenchScrewdriverIcon className="h-5 w-5 text-yellow-600 mr-2 shrink-0" />
                    <span className="text-yellow-800 font-medium">
                      {affectedWorkers.length} worker(s) with incorrect casing found
                    </span>
                    <span className="text-yellow-600 ml-2 text-sm">
                      (out of {totalFetched} total workers checked)
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 shrink-0" />
                    <span className="text-green-800 font-medium">
                      All workers already use the correct casing — nothing to fix.
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Table */}
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
                      {["ID", "Name", "Current Department", "Current Role", "Will be updated to", ""].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {affectedWorkers.length > 0 ? (
                      affectedWorkers.map((worker, idx) => {
                        const wrongDept = isWrongCasing(worker.department);
                        const wrongRole = isWrongCasing(worker.workerrole);
                        return (
                          <tr key={worker.id || idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {worker.id || idx + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {worker.firstname} {worker.lastname}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {wrongDept ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  {worker.department}
                                </span>
                              ) : (
                                <span className="text-gray-500">{worker.department || "—"}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {wrongRole ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  {worker.workerrole}
                                </span>
                              ) : (
                                <span className="text-gray-500">{worker.workerrole || "—"}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {CORRECT}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <button
                                onClick={() => navigate(`/worker/${worker.id}?from=pastoral-fix`)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View / Edit worker"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <CheckCircleIcon className="w-12 h-12 text-green-400 mb-4" />
                            <p className="text-lg font-medium text-gray-900 mb-2">All Clear!</p>
                            <p className="text-sm text-gray-500">
                              No workers with incorrect "Pastoral leaders" casing detected.
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

          {!isLoading && affectedWorkers.length > 0 && (
            <p className="mt-4 text-sm text-gray-500">
              Showing {affectedWorkers.length} affected worker(s) out of {totalFetched} total
            </p>
          )}
        </div>
      </Layout>
    </div>
  );
}
