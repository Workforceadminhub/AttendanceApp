import React, { useState, useMemo, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Header from "../components/Header";
import Layout from "../components/Layout";
import LoadingState from "../components/LoadingState";
import { getDepartmentRoute, getDepartmentNameFromRoute } from "../utils/routeObject";
import { getUserRole, canAccessDepartment, filterTeamFromPermissions } from "../utils/getUserRole";
import { fetchWorkers, removeWorker } from "../services/workers";
import { getUser } from "../utils/getUser";
import Modal from "../components/Modal";
import { PencilIcon, EyeIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon } from "@heroicons/react/24/outline";

// Order by role from highest leadership to worker
// Sub Team Head → Assistant Sub Team Head → HOD → Assistant HOD → Admin
// → Small Group Leader → E-Group Leader → Assistant Small Group Leader → Worker → blank/other
const ROLE_ORDER = [
  "Sub Team Head",
  "Assistant Sub Team Head",
  "HOD",
  "Assistant HOD",
  "Admin",
  "Small Group Leader",
  "E-Group Leader",
  "Assistant Small Group Leader",
  "Worker",
];

export default function DepartmentWorkers() {
  const { departmentRoute: routeParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const decodedParam = decodeURIComponent(routeParam || "");
  const departmentNameFromRoute = getDepartmentNameFromRoute(decodedParam);
  const decodedDepartment = departmentNameFromRoute || decodedParam;
  const departmentRoute = getDepartmentRoute(decodedDepartment) || routeParam;

  // Read auth once (avoid refetch loops due to new array references)
  const auth = useMemo(() => getUser(), []);
  // Filter out team name from permissions (team name shouldn't be in permissions array)
  const permissions = useMemo(() => {
    return filterTeamFromPermissions(auth?.permissions ?? [], auth?.team);
  }, [auth]);
  const permissionsKey = useMemo(
    () => (Array.isArray(permissions) ? permissions.join(",") : ""),
    [permissions]
  );

  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("All");

  const {
    isSuperAdmin,
    isChurchAdmin,
    isHOD,
    isTeamAdmin,
    isSubTeamAdmin,
  } = getUserRole();
  const isAnyAdmin = isSuperAdmin || isChurchAdmin || isTeamAdmin || isSubTeamAdmin;
  const canEditWorkers = isSuperAdmin || isChurchAdmin || isHOD || isTeamAdmin || isSubTeamAdmin;
  const canRequestDeleteWorkers = isSuperAdmin || isChurchAdmin || isHOD || isTeamAdmin; // exclude sub-team-admin
  const canSelectWorkers = canEditWorkers && !isSubTeamAdmin; // sub-team-admin should not see worker selection checkboxes
  const canManageDepartmentPage = canAccessDepartment(decodedDepartment);

  const {
    data: workersData,
    isLoading: isWorkersLoading,
  } = useQuery({
    queryKey: ["departmentWorkers", decodedDepartment, permissionsKey],
    // For admins (super/church/team/sub-team), do NOT send department;
    // backend will scope by permissions instead. HOD still uses department.
    queryFn: () =>
      fetchWorkers(
        isAnyAdmin ? undefined : decodedDepartment,
        undefined,
        permissions
      ),
    enabled: !!decodedDepartment,
  });

  // HOD view: order by role (HOD → Assistant HOD → Small Group Leader → Worker → blank), then by id within each role
  const sortedWorkers = useMemo(() => {
    const rawWorkers = workersData || [];
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
  }, [workersData]);

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
  const [isExporting, setIsExporting] = useState(false);

  const canAccessWorkerDepartment = (worker) => {
    const dept = worker?.department || decodedDepartment;
    return canAccessDepartment(dept);
  };

  // Admins/sub-team-admin: filter options from workers API response
  const departmentsFromData = useMemo(() => {
    if (!Array.isArray(sortedWorkers)) return [];
    const set = new Set();
    sortedWorkers.forEach((w) => {
      const d = (w?.department ?? "").trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [sortedWorkers]);
  const departmentFilterOptions = departmentsFromData;
  const showDepartmentFilter =
    (isSubTeamAdmin || isTeamAdmin) && departmentFilterOptions.length > 0;

  // When a sub-team-admin/team-admin selects a specific department in the filter,
  // allow deep-linking to the department detail UI (/department/:departmentRoute).
  const selectedDepartmentDetailUrl = useMemo(() => {
    if (!selectedDepartmentFilter || selectedDepartmentFilter === "All") return null;
    const r = getDepartmentRoute(selectedDepartmentFilter);
    const slug = r || encodeURIComponent(selectedDepartmentFilter);
    return `/department/${slug}`;
  }, [selectedDepartmentFilter]);

  // Reset invalid selection if API departments change
  useEffect(() => {
    if (!(isSubTeamAdmin || isTeamAdmin)) return;
    if (
      selectedDepartmentFilter !== "All" &&
      departmentFilterOptions.length > 0 &&
      !departmentFilterOptions.includes(selectedDepartmentFilter)
    ) {
      setSelectedDepartmentFilter("All");
    }
  }, [departmentFilterOptions, isSubTeamAdmin, isTeamAdmin, selectedDepartmentFilter]);

  // Clear selection when changing department filter (avoid exporting/deleting hidden selections)
  useEffect(() => {
    if (!(isSubTeamAdmin || isTeamAdmin)) return;
    setSelectedWorkers(new Set());
    setExpandedId(null);
  }, [isSubTeamAdmin, isTeamAdmin, selectedDepartmentFilter]);

  const workers = useMemo(() => {
    if (!(isSubTeamAdmin || isTeamAdmin) || selectedDepartmentFilter === "All") {
      return sortedWorkers;
    }
    return sortedWorkers.filter(
      (w) => (w?.department ?? "").trim() === selectedDepartmentFilter
    );
  }, [isSubTeamAdmin, isTeamAdmin, selectedDepartmentFilter, sortedWorkers]);

  const selectableWorkers = workers.filter((w) => w.id != null && canAccessWorkerDepartment(w));
  const selectedVisibleCount = useMemo(() => {
    let c = 0;
    for (const w of selectableWorkers) {
      if (selectedWorkers.has(w.id)) c += 1;
    }
    return c;
  }, [selectableWorkers, selectedWorkers]);

  const exportWorkersToExcel = async () => {
    if (!workers || workers.length === 0) {
      toast.error("No workers to export");
      return;
    }

    const exportList =
      selectedVisibleCount > 0
        ? workers.filter((w) => w.id != null && selectedWorkers.has(w.id))
        : workers;

    if (exportList.length === 0) {
      toast.error("No selected workers to export");
      return;
    }

    setIsExporting(true);
    try {
      // Group workers by department for separate sheets
      const workersByDept = {};
      exportList.forEach((w) => {
        const dept = (w.department || decodedDepartment || "Unassigned").trim() || "Unassigned";
        if (!workersByDept[dept]) {
          workersByDept[dept] = [];
        }
        workersByDept[dept].push(w);
      });

      const workbook = new ExcelJS.Workbook();

      const headers = [
        "S/N",
        "Worker ID",
        "First Name",
        "Last Name",
        "Other Name",
        "Email",
        "Phone",
        "Department",
        "Role",
        "Gender",
        "Birth Date",
        "Marital Status",
        "Age Range",
        "Employment Status",
        "Occupation",
        "Address",
        "Status",
      ];

      const makeSheetName = (name) =>
        (name || "Workers")
          .toString()
          // Remove characters not allowed in Excel sheet names: []*/\?:
          .replace(/[[\]*/\\?:]/g, "")
          .slice(0, 31) || "Workers";

      const departments = Object.keys(workersByDept).sort();

      departments.forEach((dept) => {
        const sheetName = makeSheetName(dept);
        const sheet = workbook.addWorksheet(sheetName, {
          views: [{ state: "frozen", ySplit: 1 }],
        });

        sheet.columns = headers.map((header) => ({
          header,
          key: header,
          width: Math.min(32, Math.max(12, header.length + 2)),
        }));

        const rows = workersByDept[dept].map((w, index) => ({
          "S/N": index + 1,
          "Worker ID": w.id ?? w.workerId ?? "",
          "First Name": w.firstname ?? "",
          "Last Name": w.lastname ?? "",
          "Other Name": w.othername ?? "",
          Email: w.email ?? "",
          Phone: w.phone || w.phonenumber || "",
          Department: w.department || decodedDepartment || "",
          Role: w.workerrole || w.workerRole || "",
          Gender: w.gender ?? "",
          "Birth Date": w.birthdate ?? "",
          "Marital Status": w.maritalstatus ?? "",
          "Age Range": w.agerange ?? "",
          "Employment Status": w.employment ?? "",
          Occupation: w.occupation ?? "",
          Address: w.address ?? "",
          Status: w.status || "ACTIVE",
        }));

        rows.forEach((r) => sheet.addRow(r));

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFEFEF" },
        };

        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: headers.length },
        };
      });

      // Use the human-readable department name (or generic) for the export filename
      const rawDeptName =
        departments.length === 1 ? departments[0] : decodedDepartment || departmentRoute || "departments";
      const safeDept = String(rawDeptName)
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
      const ts = (() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}_${hh}-${min}`;
      })();

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `${safeDept || "department"}_workers_${ts}.xlsx`);
    } catch (e) {
      toast.error("Failed to export workers");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleWorker = (id) => {
    setSelectedWorkers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllWorkers = () => {
    setSelectedWorkers((prev) => {
      const next = new Set(prev);
      const allVisibleSelected =
        selectableWorkers.length > 0 && selectableWorkers.every((w) => next.has(w.id));
      if (allVisibleSelected) {
        selectableWorkers.forEach((w) => next.delete(w.id));
      } else {
        selectableWorkers.forEach((w) => next.add(w.id));
      }
      return next;
    });
  };

  const openRequestDeleteModal = () => {
    if (!canRequestDeleteWorkers) return;
    if (selectedVisibleCount === 0) return;
    setDeleteTargetId(null);
    setDeleteModalOpen(true);
  };

  const openRequestDeleteModalForWorker = (workerId) => {
    if (!canRequestDeleteWorkers) return;
    if (workerId == null) return;
    setDeleteTargetId(workerId);
    setDeleteModalOpen(true);
  };

  const confirmRequestDelete = async () => {
    if (!canRequestDeleteWorkers) {
      toast.error("Access denied. You do not have permission to delete workers.");
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
      return;
    }
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
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/summary" className="hover:underline">
              Summary
            </Link>
            <span>/</span>
            {isSubTeamAdmin ? (
              selectedDepartmentDetailUrl ? (
                <>
                  <Link to={selectedDepartmentDetailUrl} className="hover:underline">
                    {selectedDepartmentFilter}
                  </Link>
                  <span>/</span>
                  <span className="font-semibold text-gray-900">Workers</span>
                </>
              ) : (
                <span className="font-semibold text-gray-900">Workers</span>
              )
            ) : (
              <>
                <Link to={departmentUrl} className="hover:underline">
                  {decodedDepartment}
                </Link>
                <span>/</span>
                <span className="font-semibold text-gray-900">Workers</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Workers ({workers.length})
              </h2>
            </div>
            <span className="flex items-center gap-3">
              {(isSubTeamAdmin || isTeamAdmin) && selectedDepartmentDetailUrl && (
                <Link
                  to={selectedDepartmentDetailUrl}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  title="Open department overview"
                >
                  View Department
                </Link>
              )}
              <button
                type="button"
                onClick={exportWorkersToExcel}
                disabled={isExporting || isWorkersLoading || workers.length === 0}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-black disabled:opacity-50"
                title={
                  selectedVisibleCount > 0
                    ? `Export ${selectedVisibleCount} selected worker(s) to Excel`
                    : "Export all workers to Excel"
                }
              >
                {isExporting ? "Exporting..." : "Export to Excel"}
              </button>

              {canEditWorkers && (
                <>
                  {canRequestDeleteWorkers && selectedVisibleCount > 0 && (
                    <button
                      type="button"
                      onClick={openRequestDeleteModal}
                      disabled={isDeleting}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? "Requesting..." : `Request to Delete ${selectedVisibleCount} Selected`}
                    </button>
                  )}
                  {canManageDepartmentPage && (
                    <>
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
                    </>
                  )}
                </>
              )}
            </span>
          </div>

          {showDepartmentFilter && (
            <div className="mb-4">
              {/* Mobile: stack controls */}
              <div className="sm:hidden space-y-3">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="deptWorkersFilter"
                    className="text-sm font-medium text-gray-700"
                  >
                    Department
                  </label>
                  <select
                    id="deptWorkersFilter"
                    value={selectedDepartmentFilter}
                    onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All</option>
                    {departmentFilterOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Desktop: department filter only, same line alignment */}
              <div className="hidden sm:flex w-full items-end gap-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="deptWorkersFilter"
                    className="text-sm font-medium text-gray-700"
                  >
                    Department
                  </label>
                  <select
                    id="deptWorkersFilter"
                    value={selectedDepartmentFilter}
                    onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                    className="min-w-[220px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All</option>
                    {departmentFilterOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          {isWorkersLoading ? (
            <LoadingState />
          ) : workers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    {canSelectWorkers && (
                      <th className="py-3.5 pl-4 pr-3 text-left sm:pl-0">
                        <input
                          type="checkbox"
                        checked={selectableWorkers.length > 0 && selectedVisibleCount === selectableWorkers.length}
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
                      Department
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
                    const canAccessThisWorker = canAccessWorkerDepartment(worker);
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
                          {canSelectWorkers && (
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-0">
                              <input
                                type="checkbox"
                                checked={worker.id != null && selectedWorkers.has(worker.id)}
                                onChange={() => worker.id != null && canAccessThisWorker && toggleWorker(worker.id)}
                                disabled={worker.id == null || !canAccessThisWorker}
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
                            {worker.department || decodedDepartment || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {worker.workerrole || worker.workerRole || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className="flex items-center gap-3">
                              {/* Hide view button for team admins on department workers */}
                              {!isSubTeamAdmin && !isTeamAdmin && canAccessThisWorker && (
                                <Link
                                  to={`/worker/${worker.id}?from=department:${encodeURIComponent(decodedDepartment)}`}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="View"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </Link>
                              )}
                              {canEditWorkers && canAccessThisWorker && (
                                <Link
                                  to={`/worker/${worker.id}?from=department:${encodeURIComponent(decodedDepartment)}`}
                                  className="text-green-600 hover:text-green-800"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Link>
                              )}
                              {/* Hide delete request button for team admins on department workers */}
                              {canRequestDeleteWorkers && !isTeamAdmin && canAccessThisWorker && (
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
                              colSpan={canSelectWorkers ? 7 : 6}
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
