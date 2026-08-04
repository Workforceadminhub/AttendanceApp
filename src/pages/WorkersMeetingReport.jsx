import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Header from "../components/Header";
import Layout from "../components/Layout";
import Stat from "../components/ui/Stat";
import Card from "../components/ui/Card";
import Tag from "../components/ui/Tag";
import Button from "../components/ui/Button";
import { getMeetingRegistrations } from "../services/meeting";
import { getUserRole } from "../utils/getUserRole";
import { getUser } from "../utils/getUser";
import {
  DEFAULT_WORKERS_MEETING_DATE,
  getMeetingDate,
  getAllMeetings,
  formatMeetingDisplayDate,
} from "../utils/meetingConfig";

const MEETING_TYPE = "workers";
const STATUS_OPTIONS = ["all", "confirmed", "not attending"];

const TEAM_STRENGTH = {
  "Programs": 168,
  "Mission": 25,
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

const TEAM_STRUCTURE = [
  { directorate: "Attraction", teams: ["Programs"], apiTeams: ["Programs"], bg: "#f59e0b", light: "rgba(245,158,11,0.10)" },
  { directorate: "Attraction", teams: ["Mission"], apiTeams: ["Mission"], bg: "#f59e0b", light: "rgba(245,158,11,0.10)" },
  { directorate: "NLP", teams: ["NLP"], apiTeams: ["NLP"], bg: "#06b6d4", light: "rgba(6,182,212,0.10)" },
  { directorate: "SPD", teams: ["Membership"], apiTeams: ["Membership"], bg: "#a855f7", light: "rgba(168,85,247,0.10)" },
  { directorate: "SPD", teams: ["Ministry"], apiTeams: ["Ministry"], bg: "#a855f7", light: "rgba(168,85,247,0.10)" },
  { directorate: "SPD", teams: ["Maturity"], apiTeams: ["Maturity"], bg: "#a855f7", light: "rgba(168,85,247,0.10)" },
  { directorate: "Next Gen", teams: ["Kidzone", "Stir House"], apiTeams: ["Next Gen"], bg: "#eab308", light: "rgba(234,179,8,0.10)" },
  { directorate: "General Services", teams: ["Admin & Facility", "Communication (DMU)", "Finance"], apiTeams: ["General Service"], bg: "#64748b", light: "rgba(100,116,139,0.10)" },
  { directorate: "Communities", teams: ["District (Pastor Biola)", "District (Pastor Isaac)"], apiTeams: ["Districts"], bg: "#ec4899", light: "rgba(236,72,153,0.10)" },
  { directorate: "Interactive Groups", teams: ["Men of Harvest", "Singles Ministry", "Women of Wisdom"], apiTeams: ["Interactive Groups"], bg: "#f43f5e", light: "rgba(244,63,94,0.10)" },
  { directorate: "Senior Leadership", teams: ["Directional Leaders", "Pastoral Leaders"], apiTeams: ["Senior Leadership"], bg: "#84cc16", light: "rgba(132,204,22,0.10)" },
];

const th =
  "px-3 py-2 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide whitespace-nowrap";
const td = "px-3 py-2 text-sm text-ink-800 whitespace-nowrap";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return iso;
  }
}

export default function WorkersMeetingReport() {
  const navigate = useNavigate();
  const [meetingDate, setMeetingDate] = useState(() => getMeetingDate(DEFAULT_WORKERS_MEETING_DATE));
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("summary"); // summary | list
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterSubTeam, setFilterSubTeam] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [registrations, setRegistrations] = useState([]);

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

  const handleSummaryClick = useCallback((directorate, teamName) => {
    const entry = TEAM_STRUCTURE.find((item) => item.teams.includes(teamName));
    if (entry) {
      const apiTeam = entry.apiTeams[0];
      setFilterTeam(apiTeam);
      
      if (apiTeam === "Districts") {
        if (teamName.includes("Biola")) {
          setFilterSubTeam("Pastor Biola Cluster");
        } else if (teamName.includes("Isaac")) {
          setFilterSubTeam("Pastor Isaac Cluster");
        } else {
          setFilterSubTeam("");
        }
      } else {
        setFilterSubTeam("");
      }
    } else {
      setFilterTeam("");
      setFilterSubTeam("");
    }
    setFilterDept("");
    setView("list");
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMeetingRegistrations(meetingDate, "all", MEETING_TYPE);
      const cleaned = (res.data || [])
        .filter((r) => r.is_confirmed === true || r.is_confirmed === false)
        .map((r) => ({
          ...r,
          name: r.name ? r.name.replace(/\s+null$/i, "").trim() : "",
        }));
      setRegistrations(cleaned);
    } catch (err) {
      toast.error(err.message || "Failed to load meeting data.");
    } finally {
      setLoading(false);
    }
  }, [meetingDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scopedRegistrations = myTeam
    ? registrations.filter((r) => r.team === myTeam)
    : registrations;

  const teamNameLookup = React.useMemo(() => {
    const lookup = {};
    TEAM_STRUCTURE.forEach(({ teams: deptTeams }) => {
      deptTeams.forEach((t) => {
        const lower = t.toLowerCase();
        lookup[lower] = t;
        if (lower.endsWith("s")) {
          lookup[lower.slice(0, -1)] = t;
        }
      });
    });
    lookup["admin and facility"] = "Admin & Facility";
    lookup["communications (dmu)"] = "Communication (DMU)";
    const nextGenDeptMap = { "kidszone": "Kidzone", "stirhouse": "Stir House", "stir house": "Stir House" };
    Object.entries(nextGenDeptMap).forEach(([k, v]) => { lookup[k] = v; });
    return lookup;
  }, []);

  const resolveTeamName = React.useCallback((worker) => {
    const rawTeam = (worker.team || "").trim().toLowerCase();
    const rawDept = (worker.department || "").trim().toLowerCase();
    const rawCluster = (worker.district_sub_team || "").trim().toLowerCase();

    if (rawTeam === "districts") {
      if (rawCluster.includes("biola")) return "District (Pastor Biola)";
      if (rawCluster.includes("isaac")) return "District (Pastor Isaac)";
      if (rawDept.includes("biola")) return "District (Pastor Biola)";
      if (rawDept.includes("isaac")) return "District (Pastor Isaac)";
      return "District (Pastor Biola)";
    }
    if (rawDept && teamNameLookup[rawDept]) return teamNameLookup[rawDept];
    if (rawTeam && teamNameLookup[rawTeam]) return teamNameLookup[rawTeam];

    return worker.team || worker.department || "Unknown";
  }, [teamNameLookup]);

  const teamSummary = React.useMemo(() => {
    const counts = {};
    TEAM_STRUCTURE.forEach(({ teams: deptTeams }) => {
      deptTeams.forEach((t) => {
        counts[t] = { confirmed: 0, notAttending: 0 };
      });
    });

    scopedRegistrations.forEach((r) => {
      const resolved = resolveTeamName(r);
      if (!counts[resolved]) {
        counts[resolved] = { confirmed: 0, notAttending: 0 };
      }
      if (r.is_confirmed === true) {
        counts[resolved].confirmed += 1;
      } else if (r.is_confirmed === false) {
        counts[resolved].notAttending += 1;
      }
    });

    return counts;
  }, [scopedRegistrations, resolveTeamName]);

  const totalConfirmedCount = scopedRegistrations.filter((r) => r.is_confirmed === true).length;
  const totalNotAttendingCount = scopedRegistrations.filter((r) => r.is_confirmed === false).length;
  const grandTotalStrength = Object.values(TEAM_STRENGTH).reduce((a, b) => a + b, 0);

  const uniqueTeams = Array.from(
    new Set(scopedRegistrations.map((r) => r.team).filter(Boolean))
  ).sort();

  const uniqueSubTeams = Array.from(
    new Set(
      scopedRegistrations
        .filter((r) => (!filterTeam || r.team === filterTeam) && r.district_sub_team)
        .map((r) => r.district_sub_team)
    )
  ).sort();

  const uniqueDepts = Array.from(
    new Set(
      scopedRegistrations
        .filter((r) => (!filterTeam || r.team === filterTeam) && r.department)
        .map((r) => r.department)
    )
  ).sort();

  const filtered = scopedRegistrations.filter((r) => {
    if (status === "confirmed" && r.is_confirmed !== true) return false;
    if (status === "not attending" && r.is_confirmed !== false) return false;
    if (filterTeam && r.team !== filterTeam) return false;
    if (filterSubTeam && r.district_sub_team !== filterSubTeam) return false;
    if (filterDept && r.department !== filterDept) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const name = (r.name || "").toLowerCase();
      const phone = (r.phone || "").toLowerCase();
      const dept = (r.department || "").toLowerCase();
      const team = (r.team || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || dept.includes(q) || team.includes(q);
    }
    return true;
  });

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Workers Meeting Confirmation");

    worksheet.columns = [
      { header: "S/N", key: "sn", width: 6 },
      { header: "Full Name", key: "name", width: 25 },
      { header: "Phone Number", key: "phone", width: 15 },
      { header: "Role", key: "role", width: 15 },
      { header: "Team", key: "team", width: 20 },
      { header: "District / Sub-team", key: "sub_team", width: 22 },
      { header: "Department", key: "department", width: 22 },
      { header: "Confirmation Status", key: "status", width: 18 },
      { header: "Reason for Not Attending", key: "reason", width: 30 },
      { header: "Confirmed At", key: "confirmed_at", width: 22 },
    ];

    filtered.forEach((r, idx) => {
      const isConf = r.is_confirmed === true;
      const isNot = r.is_confirmed === false;
      worksheet.addRow({
        sn: idx + 1,
        name: r.name || "-",
        phone: r.phone || "-",
        role: r.role || "-",
        team: r.team || "-",
        sub_team: r.district_sub_team || "-",
        department: r.department || "-",
        status: isConf ? "Confirmed" : isNot ? "Not Attending" : "No Response",
        reason: r.notes || r.decline_reason || "-",
        confirmed_at: formatDate(r.confirmed_at),
      });
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
      cell.alignment = { vertical: "middle" };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `workers_meeting_confirmation_${meetingDate}.xlsx`);
  };

  const colSpanCount =
    (status === "all" ? 1 : 0) +
    (status === "all" || status === "not attending" ? 1 : 0) +
    (!filterTeam && !myTeam ? 1 : 0) +
    (!filterDept ? 1 : 0) +
    (filterTeam === "Districts" || myTeam === "Districts" ? 1 : 0) +
    3;

  return (
    <div className="min-h-screen bg-cream">
      <Header title="Workers Meeting Confirmation Report" />
      <Layout>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">
              Workers Meeting Confirmation Report
            </h1>
            <p className="text-xs text-ink-500 font-mono mt-0.5">
              {formatMeetingDisplayDate(meetingDate)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white border border-ink-200 rounded-lg px-3 py-1 shadow-sm">
              <span className="text-xs font-medium text-ink-500">Select Meeting:</span>
              <select
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-ink-900 focus:outline-none cursor-pointer"
              >
                {getAllMeetings("workers").map((m) => (
                  <option key={m.id} value={m.date}>
                    {m.title} ({m.date}){m.isActive ? " ★ Active" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex rounded-lg border border-ink-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setView("summary")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  view === "summary"
                    ? "bg-ink text-cream"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                Summary View
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  view === "list"
                    ? "bg-ink text-cream"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                List View
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportExcel}
              disabled={loading || filtered.length === 0}
            >
              Export Excel ({filtered.length})
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Total Confirmed"
            value={loading ? "..." : totalConfirmedCount}
          />
          <Stat
            label="Not Attending"
            value={loading ? "..." : totalNotAttendingCount}
          />
          <Stat
            label="Total Responses"
            value={loading ? "..." : scopedRegistrations.length}
          />
          <Stat
            label="Total Strength"
            value={grandTotalStrength}
          />
        </div>

        {view === "summary" ? (
          <Card className="p-4 sm:p-6 overflow-x-auto">
            <h2 className="text-base font-semibold text-ink-900 mb-4">
              Directorate Breakdown
            </h2>
            <table className="min-w-full divide-y divide-ink-200">
              <thead>
                <tr className="bg-ink-100">
                  <th className={th}>Directorate</th>
                  <th className={th}>Team / Group</th>
                  <th className={th}>Total Strength</th>
                  <th className={th}>Confirmed</th>
                  <th className={th}>Not Attending</th>
                  <th className={th}>Response Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {TEAM_STRUCTURE.map((row, idx) => {
                  const teamName = row.teams[0];
                  const strength = TEAM_STRENGTH[teamName] || 0;
                  const data = teamSummary[teamName] || { confirmed: 0, notAttending: 0 };
                  const totalResp = data.confirmed + data.notAttending;
                  const pct = strength > 0 ? Math.round((data.confirmed / strength) * 100) : 0;

                  return (
                    <tr
                      key={`${row.directorate}-${teamName}-${idx}`}
                      onClick={() => handleSummaryClick(row.directorate, teamName)}
                      className="hover:bg-cream-100 cursor-pointer transition"
                    >
                      <td className={`${td} font-medium`}>{row.directorate}</td>
                      <td className={td}>{teamName}</td>
                      <td className={td}>{strength}</td>
                      <td className={`${td} text-forest font-semibold`}>{data.confirmed}</td>
                      <td className={`${td} text-sienna font-semibold`}>{data.notAttending}</td>
                      <td className={td}>{pct}% ({totalResp}/{strength})</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <Card className="mb-6 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="block text-2xs font-medium text-ink-500 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search name, phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-md border border-ink-200 px-3 py-1.5 text-xs text-ink placeholder-ink-400 focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-medium text-ink-500 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-md border border-ink-200 px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink capitalize"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {!myTeam && (
                  <div>
                    <label className="block text-2xs font-medium text-ink-500 mb-1">Team</label>
                    <select
                      value={filterTeam}
                      onChange={(e) => {
                        setFilterTeam(e.target.value);
                        setFilterSubTeam("");
                        setFilterDept("");
                      }}
                      className="w-full rounded-md border border-ink-200 px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    >
                      <option value="">All Teams</option>
                      {uniqueTeams.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {uniqueSubTeams.length > 0 && (
                  <div>
                    <label className="block text-2xs font-medium text-ink-500 mb-1">Sub-team</label>
                    <select
                      value={filterSubTeam}
                      onChange={(e) => setFilterSubTeam(e.target.value)}
                      className="w-full rounded-md border border-ink-200 px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    >
                      <option value="">All Sub-teams</option>
                      {uniqueSubTeams.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                )}

                {uniqueDepts.length > 0 && (
                  <div>
                    <label className="block text-2xs font-medium text-ink-500 mb-1">Department</label>
                    <select
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                      className="w-full rounded-md border border-ink-200 px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    >
                      <option value="">All Departments</option>
                      {uniqueDepts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </Card>

            {/* List Table */}
            <Card className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-200">
                <thead>
                  <tr className="bg-ink-100">
                    <th className={th}>S/N</th>
                    <th className={th}>Name</th>
                    {!filterTeam && !myTeam && <th className={th}>Team</th>}
                    {!filterDept && <th className={th}>Department</th>}
                    {(filterTeam === "Districts" || myTeam === "Districts") && (
                      <th className={th}>District / Sub-team</th>
                    )}
                    {status === "all" && <th className={th}>Status</th>}
                    {(status === "all" || status === "not attending") && (
                      <th className={th}>Reason</th>
                    )}
                    <th className={th}>Confirmed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {loading ? (
                    <tr>
                      <td colSpan={colSpanCount} className="px-3 py-8 text-center text-sm text-ink-500">
                        Loading registrations...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={colSpanCount} className="px-3 py-8 text-center text-sm text-ink-400">
                        No registrations found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr key={r.id} className="hover:bg-cream-100">
                        <td className={td}>{i + 1}</td>
                        <td className={`${td} font-medium`}>{r.name}</td>
                        {!filterTeam && !myTeam && <td className={td}>{r.team || "-"}</td>}
                        {!filterDept && <td className={td}>{r.department || "-"}</td>}
                        {(filterTeam === "Districts" || myTeam === "Districts") && (
                          <td className={td}>{r.district_sub_team || <span className="text-ink-400 italic">Unassigned</span>}</td>
                        )}
                        {status === "all" && (
                          <td className={td}>
                            {r.is_confirmed === true ? (
                              <Tag tone="success">Confirmed</Tag>
                            ) : r.is_confirmed === false ? (
                              <Tag tone="error">Not Attending</Tag>
                            ) : (
                              <Tag tone="warning">No Response</Tag>
                            )}
                          </td>
                        )}
                        {(status === "all" || status === "not attending") && (
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
