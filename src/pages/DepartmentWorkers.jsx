import React, { useState, useMemo, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Layout from "../components/Layout";
import LoadingState from "../components/LoadingState";
import { getDepartmentRoute, getDepartmentNameFromRoute } from "../utils/routeObject";
import { getUserRole, canAccessDepartment } from "../utils/getUserRole";
import { fetchWorkers, removeWorker } from "../services/workers";
import Modal from "../components/Modal";
import { PencilIcon, EyeIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function DepartmentWorkers() {
  const { departmentRoute: routeParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const decodedParam = decodeURIComponent(routeParam || "");
  const departmentNameFromRoute = getDepartmentNameFromRoute(decodedParam);
  const decodedDepartment = departmentNameFromRoute || decodedParam;
  const departmentRoute = getDepartmentRoute(decodedDepartment) || routeParam;

  const {
    data: workersData,
    isLoading: isWorkersLoading,
  } = useQuery({
    queryKey: ["departmentWorkers", decodedDepartment],
    queryFn: () => fetchWorkers(decodedDepartment),
  });

  const rawWorkers = workersData || [];

  // HOD view: order by role (HOD → Assistant HOD → Small Group Leader → Worker → blank), then by id within each role
  const ROLE_ORDER = ["HOD", "Assistant HOD", "Small Group Leader", "Worker"];
  const workers = useMemo(() => {
    const getRoleRank = (role) => {
      const r = (role || "").trim();
      const i = ROLE_ORDER.indexOf(r);
      return i === -1 ? ROLE_ORDER.length : i; // blank/other after Worker
    };
    return [...rawWorkers].sort((a, b) => {
      const rankA = getRoleRank(a.workerrole || a.workerRole);
      const rankB = getRoleRank(b.workerrole || b.workerRole);
      if (rankA !== rankB) return rankA - rankB;
      const idA = (a.id ?? a.workerId ?? 0).toString();
      const idB = (b.id ?? b.workerId ?? 0).toString();
      return idA.localeCompare(idB, undefined, { numeric: true });
    });
  }, [rawWorkers]);

  const queryClient = useQueryClient();

  // When returning from edit worker, refresh list so changes are visible
  useEffect(() => {
    if (location.state?.refresh) {
      queryClient.invalidateQueries({
        queryKey: ["departmentWorkers", decodedDepartment],
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.refresh, location.pathname, location.state, navigate, queryClient, decodedDepartment]);

  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteData, setDeleteData] = useState({
    nameofrequester: "",
    reasonfordelete: "",
    roleofrequester: "",
  });
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null); // null = bulk (selectedWorkers), else single worker id

  const { isSuperAdmin, isChurchAdmin, isHOD, isTeamAdmin, isSubTeamAdmin } = getUserRole();
  const canEditWorkers =
    (isSuperAdmin || isChurchAdmin || isHOD || isTeamAdmin || isSubTeamAdmin) &&
    canAccessDepartment(decodedDepartment);

  const toggleWorker = (id) => {
    setSelectedWorkers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableWorkers = workers.filter((w) => w.id != null);
  const toggleAllWorkers = () => {
    if (selectedWorkers.size === selectableWorkers.length) {
      setSelectedWorkers(new Set());
    } else {
      setSelectedWorkers(new Set(selectableWorkers.map((w) => w.id)));
    }
  };

  const openRequestDeleteModal = () => {
    if (selectedWorkers.size === 0) return;
    setDeleteTargetId(null);
    setDeleteModalOpen(true);
  };

  const openRequestDeleteModalForWorker = (workerId) => {
    if (workerId == null) return;
    setDeleteTargetId(workerId);
    setDeleteModalOpen(true);
  };

  const confirmRequestDelete = async () => {
    if (
      !deleteData.nameofrequester ||
      !deleteData.reasonfordelete ||
      !deleteData.roleofrequester
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsDeleting(true);
    const ids = deleteTargetId != null ? [deleteTargetId] : Array.from(selectedWorkers);
    let successCount = 0;
    let errorCount = 0;

    for (const workerId of ids) {
      try {
        await removeWorker(workerId, deleteData);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsDeleting(false);
    setSelectedWorkers(new Set());
    setDeleteTargetId(null);
    setDeleteModalOpen(false);
    setDeleteData({ nameofrequester: "", reasonfordelete: "", roleofrequester: "" });
    queryClient.invalidateQueries({ queryKey: ["departmentWorkers", decodedDepartment] });

    if (successCount > 0) {
      toast.success(
        (successCount === 1
          ? "Request submitted. "
          : `${successCount} request(s) submitted. `) +
          "The request has been sent to your subteam head and team lead for approval. Once approved, the request would be effected."
      );
    }
    if (errorCount > 0) {
      toast.error(`Failed to submit ${errorCount} request(s)`);
    }
  };

  const departmentUrl = `/department/${departmentRoute || encodeURIComponent(decodedDepartment)}`;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        {!isSubTeamAdmin && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link to="/summary" className="hover:underline">
                Summary
              </Link>
              <span>/</span>
              <Link to={departmentUrl} className="hover:underline">
                {decodedDepartment}
              </Link>
              <span>/</span>
              <span className="font-semibold text-gray-900">Workers</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Workers ({workers.length})
            </h2>
            {canEditWorkers && (
              <span className="flex items-center gap-3">
                {selectedWorkers.size > 0 && (
                  <button
                    type="button"
                    onClick={openRequestDeleteModal}
                    disabled={isDeleting}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? "Requesting..." : `Request to Delete ${selectedWorkers.size} Selected`}
                  </button>
                )}
                <Link
                  to={`${departmentUrl}/add-worker`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Add Worker
                </Link>
                <Link
                  to={`${departmentUrl}/bulk-add`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Bulk Add Workers
                </Link>
              </span>
            )}
          </div>
          {isWorkersLoading ? (
            <LoadingState />
          ) : workers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    {canEditWorkers && (
                      <th className="py-3.5 pl-4 pr-3 text-left sm:pl-0">
                        <input
                          type="checkbox"
                          checked={selectableWorkers.length > 0 && selectedWorkers.size === selectableWorkers.length}
                          onChange={toggleAllWorkers}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      S/N
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Phone
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Role
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workers.map((worker, index) => {
                    const isExpanded = expandedId === (worker.id ?? index);
                    const detailItems = [
                      { label: "Email", value: worker.email },
                      { label: "Other Name", value: worker.othername },
                      { label: "Gender", value: worker.gender },
                      { label: "Birth Date", value: worker.birthdate },
                      { label: "Marital Status", value: worker.maritalstatus },
                      { label: "Age Range", value: worker.agerange },
                      { label: "Employment", value: worker.employment },
                      { label: "Occupation", value: worker.occupation },
                      { label: "Address", value: worker.address },
                      { label: "Status", value: worker.status || "ACTIVE" },
                    ].filter((item) => item.value != null && String(item.value).trim() !== "");
                    return (
                      <React.Fragment key={worker.id ?? index}>
                        <tr>
                          {canEditWorkers && (
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-0">
                              <input
                                type="checkbox"
                                checked={worker.id != null && selectedWorkers.has(worker.id)}
                                onChange={() => worker.id != null && toggleWorker(worker.id)}
                                disabled={worker.id == null}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          )}
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                            {index + 1}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {worker.firstname} {worker.lastname}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {worker.phone || worker.phonenumber || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {worker.workerrole || worker.workerRole || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className="flex items-center gap-3">
                              <Link
                                to={`/worker/${worker.id}?from=department:${encodeURIComponent(decodedDepartment)}`}
                                className="text-blue-600 hover:text-blue-800"
                                title="View"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </Link>
                              {canEditWorkers && (
                                <Link
                                  to={`/worker/${worker.id}?from=department:${encodeURIComponent(decodedDepartment)}`}
                                  className="text-green-600 hover:text-green-800"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Link>
                              )}
                              {canEditWorkers && (
                                <button
                                  type="button"
                                  onClick={() => openRequestDeleteModalForWorker(worker.id)}
                                  className="text-red-500 hover:text-red-700"
                                  title="Request to delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : worker.id ?? index)}
                                className="text-gray-500 hover:text-gray-700"
                                title={isExpanded ? "Collapse" : "Expand details"}
                              >
                                {isExpanded ? (
                                  <ChevronUpIcon className="h-4 w-4" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4" />
                                )}
                              </button>
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={canEditWorkers ? 6 : 5}
                              className="bg-gray-50 px-4 py-3 text-sm"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-2">
                                {detailItems.length > 0 ? (
                                  detailItems.map(({ label, value }) => (
                                    <div key={label}>
                                      <span className="font-medium text-gray-500">{label}:</span>{" "}
                                      <span className="text-gray-900">{String(value)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-gray-500">No additional details available.</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No workers found in this department.</p>
          )}
        </div>

        <Modal
          title={deleteTargetId != null ? "Request to delete worker" : "Request to delete worker(s)"}
          confirmText="Submit request"
          onConfirm={confirmRequestDelete}
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setDeleteTargetId(null);
          }}
          isLoading={isDeleting}
          confirmingText="Submitting..."
          formData={deleteData}
          setFormData={setDeleteData}
        />
      </Layout>
    </div>
  );
}
