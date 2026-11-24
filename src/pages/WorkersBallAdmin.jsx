import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../components/Layout";
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
  UserPlusIcon,
} from "@heroicons/react/24/outline";

import BallInviteModal from "../components/workersBall/BallInviteModal";
import BallRegistrationModal from "../components/workersBall/BallRegistrationModal";
import BallAdminTable from "../components/workersBall/BallAdminTable";
import BallAdminToolbar from "../components/workersBall/BallAdminToolbar";
import BallAdminMetrics from "../components/workersBall/BallAdminMetrics";
import { PAGE_SIZE, matchesMultiWordSearch } from "../components/workersBall/adminUtils";


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

  // Enrich eligible workers with live status from allRegistrations &inviteUrlByWorkerId
  const enrichedEligibleWorkers = useMemo(() => {
    const regByWorkerId = new Map();
    const regByEmail = new Map();
    allRegistrations.forEach((r) => {
      const rWid = r.workerId ?? r.id;
      if (rWid !== null && rWid !== undefined) {
        regByWorkerId.set(String(rWid), r);
      }
      if (r.email) {
        regByEmail.set(String(r.email).toLowerCase(), r);
      }
    });

    return eligibleWorkers.map((w) => {
      const wId = w.workerId ?? w.id;
      const matchedReg =
        (wId !== null && wId !== undefined && regByWorkerId.get(String(wId))) ||
        (w.email && regByEmail.get(String(w.email).toLowerCase())) ||
        null;
      const dispatchedInviteUrl =
        wId !== null && wId !== undefined
          ? inviteUrlByWorkerId[String(wId)]
          : "";

      const isRegistered = Boolean(
        w.registered ||
          (matchedReg && matchedReg.status !== "pending") ||
          matchedReg?.code
      );
      const isInvited = Boolean(
        w.invited ||
          dispatchedInviteUrl ||
          matchedReg?.status === "pending" ||
          matchedReg?.inviteUrl
      );

      return {
        ...w,
        registered: isRegistered,
        invited: isInvited,
        status: isRegistered
          ? "registered"
          : isInvited
            ? "invited"
            : w.status || "eligible",
        inviteUrl: w.inviteUrl || dispatchedInviteUrl || matchedReg?.inviteUrl || "",
      };
    });
  }, [eligibleWorkers, allRegistrations, inviteUrlByWorkerId]);

  // Filtered eligible workers on the main Eligible tab
  const filteredEligible = useMemo(() => {
    return enrichedEligibleWorkers.filter((w) => {
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
  }, [enrichedEligibleWorkers, search, departmentFilter, teamFilter]);

  // Filtered eligible workers inside the Invite Modal
  const modalFilteredEligible = useMemo(() => {
    return enrichedEligibleWorkers.filter((w) => {
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
    enrichedEligibleWorkers,
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

  const getWorkerTargetId = (worker) => {
    const raw = worker?.workerId ?? worker?.id;
    if (raw === null || raw === undefined) return null;
    if (String(raw).startsWith("eligible-")) return null;
    return raw;
  };

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

      if (res.partialError) {
        toast.warning(
          `Some remaining invites paused (${res.partialError}). Please retry the remaining uninvited workers.`
        );
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
        <BallAdminMetrics
          loading={loading}
          totalRegisteredCount={totalRegisteredCount}
          totalAttendedCount={totalAttendedCount}
          totalPendingCount={totalPendingCount}
          checkinRate={checkinRate}
        />

        {/* Status Tab Navigation & Search Toolbar */}
        <BallAdminToolbar
          handleStatusChange={handleStatusChange}
          statusFilter={statusFilter}
          allRegistrations={allRegistrations}
          eligibleLoaded={eligibleLoaded}
          loadingEligible={loadingEligible}
          loadEligible={loadEligible}
          eligibleWorkers={eligibleWorkers}
          totalAttendedCount={totalAttendedCount}
          totalAwaitingCount={totalAwaitingCount}
          totalPendingCount={totalPendingCount}
          activeRows={activeRows}
          isEligibleTab={isEligibleTab}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          search={search}
          handleSearchChange={handleSearchChange}
          departmentFilter={departmentFilter}
          handleDepartmentChange={handleDepartmentChange}
          departmentOptions={departmentOptions}
          teamFilter={teamFilter}
          handleTeamChange={handleTeamChange}
          teamOptions={teamOptions}
          handleToggleSelectAllEligible={handleToggleSelectAllEligible}
          filteredEligible={filteredEligible}
          isWorkerSelected={isWorkerSelected}
          selectedToInvite={selectedToInvite}
          setSelectedToInvite={setSelectedToInvite}
          handleInviteSelectedEligible={handleInviteSelectedEligible}
          sendingInvites={sendingInvites}
          handleInviteAllEligible={handleInviteAllEligible}
        />

        {/* Data Table */}
        <BallAdminTable
          isEligibleTab={isEligibleTab}
          loadingEligible={loadingEligible}
          eligibleError={eligibleError}
          loadEligible={loadEligible}
          filteredEligible={filteredEligible}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          isWorkerSelected={isWorkerSelected}
          handleToggleSelectAllEligible={handleToggleSelectAllEligible}
          paginatedRows={paginatedRows}
          startIndex={startIndex}
          getWorkerTargetId={getWorkerTargetId}
          inviteUrlByWorkerId={inviteUrlByWorkerId}
          toggleSelectWorkerToInvite={toggleSelectWorkerToInvite}
          handleQuickResendInvite={handleQuickResendInvite}
          resendingWorkerId={resendingWorkerId}
          handleCopyInviteUrl={handleCopyInviteUrl}
          copiedInviteUrl={copiedInviteUrl}
          loading={loading}
          error={error}
          loadData={loadData}
          filteredRegistrations={filteredRegistrations}
          setSelectedWorker={setSelectedWorker}
          handleCopyCode={handleCopyCode}
          copiedCode={copiedCode}
          activeRows={activeRows}
          setCurrentPage={setCurrentPage}
          safePage={safePage}
          totalPages={totalPages}
        />

        {/* Worker Pass & Registration Detail Modal */}
        <BallRegistrationModal
          selectedWorker={selectedWorker}
          setSelectedWorker={setSelectedWorker}
          handleCopyCode={handleCopyCode}
          copiedCode={copiedCode}
          inviteUrlByWorkerId={inviteUrlByWorkerId}
          handleCopyInviteUrl={handleCopyInviteUrl}
          copiedInviteUrl={copiedInviteUrl}
          handleQuickResendInvite={handleQuickResendInvite}
          resendingWorkerId={resendingWorkerId}
        />

        {/* Invite Workers Modal (GET /api/workers-ball/eligible + POST /api/workers-ball/invites) */}
        <BallInviteModal
          inviteModalOpen={inviteModalOpen}
          setInviteModalOpen={setInviteModalOpen}
          loadEligible={loadEligible}
          modalEligibleSearch={modalEligibleSearch}
          loadingEligible={loadingEligible}
          modalFilteredEligible={modalFilteredEligible}
          eligibleWorkers={eligibleWorkers}
          handleToggleSelectAllEligible={handleToggleSelectAllEligible}
          isWorkerSelected={isWorkerSelected}
          handleInviteAllEligible={handleInviteAllEligible}
          sendingInvites={sendingInvites}
          setModalEligibleSearch={setModalEligibleSearch}
          modalDepartmentFilter={modalDepartmentFilter}
          setModalDepartmentFilter={setModalDepartmentFilter}
          departmentOptions={departmentOptions}
          modalTeamFilter={modalTeamFilter}
          setModalTeamFilter={setModalTeamFilter}
          teamOptions={teamOptions}
          eligibleError={eligibleError}
          getWorkerTargetId={getWorkerTargetId}
          toggleSelectWorkerToInvite={toggleSelectWorkerToInvite}
          handleQuickResendInvite={handleQuickResendInvite}
          resendingWorkerId={resendingWorkerId}
          handleInviteSearch={handleInviteSearch}
          inviteSearchTerm={inviteSearchTerm}
          setInviteSearchTerm={setInviteSearchTerm}
          inviteSearching={inviteSearching}
          inviteSearchResults={inviteSearchResults}
          selectedToInvite={selectedToInvite}
          setSelectedToInvite={setSelectedToInvite}
          manualWorkerIdsInput={manualWorkerIdsInput}
          setManualWorkerIdsInput={setManualWorkerIdsInput}
          lastInviteResult={lastInviteResult}
          handleCopyInviteUrl={handleCopyInviteUrl}
          copiedInviteUrl={copiedInviteUrl}
          handleSendInvitesSubmit={handleSendInvitesSubmit}
        />
      </div>
    </Layout>
  );
}
