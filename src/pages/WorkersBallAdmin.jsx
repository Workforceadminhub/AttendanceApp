import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { format } from "date-fns";
import Layout from "../components/Layout";
import GenericModal from "../components/GenericModal";
import { getUser } from "../utils/getUser";
import { getUserRole } from "../utils/getUserRole";
import { getPostLoginPath } from "../utils/routeObject";
import {
  fetchWorkersBallEligible,
  fetchWorkersBallRegistrations,
  searchWorkersBall,
  sendWorkersBallInvites,
} from "../services/workersBall";
import { exportWorkersBallWorkbook } from "../utils/exportWorkersBall";
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  UserPlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const PAGE_SIZE = 25;

function formatDateSafe(raw, pattern = "dd MMM yyyy, h:mm a") {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "-" : format(d, pattern);
  } catch {
    return "-";
  }
}

/**
 * Multi-word search matcher: every space-separated token in `query` must appear
 * somewhere in the worker's searchable fields (so "grace nw" matches "Grace Chizoba Nwannukwu").
 */
function matchesMultiWordSearch(record, query) {
  const cleaned = String(query || "").trim().toLowerCase();
  if (!cleaned) return true;

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = [
    record?.name,
    record?.firstName,
    record?.lastName,
    record?.code,
    record?.accessCode,
    record?.email,
    record?.phone,
    record?.role,
    record?.department,
    record?.team,
    record?.status,
    record?.workerId,
    record?.id,
  ]
    .filter((v) => v !== null && v !== undefined && v !== "")
    .join(" ")
    .toLowerCase();

  return tokens.every((tok) => haystack.includes(tok));
}

export default function WorkersBallAdmin() {
  const navigate = useNavigate();

  // Role verification - Super Admin & Church Admin
  const authUser = getUser();
  const { isSuperAdmin, isChurchAdmin } = getUserRole(authUser);
  const hasAccess = Boolean(
    isSuperAdmin ||
      isChurchAdmin ||
      authUser?.permissionLevel === "SUPER_ADMIN" ||
      authUser?.permissionLevel === "CHURCH_ADMIN" ||
      authUser?.department === "Super Admin"
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Raw data from server
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [serverMetrics, setServerMetrics] = useState({
    total: 0,
    totalRegistered: 0,
    totalConfirmed: 0,
    totalPending: 0,
    totalAttended: 0,
  });

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'attended' | 'registered' | 'pending'
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Selected worker for detail pass modal
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Invite Workers modal & tracking state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteSearchTerm, setInviteSearchTerm] = useState("");
  const [inviteSearching, setInviteSearching] = useState(false);
  const [inviteSearchResults, setInviteSearchResults] = useState([]);
  const [selectedToInvite, setSelectedToInvite] = useState([]); // Array of worker objects { id, name, email, department, team, role }
  const [manualWorkerIdsInput, setManualWorkerIdsInput] = useState("");
  const [sendingInvites, setSendingInvites] = useState(false);
  const [resendingWorkerId, setResendingWorkerId] = useState(null);
  const [lastInviteResult, setLastInviteResult] = useState(null);
  const [inviteUrlByWorkerId, setInviteUrlByWorkerId] = useState({});
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(null);

  // Eligible workers state (GET /api/workers-ball/eligible)
  const [eligibleWorkers, setEligibleWorkers] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [eligibleError, setEligibleError] = useState(null);
  const [eligibleLoaded, setEligibleLoaded] = useState(false);
  const [modalDepartmentFilter, setModalDepartmentFilter] = useState("All");
  const [modalTeamFilter, setModalTeamFilter] = useState("All");
  const [modalEligibleSearch, setModalEligibleSearch] = useState("");
  const eligibleReqRef = useRef(0);

  const mergeEligibleLists = useCallback((existingList = [], incomingList = []) => {
    const map = new Map();
    const getKey = (w, i) =>
      w?.workerId !== null && w?.workerId !== undefined
        ? `id:${w.workerId}`
        : w?.id !== null && w?.id !== undefined
          ? `id:${w.id}`
          : w?.email
            ? `email:${String(w.email).toLowerCase()}`
            : `idx:${i}`;

    existingList.forEach((w, idx) => {
      map.set(getKey(w, idx), w);
    });
    incomingList.forEach((w, idx) => {
      map.set(getKey(w, existingList.length + idx), w);
    });
    return Array.from(map.values());
  }, []);

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleDepartmentChange = (val) => {
    setDepartmentFilter(val);
    setCurrentPage(1);
  };

  const handleTeamChange = (val) => {
    setTeamFilter(val);
    setCurrentPage(1);
  };

  // Load eligible workers from GET /api/workers-ball/eligible
  const loadEligible = useCallback(
    async (showToast = false, customParams = {}) => {
      if (!hasAccess) return;
      const reqId = ++eligibleReqRef.current;
      setLoadingEligible(true);
      try {
        const res = await fetchWorkersBallEligible({
          page: 1,
          fetchAll: true,
          ...customParams,
        });
        if (reqId !== eligibleReqRef.current) return;
        setEligibleError(null);
        const list = res.workers || [];
        let mergedCount = list.length;
        setEligibleWorkers((prev) => {
          const merged =
            prev.length > 0 ? mergeEligibleLists(prev, list) : list;
          mergedCount = merged.length;
          return merged;
        });
        setEligibleLoaded(true);
        if (showToast) {
          toast.success(
            `Fetched ${mergedCount} eligible worker${mergedCount === 1 ? "" : "s"}.`
          );
        }
      } catch (err) {
        if (reqId !== eligibleReqRef.current) return;
        const msg =
          err?.message || "Failed to fetch eligible Workers Ball workers.";
        setEligibleError(msg);
        if (showToast) {
          toast.error(msg);
        }
      } finally {
        if (reqId === eligibleReqRef.current) {
          setLoadingEligible(false);
        }
      }
    },
    [hasAccess, mergeEligibleLists]
  );

  // Load registrations from API
  const loadData = useCallback(async (isSilent = false) => {
    if (!hasAccess) return;
    if (isSilent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [result] = await Promise.all([
        fetchWorkersBallRegistrations(),
        loadEligible(false),
      ]);
      setError(null);
      const list = result.registrations || [];
      setAllRegistrations(list);
      setServerMetrics({
        total: result.total || list.length,
        totalRegistered:
          result.totalRegistered ??
          result.totalConfirmed ??
          list.filter((r) => r.status !== "pending").length,
        totalConfirmed:
          result.totalConfirmed ??
          result.totalRegistered ??
          list.filter((r) => r.status !== "pending").length,
        totalPending:
          result.totalPending ??
          list.filter((r) => r.status === "pending").length,
        totalAttended:
          result.totalAttended ?? list.filter((r) => r.attended).length,
      });
    } catch (err) {
      const msg = err?.message || "Failed to load Workers Ball registrations.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasAccess, loadEligible]);

  useEffect(() => {
    if (!hasAccess) {
      toast.error("Super admin access required.");
      navigate(getPostLoginPath(authUser), { replace: true });
      return;
    }
    let cancelled = false;
    const fetchInitialData = async () => {
      void loadEligible(false);

      try {
        const result = await fetchWorkersBallRegistrations();
        if (cancelled) return;
        setError(null);
        const list = result.registrations || [];
        setAllRegistrations(list);
        setServerMetrics({
          total: result.total || list.length,
          totalRegistered:
            result.totalRegistered ??
            result.totalConfirmed ??
            list.filter((r) => r.status !== "pending").length,
          totalConfirmed:
            result.totalConfirmed ??
            result.totalRegistered ??
            list.filter((r) => r.status !== "pending").length,
          totalPending:
            result.totalPending ??
            list.filter((r) => r.status === "pending").length,
          totalAttended:
            result.totalAttended ?? list.filter((r) => r.attended).length,
        });
      } catch (err) {
        if (cancelled) return;
        const msg = err?.message || "Failed to load Workers Ball registrations.";
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    void fetchInitialData();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, navigate]);

  // Trigger server-side eligible search (?search=...&page=1&limit=50) when searching on Eligible tab or in Modal
  useEffect(() => {
    const activeSearch = (
      inviteModalOpen ? modalEligibleSearch : statusFilter === "eligible" ? search : ""
    ).trim();
    if (!hasAccess || activeSearch.length < 2) return undefined;

    // Use the first token for backend LIKE query so multi-word queries like "grace nw" still fetch "Grace Chizoba Nwannukwu"
    const backendSearchToken = activeSearch.split(/\s+/)[0];
    const timer = setTimeout(() => {
      void loadEligible(false, { search: backendSearchToken, page: 1, limit: 50 });
    }, 350);
    return () => clearTimeout(timer);
  }, [hasAccess, inviteModalOpen, modalEligibleSearch, search, statusFilter, loadEligible]);

  // Extract unique departments and teams for filter dropdowns (from both registrations & eligible workers)
  const { departmentOptions, teamOptions } = useMemo(() => {
    const depts = new Set();
    const teams = new Set();
    allRegistrations.forEach((r) => {
      if (r.department && r.department !== "Unassigned") depts.add(r.department);
      if (r.team && r.team !== "Unassigned") teams.add(r.team);
    });
    eligibleWorkers.forEach((w) => {
      if (w.department && w.department !== "Unassigned") depts.add(w.department);
      if (w.team && w.team !== "Unassigned") teams.add(w.team);
    });
    return {
      departmentOptions: ["All", ...Array.from(depts).sort()],
      teamOptions: ["All", ...Array.from(teams).sort()],
    };
  }, [allRegistrations, eligibleWorkers]);

  // Filtered eligible workers on the main Eligible tab
  const filteredEligible = useMemo(() => {
    return eligibleWorkers.filter((w) => {
      if (departmentFilter !== "All" && w.department !== departmentFilter) {
        return false;
      }
      if (teamFilter !== "All" && w.team !== teamFilter) {
        return false;
      }
      if (!matchesMultiWordSearch(w, search)) {
        return false;
      }
      return true;
    });
  }, [eligibleWorkers, search, departmentFilter, teamFilter]);

  // Filtered eligible workers inside the Invite Modal
  const modalFilteredEligible = useMemo(() => {
    return eligibleWorkers.filter((w) => {
      if (
        modalDepartmentFilter !== "All" &&
        w.department !== modalDepartmentFilter
      ) {
        return false;
      }
      if (modalTeamFilter !== "All" && w.team !== modalTeamFilter) {
        return false;
      }
      if (!matchesMultiWordSearch(w, modalEligibleSearch)) {
        return false;
      }
      return true;
    });
  }, [
    eligibleWorkers,
    modalEligibleSearch,
    modalDepartmentFilter,
    modalTeamFilter,
  ]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return allRegistrations.filter((r) => {
      // Status filter
      if (statusFilter === "attended" && !r.attended) return false;
      if (statusFilter === "pending" && r.status !== "pending") return false;
      if (statusFilter === "registered" && (r.status === "pending" || r.attended)) {
        return false;
      }
      if (statusFilter === "not_attended" && (r.attended || r.status === "pending")) {
        return false;
      }

      // Department filter
      if (departmentFilter !== "All" && r.department !== departmentFilter) {
        return false;
      }

      // Team filter
      if (teamFilter !== "All" && r.team !== teamFilter) {
        return false;
      }

      // Multi-word search term (name, middle name skipped, code, email, phone, role, status)
      if (!matchesMultiWordSearch(r, search)) {
        return false;
      }

      return true;
    });
  }, [allRegistrations, search, statusFilter, departmentFilter, teamFilter]);

  // Derived counts
  const totalPendingCount =
    serverMetrics.totalPending ||
    allRegistrations.filter((r) => r.status === "pending").length;
  const totalRegisteredCount =
    serverMetrics.totalRegistered ||
    allRegistrations.filter((r) => r.status !== "pending").length;
  const totalAttendedCount = allRegistrations.filter((r) => r.attended).length;
  const totalAwaitingCount = Math.max(
    0,
    totalRegisteredCount - totalAttendedCount
  );
  const checkinRate =
    totalRegisteredCount > 0
      ? Math.round((totalAttendedCount / totalRegisteredCount) * 100)
      : 0;

  // Pagination slice (supports both Registrations and Eligible tab)
  const isEligibleTab = statusFilter === "eligible";
  const activeRows = isEligibleTab ? filteredEligible : filteredRegistrations;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedRows = activeRows.slice(startIndex, startIndex + PAGE_SIZE);

  // Handle Excel Export
  const handleExport = async () => {
    setExporting(true);
    try {
      const count = await exportWorkersBallWorkbook({
        registrations: isEligibleTab ? filteredEligible : filteredRegistrations,
      });
      toast.success(
        `Exported ${count} record${count !== 1 ? "s" : ""} to Excel.`
      );
    } catch (err) {
      toast.error(err?.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  // Copy code helper
  const handleCopyCode = async (code, e) => {
    if (e) e.stopPropagation();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Copied ${code} to clipboard`);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      toast.info(`Access Code: ${code}`);
    }
  };

  // Copy invite URL helper
  const handleCopyInviteUrl = async (url, e) => {
    if (e) e.stopPropagation();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInviteUrl(url);
      toast.success("Copied invite link to clipboard");
      setTimeout(() => setCopiedInviteUrl(null), 2500);
    } catch {
      toast.info(`Invite URL: ${url}`);
    }
  };

  // Search workforce for inviting
  const handleInviteSearch = async (e) => {
    if (e) e.preventDefault();
    const term = inviteSearchTerm.trim();
    if (!term) {
      toast.error("Enter a worker's name to search.");
      return;
    }
    setInviteSearching(true);
    try {
      const results = await searchWorkersBall(term);
      setInviteSearchResults(results);
    } catch (err) {
      toast.error(err?.message || "Failed to search workforce.");
    } finally {
      setInviteSearching(false);
    }
  };

  const getWorkerTargetId = (worker) => worker?.workerId ?? worker?.id;

  const isWorkerSelected = useCallback(
    (worker) => {
      const targetId = getWorkerTargetId(worker);
      if (!targetId) return false;
      return selectedToInvite.some(
        (w) => String(getWorkerTargetId(w)) === String(targetId)
      );
    },
    [selectedToInvite]
  );

  const toggleSelectWorkerToInvite = (worker) => {
    const targetId = getWorkerTargetId(worker);
    if (!targetId) return;
    setSelectedToInvite((prev) => {
      const exists = prev.some(
        (w) => String(getWorkerTargetId(w)) === String(targetId)
      );
      if (exists) {
        return prev.filter(
          (w) => String(getWorkerTargetId(w)) !== String(targetId)
        );
      }
      return [...prev, { ...worker, id: targetId }];
    });
  };

  // Select All / Deselect All for a given eligible workers list
  const handleToggleSelectAllEligible = (workersList = []) => {
    const validWorkers = workersList.filter((w) => Boolean(getWorkerTargetId(w)));
    if (validWorkers.length === 0) return;

    const allCurrentlySelected = validWorkers.every((w) => isWorkerSelected(w));
    if (allCurrentlySelected) {
      const idsToRemove = new Set(
        validWorkers.map((w) => String(getWorkerTargetId(w)))
      );
      setSelectedToInvite((prev) =>
        prev.filter((w) => !idsToRemove.has(String(getWorkerTargetId(w))))
      );
    } else {
      setSelectedToInvite((prev) => {
        const existingMap = new Map(
          prev.map((w) => [String(getWorkerTargetId(w)), w])
        );
        validWorkers.forEach((w) => {
          const id = getWorkerTargetId(w);
          existingMap.set(String(id), { ...w, id });
        });
        return Array.from(existingMap.values());
      });
    }
  };

  const parseManualWorkerIds = () => {
    if (!manualWorkerIdsInput.trim()) return [];
    return manualWorkerIdsInput
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => {
        const num = Number(token);
        return Number.isFinite(num) ? num : token;
      });
  };

  // Shared helper to dispatch invites for an array of worker IDs
  const dispatchWorkerInvites = async (workerIds, clearSelectionAfter = true) => {
    const uniqueIds = Array.from(new Set(workerIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      toast.error("Please select at least one worker to invite.");
      return null;
    }

    setSendingInvites(true);
    try {
      const res = await sendWorkersBallInvites(uniqueIds);
      setLastInviteResult(res);
      if (Array.isArray(res.sent) && res.sent.length > 0) {
        setInviteUrlByWorkerId((prev) => {
          const next = { ...prev };
          res.sent.forEach((item) => {
            if (item.workerId && item.inviteUrl) {
              next[String(item.workerId)] = item.inviteUrl;
            }
          });
          return next;
        });
      }

      if (res.sentCount > 0) {
        toast.success(
          `Sent ${res.sentCount} Workers Ball invite${res.sentCount === 1 ? "" : "s"}${
            res.skippedCount > 0 ? ` (${res.skippedCount} skipped)` : ""
          }.`
        );
      } else if (res.skippedCount > 0) {
        toast.info(`No new invites sent (${res.skippedCount} skipped).`);
      } else {
        toast.success(res.message || "Invites processed.");
      }

      if (clearSelectionAfter) {
        setSelectedToInvite([]);
        setManualWorkerIdsInput("");
      }
      await loadData(true);
      return res;
    } catch (err) {
      toast.error(err?.message || "Failed to send Workers Ball invites.");
      return null;
    } finally {
      setSendingInvites(false);
    }
  };

  const handleSendInvitesSubmit = async (e) => {
    if (e) e.preventDefault();
    const fromSelected = selectedToInvite.map((w) => getWorkerTargetId(w));
    const fromManual = parseManualWorkerIds();
    const combinedIds = Array.from(new Set([...fromSelected, ...fromManual]));

    if (combinedIds.length === 0) {
      toast.error("Please select at least one worker or enter a worker ID.");
      return;
    }

    await dispatchWorkerInvites(combinedIds, true);
  };

  // Invite All eligible workers in the provided list (respecting active filters)
  const handleInviteAllEligible = async (workersList = []) => {
    const ids = workersList
      .map((w) => getWorkerTargetId(w))
      .filter(Boolean);
    if (ids.length === 0) {
      toast.error("No eligible workers available to invite.");
      return;
    }
    await dispatchWorkerInvites(ids, false);
  };

  // Invite Selected eligible workers
  const handleInviteSelectedEligible = async () => {
    const ids = selectedToInvite
      .map((w) => getWorkerTargetId(w))
      .filter(Boolean);
    if (ids.length === 0) {
      toast.error("Please select at least one eligible worker.");
      return;
    }
    await dispatchWorkerInvites(ids, true);
  };

  // Invite One worker (used on both Pending rows and Eligible rows)
  const handleQuickResendInvite = async (row, e) => {
    if (e) e.stopPropagation();
    const targetId = getWorkerTargetId(row);
    if (!targetId || resendingWorkerId) return;

    setResendingWorkerId(targetId);
    try {
      const res = await sendWorkersBallInvites([targetId]);
      if (Array.isArray(res.sent) && res.sent.length > 0) {
        const sentItem = res.sent[0];
        if (sentItem?.inviteUrl) {
          setInviteUrlByWorkerId((prev) => ({
            ...prev,
            [String(targetId)]: sentItem.inviteUrl,
          }));
        }
        toast.success(
          `Invite sent to ${row.name || `Worker #${targetId}`}${
            sentItem?.email ? ` (${sentItem.email})` : ""
          }`
        );
      } else if (res.skippedCount > 0) {
        toast.info(
          res.skipped?.[0]?.reason ||
            `Invite skipped for ${row.name || `Worker #${targetId}`}.`
        );
      } else {
        toast.success(res.message || "Invite processed.");
      }
      await loadData(true);
    } catch (err) {
      toast.error(err?.message || "Failed to send invite.");
    } finally {
      setResendingWorkerId(null);
    }
  };

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== "all" ||
    departmentFilter !== "All" ||
    teamFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDepartmentFilter("All");
    setTeamFilter("All");
  };

  if (!hasAccess) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="rounded-2xl border border-brick/30 bg-brick/5 p-8 text-center">
            <h2 className="text-xl font-bold text-brick mb-2">Access Denied</h2>
            <p className="text-sm text-ink-600 mb-6">
              Super Admin authorization is required to track Workers Ball
              registrations and attendance.
            </p>
            <Link
              to={getPostLoginPath(authUser)}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-cream"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Link
              to="/attendance/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-ink-500 hover:text-ink transition"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to Dashboard
            </Link>
            <p className="text-2xs font-mono uppercase tracking-widest text-ink-400">
              Super Admin
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Workers Ball 2026 Tracking
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setLastInviteResult(null);
                setInviteModalOpen(true);
                if (!eligibleLoaded && !loadingEligible) {
                  void loadEligible(false);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sienna px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sienna-dark transition cursor-pointer"
            >
              <UserPlusIcon className="h-4 w-4" />
              Invite Workers
            </button>

            <button
              type="button"
              onClick={() => {
                handleStatusChange("eligible");
                void loadEligible(
                  true,
                  search.trim() ? { search: search.trim() } : {}
                );
              }}
              disabled={loadingEligible}
              className="inline-flex items-center rounded-lg border border-sienna/30 bg-sienna/10 px-3.5 py-2 text-xs font-semibold text-sienna transition hover:bg-sienna/20 disabled:opacity-50 cursor-pointer"
            >
              {loadingEligible ? "Fetching Eligible..." : "Fetch Eligible"}
            </button>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-xs font-medium text-ink transition hover:bg-ink-50 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || loading || activeRows.length === 0}
              className="inline-flex items-center rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-xs font-medium text-ink transition hover:bg-ink-50 hover:border-ink-300 disabled:opacity-50 shadow-xs"
            >
              {exporting ? "Generating Excel..." : "Export Excel"}
            </button>

            <Link
              to="/scan/wb26"
              state={{ from: "/admin/workers-ball-registrations" }}
              className="inline-flex items-center rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-cream shadow-sm hover:bg-ink-900 transition focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            >
              Scanner Desk
            </Link>
          </div>
        </div>

        {/* Metrics KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Registered (Confirmed) */}
          <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-500">
              Registered
            </span>
            <div className="mt-3 text-3xl font-extrabold text-ink tracking-tight">
              {loading ? "..." : totalRegisteredCount.toLocaleString()}
            </div>
          </div>

          {/* Attended */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-semibold">
              Attended
            </span>
            <div className="mt-3 text-3xl font-extrabold text-emerald-950 tracking-tight">
              {loading ? "..." : totalAttendedCount.toLocaleString()}
            </div>
          </div>

          {/* Pending Confirmation */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-800 font-semibold">
              Pending
            </span>
            <div className="mt-3 text-3xl font-extrabold text-amber-950 tracking-tight">
              {loading ? "..." : totalPendingCount.toLocaleString()}
            </div>
          </div>

          {/* Turnout */}
          <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-500">
                Turnout
              </span>
              <span className="text-xs font-bold font-mono text-ink-700">
                {checkinRate}%
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-ink tracking-tight">
              {loading ? "..." : `${checkinRate}%`}
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-ink-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-600 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, checkinRate))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status Tab Navigation & Search Toolbar */}
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-xs space-y-4">
          {/* Top Row: Status Tabs & Result Count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-ink-100 pb-3">
            <div className="inline-flex flex-wrap rounded-lg bg-ink-100/80 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleStatusChange("all")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "all"
                    ? "bg-white text-ink shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>All</span>
                <span className="rounded-full bg-ink-100 px-1.5 py-0.2 text-2xs text-ink-700">
                  {allRegistrations.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleStatusChange("eligible");
                  if (!eligibleLoaded && !loadingEligible) {
                    void loadEligible(false);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "eligible"
                    ? "bg-sienna text-white shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>Eligible</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    statusFilter === "eligible"
                      ? "bg-sienna-dark text-white"
                      : "bg-sienna/15 text-sienna"
                  }`}
                >
                  {eligibleWorkers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("attended")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "attended"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>Attended</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    statusFilter === "attended"
                      ? "bg-emerald-700 text-emerald-100"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {totalAttendedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("registered")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "registered"
                    ? "bg-ink-800 text-white shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>Registered</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    statusFilter === "registered"
                      ? "bg-ink-900 text-ink-100"
                      : "bg-ink-100 text-ink-800"
                  }`}
                >
                  {totalAwaitingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("pending")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "pending"
                    ? "bg-amber-600 text-white shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>Pending</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    statusFilter === "pending"
                      ? "bg-amber-700 text-amber-100"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {totalPendingCount}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-ink-500">
              <span>
                <strong className="text-ink">{activeRows.length}</strong> of{" "}
                {isEligibleTab ? eligibleWorkers.length : allRegistrations.length}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-brick hover:underline ml-2"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Multi-Field Search & Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <input
                type="search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search name, code, email, phone..."
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink placeholder:text-ink-400 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>

            {/* Department Dropdown */}
            <div>
              <select
                aria-label="Filter by Department"
                value={departmentFilter}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition"
              >
                <option value="All">All Departments</option>
                {departmentOptions
                  .filter((d) => d !== "All")
                  .map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
              </select>
            </div>

            {/* Team Dropdown */}
            <div>
              <select
                aria-label="Filter by Team"
                value={teamFilter}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition"
              >
                <option value="All">All Teams</option>
                {teamOptions
                  .filter((t) => t !== "All")
                  .map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Bulk Invite Action Bar on Eligible Tab */}
          {isEligibleTab && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-ink-100">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllEligible(filteredEligible)}
                  disabled={filteredEligible.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink-50 disabled:opacity-50 transition cursor-pointer"
                >
                  {filteredEligible.length > 0 &&
                  filteredEligible.every((w) => isWorkerSelected(w))
                    ? "Deselect All"
                    : `Select All (${filteredEligible.length})`}
                </button>

                {selectedToInvite.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedToInvite([])}
                    className="text-xs font-medium text-brick hover:underline px-2 py-1 cursor-pointer"
                  >
                    Clear Selection ({selectedToInvite.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleInviteSelectedEligible}
                  disabled={sendingInvites || selectedToInvite.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-1.5 text-xs font-semibold text-cream hover:bg-ink-900 disabled:opacity-50 transition cursor-pointer"
                >
                  <PaperAirplaneIcon className="h-3.5 w-3.5" />
                  {sendingInvites
                    ? "Sending..."
                    : `Invite Selected (${selectedToInvite.length})`}
                </button>

                <button
                  type="button"
                  onClick={() => handleInviteAllEligible(filteredEligible)}
                  disabled={sendingInvites || filteredEligible.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sienna px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sienna-dark disabled:opacity-50 transition cursor-pointer"
                >
                  <PaperAirplaneIcon className="h-3.5 w-3.5" />
                  {sendingInvites
                    ? "Sending..."
                    : `Invite All (${filteredEligible.length})`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-ink-200 bg-white shadow-xs overflow-hidden">
          {isEligibleTab ? (
            loadingEligible ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-ink">
                  Loading eligible workers...
                </p>
              </div>
            ) : eligibleError ? (
              <div className="p-12 text-center">
                <p className="text-sm font-semibold text-brick mb-2">
                  {eligibleError}
                </p>
                <button
                  type="button"
                  onClick={() => loadEligible(true)}
                  className="inline-flex items-center rounded-lg bg-ink px-4 py-2 text-xs font-medium text-cream hover:bg-ink-900 transition"
                >
                  Retry
                </button>
              </div>
            ) : filteredEligible.length === 0 ? (
              <div className="p-12 text-center">
                <h3 className="text-base font-semibold text-ink">
                  No eligible workers found
                </h3>
                <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                  {hasActiveFilters
                    ? "Try loosening your search term, department, or team filter."
                    : "Click Fetch Eligible to load eligible workers from the server."}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadEligible(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-sienna px-3 py-1.5 text-xs font-semibold text-white hover:bg-sienna-dark"
                  >
                    Fetch Eligible
                  </button>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink hover:bg-ink-50"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-ink-200 bg-ink-50/70 text-ink-700 font-mono text-2xs uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all eligible workers"
                          checked={
                            filteredEligible.length > 0 &&
                            filteredEligible.every((w) => isWorkerSelected(w))
                          }
                          onChange={() =>
                            handleToggleSelectAllEligible(filteredEligible)
                          }
                          className="h-4 w-4 rounded border-ink-300 text-sienna focus:ring-sienna cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold w-12">#</th>
                      <th className="py-3 px-4 font-semibold">Worker</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold hidden md:table-cell">
                        Department / Team
                      </th>
                      <th className="py-3 px-4 font-semibold hidden lg:table-cell">
                        Contact
                      </th>
                      <th className="py-3 px-4 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {paginatedRows.map((row, index) => {
                      const sn = startIndex + index + 1;
                      const targetId = getWorkerTargetId(row);
                      const checked = isWorkerSelected(row);
                      const inviteLink =
                        row.inviteUrl || inviteUrlByWorkerId[String(targetId)];

                      return (
                        <tr
                          key={targetId || index}
                          className={`transition cursor-pointer ${
                            checked
                              ? "bg-amber-50/60"
                              : "hover:bg-amber-50/30"
                          }`}
                          onClick={() => toggleSelectWorkerToInvite(row)}
                        >
                          <td
                            className="py-3.5 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${row.name}`}
                              checked={checked}
                              onChange={() => toggleSelectWorkerToInvite(row)}
                              className="h-4 w-4 rounded border-ink-300 text-sienna focus:ring-sienna cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-mono text-ink-400">
                            {sn}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-ink text-sm">
                              {row.name}
                            </div>
                            <div className="text-2xs text-ink-500 font-medium">
                              {row.role || "Worker"}{" "}
                              {targetId ? `• #${targetId}` : ""}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {row.registered ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 w-max">
                                REGISTERED
                              </span>
                            ) : row.invited ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-amber-50 text-amber-800 border border-amber-200 w-max">
                                INVITED
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-ink-100 text-ink-800 border border-ink-200 w-max">
                                ELIGIBLE
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 hidden md:table-cell">
                            <div className="text-ink font-medium">
                              {row.department || "Unassigned"}
                            </div>
                            <div className="text-2xs text-ink-500">
                              {row.team || "Unassigned"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 hidden lg:table-cell">
                            <div className="text-ink font-mono text-2xs truncate max-w-xs">
                              {row.email || "-"}
                            </div>
                            <div className="text-2xs text-ink-500 font-mono">
                              {row.phone || "-"}
                            </div>
                          </td>
                          <td
                            className="py-3.5 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {targetId && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickResendInvite(row, e)}
                                  disabled={resendingWorkerId === targetId}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-sienna bg-sienna/10 hover:bg-sienna/20 border border-sienna/25 transition disabled:opacity-50 cursor-pointer"
                                >
                                  <PaperAirplaneIcon className="h-3 w-3" />
                                  {resendingWorkerId === targetId
                                    ? "Sending..."
                                    : "Invite"}
                                </button>
                              )}
                              {inviteLink && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopyInviteUrl(inviteLink, e)
                                  }
                                  title="Copy Personal Invite Link"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-ink-700 bg-white hover:bg-ink-50 border border-ink-200 transition cursor-pointer"
                                >
                                  {copiedInviteUrl === inviteLink ? (
                                    <CheckIcon className="h-3.5 w-3.5 text-forest" />
                                  ) : (
                                    <LinkIcon className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : loading ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium text-ink">
                Loading registrations...
              </p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-brick mb-2">{error}</p>
              <button
                type="button"
                onClick={() => loadData()}
                className="inline-flex items-center rounded-lg bg-ink px-4 py-2 text-xs font-medium text-cream hover:bg-ink-900 transition"
              >
                Retry
              </button>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-base font-semibold text-ink">
                No registrations found
              </h3>
              <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Try loosening your search term or filter criteria."
                  : "No workforce registrations recorded yet."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink hover:bg-ink-50"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/70 text-ink-700 font-mono text-2xs uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold w-12">#</th>
                    <th className="py-3 px-4 font-semibold">Worker</th>
                    <th className="py-3 px-4 font-semibold">Access Code</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold hidden md:table-cell">
                      Department / Team
                    </th>
                    <th className="py-3 px-4 font-semibold hidden lg:table-cell">
                      Contact
                    </th>
                    <th className="py-3 px-4 font-semibold hidden xl:table-cell">
                      Registered
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {paginatedRows.map((row, index) => {
                    const sn = startIndex + index + 1;
                    const isAttended = row.attended;

                    return (
                      <tr
                        key={row.id || row.code || index}
                        className="hover:bg-amber-50/30 transition cursor-pointer"
                        onClick={() => setSelectedWorker(row)}
                      >
                        {/* Serial Number */}
                        <td className="py-3.5 px-4 font-mono text-ink-400">
                          {sn}
                        </td>

                        {/* Worker Name & Role */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-ink text-sm">
                            {row.name}
                          </div>
                          <div className="text-2xs text-ink-500 font-medium">
                            {row.role || "Worker"}
                          </div>
                        </td>

                        {/* HGWB Access Code */}
                        <td className="py-3.5 px-4">
                          {row.code ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-ink-100 border border-ink-200 text-ink-900 tracking-wider">
                                {row.code}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyCode(row.code, e)}
                                title="Copy Access Code"
                                className="p-1 rounded text-ink-400 hover:text-ink hover:bg-ink-100 transition"
                              >
                                {copiedCode === row.code ? (
                                  <CheckIcon className="h-3.5 w-3.5 text-forest" />
                                ) : (
                                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ) : row.status === "pending" ? (
                            <span className="text-amber-700 font-mono text-2xs">Pending</span>
                          ) : (
                            <span className="text-ink-400 font-mono text-2xs">-</span>
                          )}
                        </td>

                        {/* Attendance Status */}
                        <td className="py-3.5 px-4">
                          {isAttended ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 w-max">
                                ATTENDED
                              </span>
                              {row.attendedAt && (
                                <span className="text-3xs text-ink-500 font-mono pl-0.5">
                                  {formatDateSafe(row.attendedAt, "h:mm a")}
                                </span>
                              )}
                            </div>
                          ) : row.status === "pending" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-amber-50 text-amber-800 border border-amber-200 w-max">
                              PENDING
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-ink-100 text-ink-800 border border-ink-200 w-max">
                              REGISTERED
                            </span>
                          )}
                        </td>

                        {/* Department / Team */}
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <div className="text-ink font-medium">
                            {row.department || "Unassigned"}
                          </div>
                          <div className="text-2xs text-ink-500">
                            {row.team || "Unassigned"}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 hidden lg:table-cell">
                          <div className="text-ink font-mono text-2xs truncate max-w-xs">
                            {row.email || "-"}
                          </div>
                          <div className="text-2xs text-ink-500 font-mono">
                            {row.phone || "-"}
                          </div>
                        </td>

                        {/* Registered Date */}
                        <td className="py-3.5 px-4 hidden xl:table-cell text-ink-500 font-mono text-2xs">
                          {formatDateSafe(row.registeredAt, "dd MMM, h:mm a")}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {row.status === "pending" && (row.workerId || row.id) && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickResendInvite(row, e)}
                                disabled={resendingWorkerId === (row.workerId ?? row.id)}
                                title="Send or Resend Workers Ball Invite"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-sienna bg-sienna/10 hover:bg-sienna/20 border border-sienna/25 transition disabled:opacity-50 cursor-pointer"
                              >
                                <PaperAirplaneIcon className="h-3 w-3" />
                                {resendingWorkerId === (row.workerId ?? row.id)
                                  ? "Sending..."
                                  : "Resend"}
                              </button>
                            )}
                            {(row.inviteUrl ||
                              inviteUrlByWorkerId[String(row.workerId ?? row.id)]) && (
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleCopyInviteUrl(
                                    row.inviteUrl ||
                                      inviteUrlByWorkerId[String(row.workerId ?? row.id)],
                                    e
                                  )
                                }
                                title="Copy Personal Invite Link"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-ink-700 bg-white hover:bg-ink-50 border border-ink-200 transition cursor-pointer"
                              >
                                {copiedInviteUrl ===
                                (row.inviteUrl ||
                                  inviteUrlByWorkerId[String(row.workerId ?? row.id)]) ? (
                                  <CheckIcon className="h-3.5 w-3.5 text-forest" />
                                ) : (
                                  <LinkIcon className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWorker(row);
                              }}
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-ink-700 bg-ink-50 hover:bg-ink-100 border border-ink-200 transition cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {!(isEligibleTab ? loadingEligible : loading) &&
            activeRows.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-ink-200 px-4 py-3 bg-white">
                <span className="text-xs text-ink-500 font-mono">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + PAGE_SIZE, activeRows.length)} of{" "}
                  {activeRows.length} results
                </span>

                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <span className="px-3 text-xs font-mono text-ink-700">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={safePage >= totalPages}
                    className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Worker Pass & Registration Detail Modal */}
        {selectedWorker && (
          <GenericModal
            isOpen={Boolean(selectedWorker)}
            onClose={() => setSelectedWorker(null)}
            title="Workers Ball Registration Record"
            size="medium"
          >
            <div className="space-y-5">
              {/* Luxury Pass Card Preview */}
              <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#1A1714] via-[#121110] to-[#0A0908] p-5 text-amber-50 shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-3xs font-mono uppercase tracking-widest text-amber-400">
                      OFFICIAL GALA PASS • 2026
                    </span>
                    <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                      {selectedWorker.name}
                    </h3>
                    <p className="text-xs text-amber-200/80">
                      {selectedWorker.role} • {selectedWorker.department}
                    </p>
                  </div>
                  {/* Status Indicator */}
                  {selectedWorker.attended ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      ACCREDITED
                    </span>
                  ) : selectedWorker.status === "pending" ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      PENDING
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      REGISTERED
                    </span>
                  )}
                </div>

                {/* Pass Code Barcode Stub */}
                <div className="mt-4 pt-4 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-3xs font-mono uppercase tracking-widest text-amber-300/70">
                      ACCREDITATION CODE
                    </span>
                    <div className="font-mono text-xl font-extrabold text-amber-300 tracking-wider">
                      {selectedWorker.code || (selectedWorker.status === "pending" ? "PENDING" : "-")}
                    </div>
                  </div>
                  {selectedWorker.code && (
                    <button
                      type="button"
                      onClick={() => handleCopyCode(selectedWorker.code)}
                      className="inline-flex items-center self-start sm:self-center px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-mono transition"
                    >
                      {copiedCode === selectedWorker.code ? "Copied" : "Copy Code"}
                    </button>
                  )}
                </div>
              </div>

              {/* Data Fields Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-ink-50/50 p-4 rounded-xl border border-ink-100">
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Department
                  </span>
                  <div className="font-semibold text-ink mt-0.5">
                    {selectedWorker.department || "Unassigned"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Team
                  </span>
                  <div className="font-semibold text-ink mt-0.5">
                    {selectedWorker.team || "Unassigned"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Email
                  </span>
                  <div className="font-mono text-ink mt-0.5 truncate">
                    {selectedWorker.email || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Phone
                  </span>
                  <div className="font-mono text-ink mt-0.5">
                    {selectedWorker.phone || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Registered
                  </span>
                  <div className="font-mono text-ink-700 mt-0.5">
                    {formatDateSafe(selectedWorker.registeredAt)}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Attended
                  </span>
                  <div className="font-mono text-ink-700 mt-0.5">
                    {selectedWorker.attended
                      ? formatDateSafe(selectedWorker.attendedAt)
                      : "Not attended"}
                  </div>
                </div>
              </div>

              {/* Personal Invite Link (if available) */}
              {(selectedWorker.inviteUrl ||
                inviteUrlByWorkerId[
                  String(selectedWorker.workerId ?? selectedWorker.id)
                ]) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xs font-mono uppercase tracking-wider text-amber-800 font-semibold">
                      Personal Invite Link
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyInviteUrl(
                          selectedWorker.inviteUrl ||
                            inviteUrlByWorkerId[
                              String(selectedWorker.workerId ?? selectedWorker.id)
                            ]
                        )
                      }
                      className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-2xs font-mono font-semibold text-amber-900 border border-amber-200 hover:bg-amber-100/60 transition cursor-pointer"
                    >
                      {copiedInviteUrl ===
                      (selectedWorker.inviteUrl ||
                        inviteUrlByWorkerId[
                          String(selectedWorker.workerId ?? selectedWorker.id)
                        ]) ? (
                        <>
                          <CheckIcon className="h-3 w-3 text-forest" />
                          Copied
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="h-3 w-3" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-2xs font-mono text-ink-700 break-all">
                    {selectedWorker.inviteUrl ||
                      inviteUrlByWorkerId[
                        String(selectedWorker.workerId ?? selectedWorker.id)
                      ]}
                  </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {selectedWorker.status === "pending" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-amber-700 font-medium">
                      Pending confirmation
                    </span>
                    {(selectedWorker.workerId || selectedWorker.id) && (
                      <button
                        type="button"
                        onClick={() => handleQuickResendInvite(selectedWorker)}
                        disabled={
                          resendingWorkerId ===
                          (selectedWorker.workerId ?? selectedWorker.id)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-sienna px-3 py-1.5 text-xs font-semibold text-white hover:bg-sienna-dark transition disabled:opacity-50 cursor-pointer"
                      >
                        <PaperAirplaneIcon className="h-3.5 w-3.5" />
                        {resendingWorkerId ===
                        (selectedWorker.workerId ?? selectedWorker.id)
                          ? "Sending..."
                          : "Send / Resend Invite"}
                      </button>
                    )}
                  </div>
                ) : !selectedWorker.attended ? (
                  <Link
                    to="/scan/wb26"
                    state={{ from: "/admin/workers-ball-registrations" }}
                    className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
                  >
                    Scanner Desk
                  </Link>
                ) : (
                  <span className="text-xs text-emerald-700 font-medium">
                    Attended
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedWorker(null)}
                  className="w-full sm:w-auto rounded-lg border border-ink-200 px-4 py-2 text-xs font-medium text-ink hover:bg-ink-100 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </GenericModal>
        )}

        {/* Invite Workers Modal (GET /api/workers-ball/eligible + POST /api/workers-ball/invites) */}
        {inviteModalOpen && (
          <GenericModal
            isOpen={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            title="Send Workers Ball Invitations"
            size="large"
          >
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-ink-600 leading-relaxed">
                  Fetch eligible workers, filter by department or team, and invite one, selected, or all eligible workers.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    loadEligible(
                      true,
                      modalEligibleSearch.trim()
                        ? { search: modalEligibleSearch.trim() }
                        : {}
                    )
                  }
                  disabled={loadingEligible}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sienna/30 bg-sienna/10 px-3 py-1.5 text-xs font-semibold text-sienna hover:bg-sienna/20 disabled:opacity-50 transition cursor-pointer shrink-0"
                >
                  {loadingEligible ? "Fetching..." : "Fetch / Refresh Eligible"}
                </button>
              </div>

              {/* Eligible Workers Filter & Selection Panel */}
              <div className="rounded-xl border border-ink-200 bg-ink-50/40 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-2xs font-mono uppercase tracking-wider text-ink-700 font-semibold">
                    Eligible Workers ({modalFilteredEligible.length} of{" "}
                    {eligibleWorkers.length})
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleSelectAllEligible(modalFilteredEligible)
                      }
                      disabled={modalFilteredEligible.length === 0}
                      className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2.5 py-1 text-2xs font-semibold text-ink hover:bg-ink-50 disabled:opacity-50 cursor-pointer"
                    >
                      {modalFilteredEligible.length > 0 &&
                      modalFilteredEligible.every((w) => isWorkerSelected(w))
                        ? "Deselect All"
                        : `Select All (${modalFilteredEligible.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleInviteAllEligible(modalFilteredEligible)
                      }
                      disabled={
                        sendingInvites || modalFilteredEligible.length === 0
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-sienna px-2.5 py-1 text-2xs font-semibold text-white hover:bg-sienna-dark disabled:opacity-50 cursor-pointer"
                    >
                      <PaperAirplaneIcon className="h-3 w-3" />
                      {sendingInvites
                        ? "Sending..."
                        : `Invite All (${modalFilteredEligible.length})`}
                    </button>
                  </div>
                </div>

                {/* Modal Filters: Search, Department, Team */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="search"
                    value={modalEligibleSearch}
                    onChange={(e) => setModalEligibleSearch(e.target.value)}
                    placeholder="Filter eligible by name, email..."
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-ink-400 focus:border-sienna focus:outline-hidden"
                  />
                  <select
                    aria-label="Modal Filter by Department"
                    value={modalDepartmentFilter}
                    onChange={(e) => setModalDepartmentFilter(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink focus:border-sienna focus:outline-hidden"
                  >
                    <option value="All">All Departments</option>
                    {departmentOptions
                      .filter((d) => d !== "All")
                      .map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                  </select>
                  <select
                    aria-label="Modal Filter by Team"
                    value={modalTeamFilter}
                    onChange={(e) => setModalTeamFilter(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink focus:border-sienna focus:outline-hidden"
                  >
                    <option value="All">All Teams</option>
                    {teamOptions
                      .filter((t) => t !== "All")
                      .map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Eligible Workers List */}
                {loadingEligible ? (
                  <p className="py-4 text-center text-xs text-ink-500">
                    Loading eligible workers...
                  </p>
                ) : eligibleError ? (
                  <p className="py-3 text-center text-xs text-brick">
                    {eligibleError}
                  </p>
                ) : modalFilteredEligible.length === 0 ? (
                  <p className="py-3 text-center text-xs text-ink-500">
                    No eligible workers match the current filters.
                  </p>
                ) : (
                  <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white max-h-56 overflow-y-auto">
                    {modalFilteredEligible.map((w, idx) => {
                      const targetId = getWorkerTargetId(w);
                      const isSelected = isWorkerSelected(w);
                      return (
                        <li
                          key={targetId || idx}
                          className={`px-3 py-2 flex items-center justify-between gap-2 text-xs transition ${
                            isSelected ? "bg-amber-50/80" : "hover:bg-ink-50/60"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSelectWorkerToInvite(w)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <span
                              className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
                                isSelected
                                  ? "bg-sienna border-sienna text-white"
                                  : "border-ink-300 bg-white"
                              }`}
                            >
                              {isSelected && (
                                <CheckIcon className="h-3 w-3" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-ink truncate">
                                  {w.name}
                                </span>
                                {targetId && (
                                  <span className="font-mono text-2xs text-ink-400">
                                    #{targetId}
                                  </span>
                                )}
                                {w.registered && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-3xs font-mono font-semibold text-emerald-800">
                                    Registered
                                  </span>
                                )}
                                {!w.registered && w.invited && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-3xs font-mono font-semibold text-amber-800">
                                    Invited
                                  </span>
                                )}
                              </div>
                              <div className="text-2xs text-ink-500 truncate">
                                {[w.department, w.team, w.email]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            </div>
                          </button>

                          {targetId && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickResendInvite(w, e)}
                              disabled={resendingWorkerId === targetId}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-semibold text-sienna bg-sienna/10 hover:bg-sienna/20 border border-sienna/25 transition disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                              <PaperAirplaneIcon className="h-3 w-3" />
                              {resendingWorkerId === targetId
                                ? "Sending..."
                                : "Invite"}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Search Workforce Form */}
              <form onSubmit={handleInviteSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="h-4 w-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={inviteSearchTerm}
                    onChange={(e) => setInviteSearchTerm(e.target.value)}
                    placeholder="Search worker by name (e.g. Chidi, Ayodeji)..."
                    className="w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 py-2 text-xs text-ink placeholder:text-ink-400 focus:border-sienna focus:outline-hidden focus:ring-1 focus:ring-sienna"
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviteSearching}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-cream hover:bg-ink-900 disabled:opacity-50 transition cursor-pointer shrink-0"
                >
                  {inviteSearching ? "Searching..." : "Search"}
                </button>
              </form>

              {/* Search Results List */}
              {inviteSearchResults.length > 0 && (
                <div className="rounded-xl border border-ink-200 bg-white overflow-hidden">
                  <div className="bg-ink-50/70 px-3.5 py-2 border-b border-ink-200 flex items-center justify-between text-2xs font-mono uppercase tracking-wider text-ink-600">
                    <span>Search Results ({inviteSearchResults.length})</span>
                    <span>Click to select</span>
                  </div>
                  <ul className="divide-y divide-ink-100 max-h-56 overflow-y-auto">
                    {inviteSearchResults.map((w) => {
                      const isSelected = selectedToInvite.some(
                        (s) => String(s.id) === String(w.id)
                      );
                      return (
                        <li key={w.id}>
                          <button
                            type="button"
                            onClick={() => toggleSelectWorkerToInvite(w)}
                            className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs transition cursor-pointer ${
                              isSelected
                                ? "bg-amber-50/80 text-ink-900"
                                : "hover:bg-ink-50/60 text-ink"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold truncate">
                                  {w.name}
                                </span>
                                <span className="font-mono text-2xs text-ink-400">
                                  #{w.id}
                                </span>
                                {w.registered && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-3xs font-mono font-semibold text-emerald-800">
                                    Registered
                                  </span>
                                )}
                              </div>
                              <div className="text-2xs text-ink-500 truncate">
                                {[w.department, w.team, w.email]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            </div>
                            <span
                              className={`h-5 w-5 rounded flex items-center justify-center border shrink-0 ${
                                isSelected
                                  ? "bg-sienna border-sienna text-white"
                                  : "border-ink-300 bg-white"
                              }`}
                            >
                              {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Selected Workers Chips */}
              {selectedToInvite.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-2xs font-mono uppercase tracking-wider text-ink-500">
                    <span>Selected Workers ({selectedToInvite.length})</span>
                    <button
                      type="button"
                      onClick={() => setSelectedToInvite([])}
                      className="text-brick hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedToInvite.map((w) => (
                      <span
                        key={w.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink"
                      >
                        <span>{w.name}</span>
                        <span className="font-mono text-2xs text-ink-500">
                          #{w.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSelectWorkerToInvite(w)}
                          aria-label={`Remove ${w.name}`}
                          className="text-ink-400 hover:text-brick cursor-pointer"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Worker IDs Input */}
              <div>
                <label
                  htmlFor="wb-manual-worker-ids"
                  className="block text-xs font-semibold text-ink mb-1"
                >
                  Or Enter Worker ID(s) Directly
                </label>
                <input
                  id="wb-manual-worker-ids"
                  type="text"
                  value={manualWorkerIdsInput}
                  onChange={(e) => setManualWorkerIdsInput(e.target.value)}
                  placeholder="e.g. 18, 42, 105"
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-mono text-ink placeholder:text-ink-400 focus:border-sienna focus:outline-hidden focus:ring-1 focus:ring-sienna"
                />
                <p className="text-2xs text-ink-400 mt-1">
                  Separate multiple worker IDs with commas or spaces.
                </p>
              </div>

              {/* Last Invite Dispatch Summary & Generated Links */}
              {lastInviteResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-950">
                      {lastInviteResult.message}
                    </span>
                    <div className="flex items-center gap-2 text-2xs font-mono">
                      <span className="rounded bg-white px-2 py-0.5 border border-ink-200 text-ink-700">
                        Total: {lastInviteResult.total}
                      </span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900 font-semibold">
                        Sent: {lastInviteResult.sentCount}
                      </span>
                      {lastInviteResult.skippedCount > 0 && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900 font-semibold">
                          Skipped: {lastInviteResult.skippedCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {lastInviteResult.sent.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-2xs font-mono uppercase tracking-wider text-emerald-800 font-semibold">
                        Dispatched Invites &amp; Links
                      </p>
                      <ul className="divide-y divide-emerald-200/60 rounded-lg border border-emerald-200 bg-white overflow-hidden text-xs">
                        {lastInviteResult.sent.map((item, idx) => (
                          <li
                            key={item.workerId || idx}
                            className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-ink">
                                  Worker #{item.workerId}
                                </span>
                                {item.email && (
                                  <span className="inline-flex items-center gap-1 text-2xs font-mono text-ink-600">
                                    <EnvelopeIcon className="h-3 w-3" />
                                    {item.email}
                                  </span>
                                )}
                              </div>
                              {item.inviteUrl && (
                                <p className="text-2xs font-mono text-ink-500 truncate max-w-md mt-0.5">
                                  {item.inviteUrl}
                                </p>
                              )}
                            </div>
                            {item.inviteUrl && (
                              <button
                                type="button"
                                onClick={() => handleCopyInviteUrl(item.inviteUrl)}
                                className="inline-flex items-center gap-1 self-start sm:self-center rounded-md border border-ink-200 bg-ink-50 hover:bg-ink-100 px-2.5 py-1 text-2xs font-mono font-semibold text-ink shrink-0 cursor-pointer"
                              >
                                {copiedInviteUrl === item.inviteUrl ? (
                                  <>
                                    <CheckIcon className="h-3.5 w-3.5 text-forest" />
                                    Copied Link
                                  </>
                                ) : (
                                  <>
                                    <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                    Copy Invite Link
                                  </>
                                )}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {lastInviteResult.skipped.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-2xs font-mono uppercase tracking-wider text-amber-800 font-semibold">
                        Skipped ({lastInviteResult.skipped.length})
                      </p>
                      <ul className="text-2xs text-amber-900 space-y-0.5 font-mono">
                        {lastInviteResult.skipped.map((sk, i) => (
                          <li key={sk.workerId || i}>
                            Worker #{sk.workerId}: {sk.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-lg border border-ink-200 px-4 py-2 text-xs font-medium text-ink hover:bg-ink-50 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleInviteAllEligible(modalFilteredEligible)}
                  disabled={
                    sendingInvites || modalFilteredEligible.length === 0
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sienna bg-sienna/10 px-4 py-2 text-xs font-semibold text-sienna hover:bg-sienna/20 transition disabled:opacity-50 cursor-pointer"
                >
                  <PaperAirplaneIcon className="h-3.5 w-3.5" />
                  {sendingInvites
                    ? "Sending..."
                    : `Invite All (${modalFilteredEligible.length})`}
                </button>
                <button
                  type="button"
                  onClick={handleSendInvitesSubmit}
                  disabled={
                    sendingInvites ||
                    (selectedToInvite.length === 0 && !manualWorkerIdsInput.trim())
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sienna px-4 py-2 text-xs font-semibold text-white hover:bg-sienna-dark transition disabled:opacity-50 cursor-pointer"
                >
                  <PaperAirplaneIcon className="h-3.5 w-3.5" />
                  {sendingInvites
                    ? "Sending Invites..."
                    : selectedToInvite.length > 0
                      ? `Invite Selected (${selectedToInvite.length})`
                      : "Send Invites"}
                </button>
              </div>
            </div>
          </GenericModal>
        )}
      </div>
    </Layout>
  );
}
