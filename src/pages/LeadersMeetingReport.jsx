import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Layout from "../components/Layout";
import Stat from "../components/ui/Stat";
import Card from "../components/ui/Card";
import Tag from "../components/ui/Tag";
import Button from "../components/ui/Button";
import { getMeetingRegistrations } from "../services/meeting";
import { getUserRole } from "../utils/getUserRole";
import { getUser } from "../utils/getUser";

const MEETING_DATE = "2026-07-18";
const STATUS_OPTIONS = ["all", "confirmed", "not attending"];

const TEAM_STRENGTH = {
  "Programs": 168,
  "Mission": 21,
  "NLP": 15,
  "Membership": 82,
  "Ministry": 55,
  "Maturity": 23,
  "Kidzone": 25,
  "Stir House": 14,
  "Admin & Facility": 2,
  "Communication (DMU)": 7,
  "Finance": 4,
  "District (Pastor Biola)": 236,
  "District (Pastor Isaac)": 143,
  "Men of Harvest": 23,
  "Singles Ministry": 58,
  "Women of Wisdom": 71,
  "Directional Leaders": 11,
  "Pastoral Leaders": 23,
};

const TOTAL_STRENGTH = Object.values(TEAM_STRENGTH).reduce((a, b) => a + b, 0);

const TEAM_STRUCTURE = [
  { directorate: "Attraction", teams: ["Programs", "Mission"], apiTeams: ["Programs", "Mission"], bg: "#f59e0b", light: "rgba(245,158,11,0.10)" },
  { directorate: "NLP", teams: ["NLP"], apiTeams: ["NLP"], bg: "#06b6d4", light: "rgba(6,182,212,0.10)" },
  { directorate: "SPD", teams: ["Membership", "Ministry", "Maturity"], apiTeams: ["Membership", "Ministry", "Maturity"], bg: "#a855f7", light: "rgba(168,85,247,0.10)" },
  { directorate: "Next Gen", teams: ["Kidzone", "Stir House"], apiTeams: ["Next Gen"], bg: "#eab308", light: "rgba(234,179,8,0.10)" },
  { directorate: "General Services", teams: ["Admin & Facility", "Communication (DMU)", "Finance"], apiTeams: ["General Service"], bg: "#64748b", light: "rgba(100,116,139,0.10)" },
  { directorate: "Communities", teams: ["District (Pastor Biola)", "District (Pastor Isaac)", "Men of Harvest", "Singles Ministry", "Women of Wisdom"], apiTeams: ["Districts", "Interactive Groups"], bg: "#ec4899", light: "rgba(236,72,153,0.10)" },
  { directorate: "Senior Leadership", teams: ["Directional Leaders", "Pastoral Leaders"], apiTeams: ["Senior Leadership"], bg: "#84cc16", light: "rgba(132,204,22,0.10)" },
];

const th =
  "px-3 py-2 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide whitespace-nowrap";
const td = "px-3 py-2 text-sm text-ink-800 whitespace-nowrap";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function LeadersMeetingReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("summary"); // summary | list
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [filterDirectorate, setFilterDirectorate] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterSubTeam, setFilterSubTeam] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [summary, setSummary] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [count, setCount] = useState(0);

  const { isSuperAdmin, isChurchAdmin, isTeamAdmin } = getUserRole();
  const authUser = getUser();
  const myTeam = isTeamAdmin && !isSuperAdmin && !isChurchAdmin
    ? (typeof authUser?.team === "string" ? authUser.team : authUser?.team?.name || "")
    : null;

  useEffect(() => {
    if (!isSuperAdmin && !isChurchAdmin && !isTeamAdmin) {
      toast.error("You do not have permission to view this page.");
      navigate("/login", { replace: true });
    }
  }, [navigate, isSuperAdmin, isChurchAdmin, isTeamAdmin]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const apiStatus = status === "not attending" ? "unconfirmed" : status;
      const res = await getMeetingRegistrations(MEETING_DATE, apiStatus);
      setSummary(res.summary || null);
      setRegistrations(res.data || []);
      setCount(res.count || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load meeting data.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If Team Admin, scope all data to their team only
  const scopedRegistrations = myTeam
    ? registrations.filter((r) => r.team === myTeam)
    : registrations;

  const directorates = TEAM_STRUCTURE.map((t) => t.directorate);
  const selectedDirectorateEntry = TEAM_STRUCTURE.find((t) => t.directorate === filterDirectorate);
  const selectedApiTeams = selectedDirectorateEntry?.apiTeams || [];

  const apiTeamOptions = filterDirectorate
    ? [...new Set(scopedRegistrations.filter((r) => selectedApiTeams.includes(r.team)).map((r) => r.team).filter(Boolean))].sort()
    : [...new Set(scopedRegistrations.map((r) => r.team).filter(Boolean))].sort();

  const departments = [...new Set(
    scopedRegistrations
      .filter((r) => !filterDirectorate || selectedApiTeams.includes(r.team))
      .filter((r) => !filterTeam || r.team === filterTeam)
      .map((r) => r.department)
      .filter(Boolean)
  )].sort();

  const filtered = scopedRegistrations.filter((r) => {
    if (filterDirectorate && !selectedApiTeams.includes(r.team)) return false;
    if (filterTeam && r.team !== filterTeam) return false;
    if (filterSubTeam && r.district_sub_team !== filterSubTeam) return false;
    if (filterDept && r.department !== filterDept) return false;
    if (status === "not attending" && !(r.is_confirmed === false && r.confirmed_at)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !r.name?.toLowerCase().includes(q) &&
        !r.department?.toLowerCase().includes(q) &&
        !r.team?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const hasFilter = filterDirectorate || filterTeam || filterDept || search.trim();
  const filteredTotal = filtered.length;
  const filteredConfirmed = filtered.filter((r) => r.is_confirmed).length;
  const filteredNotAttending = filtered.filter((r) => r.is_confirmed === false && r.confirmed_at).length;
  const filteredUnconfirmed = filteredTotal - filteredConfirmed;
  const filteredPct = filteredTotal ? `${Math.round((filteredConfirmed / filteredTotal) * 100)}%` : "-";

  const exportCSV = () => {
    const source = view === "summary" ? registrations : filtered;
    const headers = ["Name", "Directorate", "Team", "Role", "Status", "Confirmed At"];
    const rows = source.map((r) => [
      r.name || "",
      r.team || "",
      r.department || "",
      r.role || "",
      r.is_confirmed ? "Confirmed" : (r.is_confirmed === false && r.confirmed_at) ? "Not Attending" : "No Response",
      r.confirmed_at ? new Date(r.confirmed_at).toLocaleDateString() : "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaders-meeting-report${filterDirectorate ? `-${filterDirectorate}` : ""}${filterTeam ? `-${filterTeam}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = (() => {
    // Build case-insensitive lookup: normalized name → TEAM_STRUCTURE team name
    const teamNameLookup = {};
    TEAM_STRUCTURE.forEach(({ teams: deptTeams }) => {
      deptTeams.forEach((t) => {
        const lower = t.toLowerCase();
        teamNameLookup[lower] = t;
        if (lower.endsWith("s")) {
          teamNameLookup[lower.slice(0, -1)] = t;
        }
      });
    });

    // Count confirmed per TEAM_STRUCTURE team from registrations.
    // API r.team may match a TEAM_STRUCTURE team name (e.g. "Ministry")
    // or a directorate name (e.g. "Senior Leadership"), in which case
    // r.department holds the team name (e.g. "Pastoral Leaders").
    const DISTRICT_SUB_TEAM_MAP = {
      "pastor biola cluster": "District (Pastor Biola)",
      "pastor isaac cluster": "District (Pastor Isaac)",
    };

    const confirmedByTeam = {};
    const notAttendingByTeam = {};
    scopedRegistrations.forEach((r) => {
      const rTeam = (r.team || "").toLowerCase().trim();
      const rDept = (r.department || "").toLowerCase().trim();
      const rSubTeam = (r.district_sub_team || "").toLowerCase().trim();

      let matched;
      if (rTeam === "districts" && rSubTeam) {
        matched = DISTRICT_SUB_TEAM_MAP[rSubTeam];
      }
      if (!matched) {
        matched = teamNameLookup[rTeam] || teamNameLookup[rDept];
      }
      if (!matched) return;

      if (r.is_confirmed) {
        confirmedByTeam[matched] = (confirmedByTeam[matched] || 0) + 1;
      } else if (r.is_confirmed === false && r.confirmed_at) {
        notAttendingByTeam[matched] = (notAttendingByTeam[matched] || 0) + 1;
      }
    });

    return TEAM_STRUCTURE
      .map(({ directorate, teams: deptTeams, apiTeams, bg, light }) => {
        const rows = deptTeams.map((t) => {
          const confirmed = confirmedByTeam[t] || 0;
          const notAttending = notAttendingByTeam[t] || 0;
          const strength = TEAM_STRENGTH[t] ?? 0;
          return { team: t, total: strength, confirmed, notAttending, absent: strength - confirmed, pct: strength ? ((confirmed / strength) * 100).toFixed(2) : "0.00" };
        });
        const dirTotal = rows.reduce((a, r) => a + r.total, 0);
        const dirConfirmed = rows.reduce((a, r) => a + r.confirmed, 0);
        const dirNotAttending = rows.reduce((a, r) => a + r.notAttending, 0);
        return { directorate, bg, light, rows, apiTeams, total: dirTotal, confirmed: dirConfirmed, notAttending: dirNotAttending, absent: dirTotal - dirConfirmed, pct: dirTotal ? ((dirConfirmed / dirTotal) * 100).toFixed(2) : "0.00" };
      })
      .filter((g) => !myTeam || g.apiTeams.includes(myTeam));
  })();

  // Department-level breakdown for Team Admin view
  const groupedByDept = myTeam ? (() => {
    const map = {};
    scopedRegistrations.forEach((r) => {
      const dept = r.department || "Unknown";
      if (!map[dept]) map[dept] = { department: dept, total: 0, confirmed: 0, notAttending: 0 };
      map[dept].total += 1;
      if (r.is_confirmed) map[dept].confirmed += 1;
      else if (r.is_confirmed === false && r.confirmed_at) map[dept].notAttending += 1;
    });
    return Object.values(map).sort((a, b) => a.department.localeCompare(b.department));
  })() : null;

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="qc-eyebrow">Leaders Meeting Attendance Confirmation Report</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
              Saturday, 18th July 2026
            </h1>
          </div>
          <Button variant="secondary" onClick={fetchData} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          <Stat
            eyebrow="Total Leaders"
            value={hasFilter ? filteredTotal : TOTAL_STRENGTH}
            loading={loading}
          />
          <Stat
            eyebrow="Confirmed"
            value={hasFilter ? filteredConfirmed : (summary?.total_confirmed ?? "-")}
            loading={loading}
          />
          <Stat
            eyebrow="% of Confirmed"
            value={
              hasFilter
                ? filteredPct
                : summary
                  ? `${Math.round(((summary.total_confirmed ?? 0) / TOTAL_STRENGTH) * 100)}%`
                  : "-"
            }
            loading={loading}
          />
          <Stat
            eyebrow="Not Attending"
            value={hasFilter ? filteredNotAttending : (summary?.total_declined ?? "-")}
            loading={loading}
          />
          <Stat
            eyebrow="Unconfirmed"
            value={
              hasFilter
                ? filteredUnconfirmed
                : summary
                  ? TOTAL_STRENGTH - (summary.total_confirmed ?? 0)
                  : "-"
            }
            loading={loading}
            footnote={
              hasFilter
                ? filteredTotal ? `${Math.round((filteredUnconfirmed / filteredTotal) * 100)}%` : undefined
                : summary
                  ? `${Math.round(((TOTAL_STRENGTH - (summary.total_confirmed ?? 0)) / TOTAL_STRENGTH) * 100)}%`
                  : undefined
            }
          />
        </div>

        {/* View toggle + Export */}
        <div className="flex items-center justify-end gap-2 mb-6">
          <button
            type="button"
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-forest text-white hover:bg-forest/90 transition mr-auto"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              view === "list"
                ? "bg-ink-900 text-white"
                : "bg-ink-200 text-ink-700 hover:bg-ink-300"
            }`}
          >
            List View
          </button>
          <button
            type="button"
            onClick={() => setView("summary")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              view === "summary"
                ? "bg-ink-900 text-white"
                : "bg-ink-200 text-ink-700 hover:bg-ink-300"
            }`}
          >
            Summary View
          </button>
        </div>

        {view === "summary" ? (
          /* ── Summary View ── */
          <Card padding="none" className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-100">
              <thead className="bg-cream-200">
                <tr>
                  {myTeam ? (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-700 uppercase tracking-wide">Department</th>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-700 uppercase tracking-wide">Directorate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-700 uppercase tracking-wide">Team</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-700 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-700 uppercase tracking-wide">Confirmed</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-700 uppercase tracking-wide">% Confirmed</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-700 uppercase tracking-wide">Not Attending</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-700 uppercase tracking-wide">Unconfirmed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-400">
                      Loading...
                    </td>
                  </tr>
                ) : myTeam ? (
                  /* Team Admin: rows by department */
                  <>
                    {(groupedByDept ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-400">No data available.</td>
                      </tr>
                    ) : (groupedByDept ?? []).map((d) => {
                      const absent = d.total - d.confirmed - d.notAttending;
                      const pct = d.total ? ((d.confirmed / d.total) * 100).toFixed(2) : "0.00";
                      return (
                        <tr key={d.department} className="hover:bg-cream-100">
                          <td className="px-4 py-2 text-sm text-ink-800 font-medium">{d.department}</td>
                          <td className="px-4 py-2 text-sm text-ink-800 text-center font-mono">{d.total}</td>
                          <td className="px-4 py-2 text-sm text-forest text-center font-mono font-medium">{d.confirmed}</td>
                          <td className="px-4 py-2 text-sm text-ink-800 text-center font-mono">{pct}%</td>
                          <td className="px-4 py-2 text-sm text-sienna text-center font-mono font-medium">{d.notAttending}</td>
                          <td className="px-4 py-2 text-sm text-brick text-center font-mono font-medium">{absent}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-cream-200 border-t-2 border-ink-200">
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 uppercase">Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">{(groupedByDept ?? []).reduce((a, d) => a + d.total, 0)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">{(groupedByDept ?? []).reduce((a, d) => a + d.confirmed, 0)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {(() => { const t = (groupedByDept ?? []).reduce((a, d) => a + d.total, 0); const c = (groupedByDept ?? []).reduce((a, d) => a + d.confirmed, 0); return t ? ((c / t) * 100).toFixed(2) : "0.00"; })()}%
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">{(groupedByDept ?? []).reduce((a, d) => a + d.notAttending, 0)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">{(groupedByDept ?? []).reduce((a, d) => a + d.total - d.confirmed - d.notAttending, 0)}</td>
                    </tr>
                  </>
                ) : grouped.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-400">
                      No data available.
                    </td>
                  </tr>
                ) : (
                  <>
                    {grouped.map((g) => (
                      <React.Fragment key={g.directorate}>
                        {g.rows.map((r, i) => (
                          <tr key={`${g.directorate}-${r.team}`} style={{ backgroundColor: g.light }}>
                            {i === 0 && (
                              <td
                                rowSpan={g.rows.length}
                                className="px-4 py-2 text-sm font-semibold text-ink-900 uppercase align-top border-r border-white/50"
                                style={{ backgroundColor: `${g.bg}33` }}
                              >
                                {g.directorate}
                              </td>
                            )}
                            <td className="px-4 py-2 text-sm text-ink-800 font-medium">{r.team}</td>
                            <td className="px-4 py-2 text-sm text-ink-800 text-center font-mono">{r.total}</td>
                            <td className="px-4 py-2 text-sm text-forest text-center font-mono font-medium">{r.confirmed}</td>
                            <td className="px-4 py-2 text-sm text-ink-800 text-center font-mono">{r.pct}%</td>
                            <td className="px-4 py-2 text-sm text-sienna text-center font-mono font-medium">{r.notAttending}</td>
                            <td className="px-4 py-2 text-sm text-brick text-center font-mono font-medium">{r.absent}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {/* Grand total */}
                    <tr className="bg-cream-200 border-t-2 border-ink-200">
                      <td colSpan={2} className="px-4 py-3 text-sm font-bold text-ink-900 uppercase">Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {grouped.reduce((a, g) => a + g.total, 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {grouped.reduce((a, g) => a + g.confirmed, 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {(() => {
                          const t = grouped.reduce((a, g) => a + g.total, 0);
                          const c = grouped.reduce((a, g) => a + g.confirmed, 0);
                          return t ? ((c / t) * 100).toFixed(2) : "0.00";
                        })()}%
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {grouped.reduce((a, g) => a + g.notAttending, 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {grouped.reduce((a, g) => a + g.absent, 0)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </Card>
        ) : (
          /* ── List View ── */
          <>
            {/* Filters */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      status === s
                        ? "bg-ink-900 text-white"
                        : "bg-ink-200 text-ink-700 hover:bg-ink-300"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {!myTeam && (
                  <select
                    value={filterDirectorate}
                    onChange={(e) => { setFilterDirectorate(e.target.value); setFilterTeam(""); setFilterSubTeam(""); setFilterDept(""); }}
                    className="w-full sm:w-44 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                  >
                    <option value="">All Directorates</option>
                    {directorates.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
                {!myTeam && (
                  <select
                    value={filterTeam}
                    onChange={(e) => { setFilterTeam(e.target.value); setFilterSubTeam(""); setFilterDept(""); }}
                    disabled={!filterDirectorate}
                    className="w-full sm:w-44 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Teams</option>
                    {apiTeamOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                {(filterTeam === "Districts" || myTeam === "Districts" || myTeam === "Districts") && (
                  <select
                    value={filterSubTeam}
                    onChange={(e) => { setFilterSubTeam(e.target.value); setFilterDept(""); }}
                    className="w-full sm:w-52 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                  >
                    <option value="">All Clusters</option>
                    <option value="Pastor Biola Cluster">Pastor Biola Cluster</option>
                    <option value="Pastor Isaac Cluster">Pastor Isaac Cluster</option>
                  </select>
                )}
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  disabled={!filterTeam}
                  className="w-full sm:w-44 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Search name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-48 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                />
                <span className="text-xs text-ink-500 sm:ml-auto">
                  {filtered.length} of {count} registration{count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <Card padding="none" className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-100">
                <thead className="bg-cream-100">
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>Name</th>
                    <th className={th}>Directorate</th>
                    <th className={th}>Team</th>
                    <th className={th}>Role</th>
                    {filterTeam === "Districts" || myTeam === "Districts" && <th className={th}>Cluster</th>}
                    <th className={th}>Status</th>
                    {status === "not attending" && <th className={th}>Reason</th>}
                    <th className={th}>Confirmed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {loading ? (
                    <tr>
                      <td colSpan={7 + (status === "not attending" ? 1 : 0) + (filterTeam === "Districts" || myTeam === "Districts" ? 1 : 0)} className="px-3 py-8 text-center text-sm text-ink-400">
                        Loading registrations...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7 + (status === "not attending" ? 1 : 0) + (filterTeam === "Districts" || myTeam === "Districts" ? 1 : 0)} className="px-3 py-8 text-center text-sm text-ink-400">
                        No registrations found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr key={r.id} className="hover:bg-cream-100">
                        <td className={td}>{i + 1}</td>
                        <td className={`${td} font-medium`}>{r.name}</td>
                        <td className={td}>{r.team || "-"}</td>
                        <td className={td}>{r.department || "-"}</td>
                        <td className={td}>{r.role || "-"}</td>
                        {filterTeam === "Districts" || myTeam === "Districts" && (
                          <td className={td}>{r.district_sub_team || <span className="text-ink-400 italic">Unassigned</span>}</td>
                        )}
                        <td className={td}>
                          {r.is_confirmed ? (
                            <Tag tone="success">Confirmed</Tag>
                          ) : (r.is_confirmed === false && r.confirmed_at) ? (
                            <Tag tone="error">Not Attending</Tag>
                          ) : (
                            <Tag tone="warning">No Response</Tag>
                          )}
                        </td>
                        {status === "not attending" && (
                          <td className={`${td} max-w-xs whitespace-normal text-ink-600 italic`}>{r.notes || r.decline_reason || "-"}</td>
                        )}
                        <td className={td}>{formatDate(r.confirmed_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </Layout>
    </div>
  );
}
