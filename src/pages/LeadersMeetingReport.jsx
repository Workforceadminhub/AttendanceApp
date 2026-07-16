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
import { teamsAndDepartments } from "../utils/teams";

const MEETING_DATE = "2026-07-18";
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

  const handleSummaryClick = useCallback((directorate, teamName) => {
    setFilterDirectorate(directorate);
    
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
      // Always fetch all registrations to perform status filtering on client side
      const res = await getMeetingRegistrations(MEETING_DATE, "all");
      const cleaned = (res.data || [])
        .filter((r) => r.is_confirmed === true || r.is_confirmed === false)
        .map((r) => ({
          ...r,
          name: r.name ? r.name.replace(/\s+null$/i, "").trim() : "",
        }));
      setRegistrations(cleaned);
      setCount(cleaned.length);
    } catch (err) {
      toast.error(err.message || "Failed to load meeting data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If Team Admin, scope all data to their team only
  const scopedRegistrations = myTeam
    ? registrations.filter((r) => r.team === myTeam)
    : registrations;

  // Helper to build case-insensitive lookup: normalized name → TEAM_STRUCTURE team name
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
    // Extra mappings for DB department names that differ from display names
    lookup["admin and facility"] = "Admin & Facility";
    lookup["communications (dmu)"] = "Communication (DMU)";
    const nextGenDeptMap = { "kidszone": "Kidzone", "stirhouse": "Stir House", "stir house": "Stir House" };
    Object.entries(nextGenDeptMap).forEach(([k, v]) => { lookup[k] = v; });
    return lookup;
  }, []);

  const unassignedConfirmedDistricts = React.useMemo(() => {
    return registrations.filter(r => 
      (r.team || "").toLowerCase().trim() === "districts" && 
      r.is_confirmed === true && 
      (!r.district_sub_team || String(r.district_sub_team).trim() === "")
    );
  }, [registrations]);

  // Compute metrics dynamically from scoped registrations
  const { stats, confirmedByTeam, notAttendingByTeam } = React.useMemo(() => {
    let total = scopedRegistrations.length;
    let confirmed = 0;
    let declined = 0;
    let noResponse = 0;

    const cByTeam = {};
    const nByTeam = {};

    scopedRegistrations.forEach((r) => {
      // Calculate overall counts
      if (r.is_confirmed === true) {
        confirmed++;
      } else if (r.is_confirmed === false) {
        declined++;
      } else {
        noResponse++;
      }

      // Map registrations to TEAM_STRUCTURE team names
      const rTeam = (r.team || "").toLowerCase().trim();
      const rDept = (r.department || "").toLowerCase().trim();
      const rSubTeam = (r.district_sub_team || "").toLowerCase().trim();

      let matched;
      if (rTeam === "districts") {
        if (rSubTeam === "pastor biola cluster") {
          matched = "District (Pastor Biola)";
        } else if (rSubTeam === "pastor isaac cluster") {
          matched = "District (Pastor Isaac)";
        }
      }
      if (!matched) {
        const rDeptSuffix = rDept.includes(" - ") ? rDept.split(" - ").pop().trim() : null;
        matched = teamNameLookup[rTeam] || teamNameLookup[rDept] || (rDeptSuffix && teamNameLookup[rDeptSuffix]);
      }

      if (matched) {
        if (r.is_confirmed === true) {
          cByTeam[matched] = (cByTeam[matched] || 0) + 1;
        } else if (r.is_confirmed === false) {
          nByTeam[matched] = (nByTeam[matched] || 0) + 1;
        }
      }
    });

    return {
      stats: { total, confirmed, declined, noResponse },
      confirmedByTeam: cByTeam,
      notAttendingByTeam: nByTeam
    };
  }, [scopedRegistrations, teamNameLookup]);

  // For Team Admin, compute total strength from only their team's sub-teams,
  // ensuring the capacity of any team matches at least its confirmed attendance.
  const effectiveStrength = (() => {
    const getAdjustedStrength = (t) => {
      const confirmed = confirmedByTeam[t] || 0;
      const notAttending = notAttendingByTeam[t] || 0;
      return Math.max(TEAM_STRENGTH[t] ?? 0, confirmed + notAttending);
    };

    if (!myTeam) {
      return TEAM_STRUCTURE.reduce((sum, entry) => {
        return sum + entry.teams.reduce((subSum, t) => subSum + getAdjustedStrength(t), 0);
      }, 0);
    }
    const entry = TEAM_STRUCTURE.find((t) => t.apiTeams.includes(myTeam));
    if (!entry) {
      return TEAM_STRUCTURE.reduce((sum, entry) => {
        return sum + entry.teams.reduce((subSum, t) => subSum + getAdjustedStrength(t), 0);
      }, 0);
    }
    return entry.teams.reduce((sum, t) => sum + getAdjustedStrength(t), 0);
  })();

  const directorates = [...new Set(TEAM_STRUCTURE.map((t) => t.directorate))];
  const selectedApiTeams = filterDirectorate
    ? TEAM_STRUCTURE
        .filter((t) => t.directorate === filterDirectorate)
        .reduce((acc, t) => [...acc, ...t.apiTeams], [])
    : [];

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
    if (filterSubTeam) {
      if (filterSubTeam === "Unassigned") {
        if (r.district_sub_team) return false;
      } else {
        if (r.district_sub_team !== filterSubTeam) return false;
      }
    }
    if (filterDept && r.department !== filterDept) return false;

    // Status filter
    if (status === "confirmed" && r.is_confirmed !== true) return false;
    if (status === "not attending" && r.is_confirmed !== false) return false;
    if (status === "no response" && (r.is_confirmed === true || r.is_confirmed === false)) return false;

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

  // Compute metrics dynamically from the filtered array
  const filteredStats = React.useMemo(() => {
    let total = filtered.length;
    let confirmed = 0;
    let declined = 0;
    let noResponse = 0;

    filtered.forEach((r) => {
      if (r.is_confirmed === true) {
        confirmed++;
      } else if (r.is_confirmed === false) {
        declined++;
      } else {
        noResponse++;
      }
    });

    const pct = total ? `${Math.round((confirmed / total) * 100)}%` : "-";

    return { total, confirmed, declined, noResponse, pct };
  }, [filtered]);

  const filteredTotal = filteredStats.total;
  const filteredConfirmed = filteredStats.confirmed;
  const filteredNotAttending = filteredStats.declined;
  const filteredUnconfirmed = filteredStats.noResponse + filteredStats.declined;
  const filteredPct = filteredStats.pct;

  const exportSummarySheet = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Attendance Summary");

      // Define columns
      worksheet.columns = [
        { header: "DIRECTORATE", key: "directorate", width: 25 },
        { header: "TEAM", key: "team", width: 25 },
        { header: "TOTAL", key: "total", width: 12 },
        { header: "CONFIRMED", key: "confirmed", width: 15 },
        { header: "% CONFIRMED", key: "pctConfirmed", width: 18 },
        { header: "NOT ATTENDING", key: "notAttending", width: 18 },
        { header: "UNCONFIRMED", key: "unconfirmed", width: 15 },
      ];

      // Format headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FF374151" }, size: 10 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 25;

      headerRow.eachCell((cell) => {
        cell.border = {
          bottom: { style: "medium", color: { argb: "FFD1D5DB" } },
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      });

      const EXCEL_COLORS = {
        "Attraction": { light: "FEF5E7", dark: "FDECCE" },
        "NLP": { light: "E6F8FB", dark: "CDF0F6" },
        "SPD": { light: "F6EEFE", dark: "EEDDFD" },
        "Next Gen": { light: "FDF7E6", dark: "FBF0CE" },
        "General Services": { light: "F0F1F3", dark: "E0E3E8" },
        "Communities": { light: "FDEDF5", dark: "FBDAEB" },
        "Interactive Groups": { light: "FEECEF", dark: "FDD9DF" },
        "Senior Leadership": { light: "F3FAE8", dark: "E6F5D0" },
      };

      let currentRow = 2;

      grouped.forEach((g) => {
        const startRow = currentRow;
        const colors = EXCEL_COLORS[g.directorate];

        g.rows.forEach((r) => {
          const row = worksheet.addRow({
            directorate: g.directorate.toUpperCase(),
            team: r.team,
            total: r.total,
            confirmed: r.confirmed,
            pctConfirmed: parseFloat(r.pct) / 100,
            notAttending: r.notAttending,
            unconfirmed: r.absent,
          });

          // Set cell alignments and formats
          row.getCell("directorate").alignment = { vertical: "middle", horizontal: "left" };
          row.getCell("team").alignment = { vertical: "middle", horizontal: "left" };
          row.getCell("total").alignment = { vertical: "middle", horizontal: "right" };
          row.getCell("confirmed").alignment = { vertical: "middle", horizontal: "right" };
          row.getCell("pctConfirmed").alignment = { vertical: "middle", horizontal: "right" };
          row.getCell("pctConfirmed").numFmt = "0.00%";
          row.getCell("notAttending").alignment = { vertical: "middle", horizontal: "right" };
          row.getCell("unconfirmed").alignment = { vertical: "middle", horizontal: "right" };

          // Styling based on values
          if (r.confirmed > 0) {
            row.getCell("confirmed").font = { color: { argb: "FF059669" }, bold: true };
          }
          if (r.notAttending > 0) {
            row.getCell("notAttending").font = { color: { argb: "FFD97706" }, bold: true };
          }
          if (r.absent > 0) {
            row.getCell("unconfirmed").font = { color: { argb: "FFDC2626" }, bold: true };
          }

          row.eachCell((cell, colNumber) => {
            cell.border = {
              bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
              top: { style: "thin", color: { argb: "FFE5E7EB" } },
              left: { style: "thin", color: { argb: "FFE5E7EB" } },
              right: { style: "thin", color: { argb: "FFE5E7EB" } },
            };
            if (colors) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF" + (colNumber === 1 ? colors.dark : colors.light) },
              };
            }
          });

          currentRow++;
        });

        const endRow = currentRow - 1;
        if (startRow < endRow) {
          worksheet.mergeCells(startRow, 1, endRow, 1);
        }

        const firstCell = worksheet.getCell(startRow, 1);
        firstCell.font = { bold: true, color: { argb: "FF1F2937" } };
        firstCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });

      // Add Grand Total row
      const totalRowData = {
        directorate: "TOTAL",
        team: "",
        total: grouped.reduce((a, g) => a + g.total, 0),
        confirmed: grouped.reduce((a, g) => a + g.confirmed, 0),
        pctConfirmed: (() => {
          const t = grouped.reduce((a, g) => a + g.total, 0);
          const c = grouped.reduce((a, g) => a + g.confirmed, 0);
          return t ? c / t : 0;
        })(),
        notAttending: grouped.reduce((a, g) => a + g.notAttending, 0),
        unconfirmed: grouped.reduce((a, g) => a + g.absent, 0),
      };

      const totalRow = worksheet.addRow(totalRowData);
      totalRow.height = 24;
      totalRow.eachCell((cell) => {
        cell.font = { bold: true, size: 10 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5E7EB" },
        };
        cell.border = {
          top: { style: "medium", color: { argb: "FF9CA3AF" } },
          bottom: { style: "double", color: { argb: "FF9CA3AF" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      });

      totalRow.getCell("directorate").alignment = { vertical: "middle", horizontal: "left" };
      totalRow.getCell("total").alignment = { vertical: "middle", horizontal: "right" };
      totalRow.getCell("confirmed").alignment = { vertical: "middle", horizontal: "right" };
      totalRow.getCell("pctConfirmed").alignment = { vertical: "middle", horizontal: "right" };
      totalRow.getCell("pctConfirmed").numFmt = "0.00%";
      totalRow.getCell("notAttending").alignment = { vertical: "middle", horizontal: "right" };
      totalRow.getCell("unconfirmed").alignment = { vertical: "middle", horizontal: "right" };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `leaders_meeting_summary_${MEETING_DATE}.xlsx`);
    } catch (err) {
      toast.error("Failed to export summary sheet: " + err.message);
    }
  };

  const exportListExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      const teamGroups = {};
      TEAM_STRUCTURE.forEach((t) => {
        t.teams.forEach((teamName) => {
          teamGroups[teamName] = [];
        });
      });
      teamGroups["Unassigned"] = [];

      filtered.forEach((r) => {
        const rTeam = (r.team || "").toLowerCase().trim();
        const rDept = (r.department || "").toLowerCase().trim();
        const rSubTeam = (r.district_sub_team || "").toLowerCase().trim();

        let matched;
        if (rTeam === "districts") {
          if (rSubTeam === "pastor biola cluster") {
            matched = "District (Pastor Biola)";
          } else if (rSubTeam === "pastor isaac cluster") {
            matched = "District (Pastor Isaac)";
          }
        }
        if (!matched) {
          const rDeptSuffix = rDept.includes(" - ") ? rDept.split(" - ").pop().trim() : null;
          matched = teamNameLookup[rTeam] || teamNameLookup[rDept] || (rDeptSuffix && teamNameLookup[rDeptSuffix]) || "Unassigned";
        }
        
        if (teamGroups[matched]) {
          teamGroups[matched].push(r);
        } else {
          teamGroups[matched] = [r];
        }
      });

      const allActiveTeamNames = [
        ...TEAM_STRUCTURE.reduce((acc, t) => [...acc, ...t.teams], []),
        "Unassigned"
      ];

      for (const teamName of allActiveTeamNames) {
        const leaders = teamGroups[teamName] || [];
        
        let sheetName = teamName.replace(/[:?*/\\[\]]/g, "").substring(0, 31);
        if (!sheetName) sheetName = "Sheet";

        const worksheet = workbook.addWorksheet(sheetName);

        worksheet.columns = [
          { header: "#", key: "index", width: 6 },
          { header: "Name", key: "name", width: 30 },
          { header: "Directorate", key: "directorate", width: 20 },
          { header: "Team", key: "team", width: 25 },
          { header: "Department", key: "department", width: 30 },
          { header: "Role", key: "role", width: 20 },
          { header: "Status", key: "status", width: 15 },
          { header: "Confirmed At", key: "confirmedAt", width: 22 },
          { header: "Notes", key: "notes", width: 40 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.height = 26;
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1F2937" },
          };
          cell.alignment = { vertical: "middle", horizontal: "left" };
        });
        headerRow.getCell("index").alignment = { vertical: "middle", horizontal: "center" };

        const sortedLeaders = [...leaders].sort((a, b) => {
          const deptA = (a.department || "").toLowerCase();
          const deptB = (b.department || "").toLowerCase();
          if (deptA !== deptB) {
            return deptA.localeCompare(deptB);
          }
          const confA = a.is_confirmed ? 1 : 0;
          const confB = b.is_confirmed ? 1 : 0;
          return confB - confA;
        });

        sortedLeaders.forEach((leader, idx) => {
          const matchedDir = TEAM_STRUCTURE.find(t => 
            t.teams.includes(teamName) || t.apiTeams.includes(leader.team)
          );
          const directorateName = matchedDir ? matchedDir.directorate : "Others";

          const row = worksheet.addRow({
            index: idx + 1,
            name: leader.name || "",
            directorate: directorateName,
            team: teamName,
            department: leader.department || "",
            role: leader.role || "",
            status: leader.is_confirmed === true ? "Confirmed" : leader.is_confirmed === false ? "Not Attending" : "No Response",
            confirmedAt: leader.confirmed_at ? formatDate(leader.confirmed_at) : "",
            notes: leader.notes || leader.decline_reason || "",
          });

          row.height = 20;
          
          row.eachCell((cell, colNumber) => {
            cell.alignment = { vertical: "middle", horizontal: "left" };
            cell.border = {
              bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
              top: { style: "thin", color: { argb: "FFE5E7EB" } },
              left: { style: "thin", color: { argb: "FFE5E7EB" } },
              right: { style: "thin", color: { argb: "FFE5E7EB" } },
            };
            cell.font = { size: 10, color: { argb: "FF374151" } };
          });

          row.getCell("index").alignment = { vertical: "middle", horizontal: "center" };

          const statusCell = row.getCell("status");
          if (leader.is_confirmed === true) {
            statusCell.font = { bold: true, color: { argb: "FF059669" }, size: 10 };
          } else if (leader.is_confirmed === false) {
            statusCell.font = { bold: true, color: { argb: "FFD97706" }, size: 10 };
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `leaders_meeting_list_${MEETING_DATE}.xlsx`);
    } catch (err) {
      toast.error("Failed to export Excel list: " + err.message);
    }
  };

  const exportData = () => {
    if (view === "summary") {
      exportSummarySheet();
    } else {
      exportListExcel();
    }
  };

  const grouped = React.useMemo(() => {
    // Map then merge duplicate directorate entries (e.g. Attraction has Programs + Mission as separate entries)
    const mapped = TEAM_STRUCTURE.map(({ directorate, teams: deptTeams, apiTeams, bg, light }) => {
      const rows = deptTeams.map((t) => {
        const confirmed = confirmedByTeam[t] || 0;
        const notAttending = notAttendingByTeam[t] || 0;
        const strength = Math.max(TEAM_STRENGTH[t] ?? 0, confirmed + notAttending);
        return { team: t, total: strength, confirmed, notAttending, absent: strength - confirmed - notAttending, pct: strength ? ((confirmed / strength) * 100).toFixed(2) : "0.00" };
      });
      const dirTotal = rows.reduce((a, r) => a + r.total, 0);
      const dirConfirmed = rows.reduce((a, r) => a + r.confirmed, 0);
      const dirNotAttending = rows.reduce((a, r) => a + r.notAttending, 0);
      return { directorate, bg, light, rows, apiTeams, total: dirTotal, confirmed: dirConfirmed, notAttending: dirNotAttending, absent: dirTotal - dirConfirmed, pct: dirTotal ? ((dirConfirmed / dirTotal) * 100).toFixed(2) : "0.00" };
    });

    const merged = [];
    mapped.forEach((g) => {
      const existing = merged.find((m) => m.directorate === g.directorate);
      if (existing) {
        existing.rows = [...existing.rows, ...g.rows];
        existing.apiTeams = [...existing.apiTeams, ...g.apiTeams];
        existing.total += g.total;
        existing.confirmed += g.confirmed;
        existing.notAttending += g.notAttending;
        existing.absent += g.absent;
        existing.pct = existing.total ? ((existing.confirmed / existing.total) * 100).toFixed(2) : "0.00";
      } else {
        merged.push({ ...g });
      }
    });

    return merged.filter((g) => !myTeam || g.apiTeams.includes(myTeam));
  }, [confirmedByTeam, notAttendingByTeam, myTeam]);

  // Department-level breakdown for Team Admin view
  const groupedByDept = myTeam ? (() => {
    const teamEntry = teamsAndDepartments.find((t) => t.team === myTeam);
    const allDepts = teamEntry?.department ?? [];
    const map = {};
    // Seed all known departments with zero counts
    allDepts.forEach((dept) => {
      map[dept] = { department: dept, total: 0, confirmed: 0, notAttending: 0 };
    });
    scopedRegistrations.forEach((r) => {
      const dept = r.department || "Unknown";
      if (!map[dept]) map[dept] = { department: dept, total: 0, confirmed: 0, notAttending: 0 };
      map[dept].total += 1;
      if (r.is_confirmed === true) map[dept].confirmed += 1;
      else if (r.is_confirmed === false) map[dept].notAttending += 1;
    });
    return Object.values(map).sort((a, b) => a.department.localeCompare(b.department));
  })() : null;

  const colSpanCount = 3 + 
    ((!filterTeam && !myTeam) ? 1 : 0) + 
    (!filterDept ? 1 : 0) + 
    ((filterTeam === "Districts" || myTeam === "Districts") ? 1 : 0) + 
    (status === "all" ? 1 : 0) + 
    ((status === "all" || status === "not attending") ? 1 : 0);

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        {unassignedConfirmedDistricts.length > 0 && (
          <div className="mb-6 p-4 rounded-md border shadow-sm" style={{ backgroundColor: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }}>
            <h3 className="font-bold mb-1">Confirmed Districts leaders with no cluster:</h3>
            <ul className="list-disc pl-5">
              {unassignedConfirmedDistricts.map(w => (
                <li key={w.id} className="font-mono">
                  {w.name} (ID: {w.id}, Dept: {w.department})
                </li>
              ))}
            </ul>
          </div>
        )}

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
            value={hasFilter ? filteredTotal : effectiveStrength}
            loading={loading}
          />
          <Stat
            eyebrow="Confirmed"
            value={hasFilter ? filteredConfirmed : stats.confirmed}
            loading={loading}
          />
          <Stat
            eyebrow="% of Confirmed"
            value={
              hasFilter
                ? filteredPct
                : effectiveStrength
                  ? `${Math.round((stats.confirmed / effectiveStrength) * 100)}%`
                  : "-"
            }
            loading={loading}
          />
          <Stat
            eyebrow="Not Attending"
            value={hasFilter ? filteredNotAttending : stats.declined}
            loading={loading}
          />
          <Stat
            eyebrow="Unconfirmed"
            value={
              hasFilter
                ? filteredUnconfirmed
                : effectiveStrength - stats.confirmed
            }
            loading={loading}
            footnote={
              hasFilter
                ? (filteredTotal ? `${Math.round((filteredUnconfirmed / filteredTotal) * 100)}%` : undefined)
                : (effectiveStrength ? `${Math.round(((effectiveStrength - stats.confirmed) / effectiveStrength) * 100)}%` : undefined)
            }
          />
        </div>

        {/* View toggle + Export */}
        <div className="flex items-center justify-end gap-2 mb-6">
          <button
            type="button"
            onClick={exportData}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-forest text-white hover:bg-forest/90 transition mr-auto"
          >
            {view === "summary" ? "Export Summary Sheet" : "Export Excel List"}
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
                  {!myTeam && <th className="px-4 py-3 text-center text-xs font-semibold text-ink-700 uppercase tracking-wide">Total</th>}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-700 uppercase tracking-wide">Confirmed</th>
                  {!myTeam && <th className="px-4 py-3 text-center text-xs font-semibold text-ink-700 uppercase tracking-wide">% Confirmed</th>}
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
                      return (
                        <tr key={d.department} className="hover:bg-cream-100">
                          <td className="px-4 py-2 text-sm text-ink-800 font-medium">{d.department}</td>
                          <td className="px-4 py-2 text-sm text-forest text-center font-mono font-medium">{d.confirmed.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-sienna text-center font-mono font-medium">{d.notAttending.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-brick text-center font-mono font-medium">{absent.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-cream-200 border-t-2 border-ink-200">
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 uppercase">Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">{(groupedByDept ?? []).reduce((a, d) => a + d.confirmed, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">{(groupedByDept ?? []).reduce((a, d) => a + d.notAttending, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">{(groupedByDept ?? []).reduce((a, d) => a + d.total - d.confirmed - d.notAttending, 0).toLocaleString()}</td>
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
                                className="px-4 py-2 text-sm font-semibold text-ink-900 uppercase align-top border-r border-white/50 cursor-pointer hover:underline"
                                style={{ backgroundColor: `${g.bg}33` }}
                                onClick={() => {
                                  setFilterDirectorate(g.directorate);
                                  setFilterTeam("");
                                  setFilterSubTeam("");
                                  setFilterDept("");
                                  setView("list");
                                }}
                                title={`View all ${g.directorate} registrations`}
                              >
                                {g.directorate}
                              </td>
                            )}
                            <td 
                              className="px-4 py-2 text-sm text-ink-800 font-medium cursor-pointer hover:underline"
                              onClick={() => handleSummaryClick(g.directorate, r.team)}
                              title={`View ${r.team} registrations`}
                            >
                              {r.team}
                            </td>
                            <td className="px-4 py-2 text-sm text-ink-800 text-center font-mono">{r.total.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-forest text-center font-mono font-medium">{r.confirmed.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-ink-800 text-center font-mono">{r.pct}%</td>
                            <td className="px-4 py-2 text-sm text-sienna text-center font-mono font-medium">{r.notAttending.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-brick text-center font-mono font-medium">{r.absent.toLocaleString()}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {/* Grand total */}
                    <tr className="bg-cream-200 border-t-2 border-ink-200">
                      <td colSpan={2} className="px-4 py-3 text-sm font-bold text-ink-900 uppercase">Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {grouped.reduce((a, g) => a + g.total, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {grouped.reduce((a, g) => a + g.confirmed, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {(() => {
                          const t = grouped.reduce((a, g) => a + g.total, 0);
                          const c = grouped.reduce((a, g) => a + g.confirmed, 0);
                          return t ? ((c / t) * 100).toFixed(2) : "0.00";
                        })()}%
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {grouped.reduce((a, g) => a + g.notAttending, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono">
                        {grouped.reduce((a, g) => a + g.absent, 0).toLocaleString()}
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
                    {s === "not attending"
                      ? "Not Attending"
                      : s === "no response"
                        ? "No Response"
                        : s.charAt(0).toUpperCase() + s.slice(1)}
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
                {(filterTeam === "Districts" || myTeam === "Districts") && (
                  <select
                    value={filterSubTeam}
                    onChange={(e) => { setFilterSubTeam(e.target.value); setFilterDept(""); }}
                    className="w-full sm:w-52 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                  >
                    <option value="">All Clusters</option>
                    <option value="Pastor Biola Cluster">Pastor Biola Cluster</option>
                    <option value="Pastor Isaac Cluster">Pastor Isaac Cluster</option>
                    <option value="Unassigned">Unassigned</option>
                  </select>
                )}
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  disabled={!myTeam && !filterTeam}
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
                  {filtered.length.toLocaleString()} of {count.toLocaleString()} registration{count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <Card padding="none" className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-100">
                <thead className="bg-cream-100">
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>Name</th>
                    {!filterTeam && !myTeam && <th className={th}>Team</th>}
                    {!filterDept && <th className={th}>Department</th>}
                    {(filterTeam === "Districts" || myTeam === "Districts") && <th className={th}>Cluster</th>}
                    {status === "all" && <th className={th}>Status</th>}
                    {(status === "all" || status === "not attending") && <th className={th}>Reason</th>}
                    <th className={th}>Confirmed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {loading ? (
                    <tr>
                      <td colSpan={colSpanCount} className="px-3 py-8 text-center text-sm text-ink-400">
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
