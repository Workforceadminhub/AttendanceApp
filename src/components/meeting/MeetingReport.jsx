import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Header from "../Header";
import Layout from "../Layout";
import Stat from "../ui/Stat";
import Card from "../ui/Card";
import Tag from "../ui/Tag";
import Button from "../ui/Button";
import { getMeetingRegistrations } from "../../services/meeting";
import { getUserRole } from "../../utils/getUserRole";
import { getUser } from "../../utils/getUser";
import { teamsAndDepartments, getDistrictClusterName } from "../../utils/teams";
import { getMeetingDate, getAllMeetings, formatMeetingDisplayDate } from "../../utils/meetingConfig";
import { getStoredTeamStrengths } from "../../utils/teamStrengthConfig";
import { TEAM_STRUCTURE, EXCEL_COLORS, buildTeamNameLookup } from "../../utils/meeting/teamStructure";
import { formatDate } from "../../utils/meeting/formatDate";
import { DISTRICT_SUB_TEAM_OPTIONS } from "./atoms";

const MEETING_LABEL = { leaders: "Leaders", workers: "Workers" };

const METRICS = {
  confirmed: {
    reportName: "Confirmation Report",
    statusOptions: ["all", "confirmed", "not attending"],
    respondedOnly: true,
    summaryFile: "confirmation",
    listFile: "list",
  },
  present: {
    reportName: "Attendance Report",
    statusOptions: ["all", "present", "absent", "confirmed", "not attending"],
    respondedOnly: false,
    summaryFile: "summary",
    listFile: "present_list",
  },
};

const STATUS_LABEL = {
  all: "All",
  confirmed: "Confirmed",
  "not attending": "Not Attending",
  "no response": "No Response",
  present: "Present",
  absent: "Absent",
};

const TEAM_NAME_LOOKUP = buildTeamNameLookup();
const EMPTY = [];

const th = "px-3 py-2 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide whitespace-nowrap";
const td = "px-3 py-2 text-sm text-ink-800 whitespace-nowrap";
const summaryTh = "px-4 py-3 text-xs font-semibold text-ink-700 uppercase tracking-wide";
const summaryTd = "px-4 py-2 text-sm text-center font-mono";
const totalTd = "px-4 py-3 text-sm font-bold text-ink-900 text-center font-mono";
const filterSelectClass =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10 disabled:opacity-50 disabled:cursor-not-allowed";

const isMarkedPresent = (r) => r?.is_present === true;

const pctOf = (part, whole) => (whole ? ((part / whole) * 100).toFixed(2) : "0.00");

const sum = (rows, key) => rows.reduce((acc, r) => acc + (r[key] || 0), 0);

/** Maps a registration to a TEAM_STRUCTURE display team, or undefined when it cannot be placed. */
function resolveTeamName(r) {
  const rTeam = (r.team || "").toLowerCase().trim();
  const rDept = (r.department || "").toLowerCase().trim();
  const rSubTeam = (r.district_sub_team || "").toLowerCase().trim();

  let matched;
  if (rTeam === "districts" || rTeam === "district" || rSubTeam.includes("cluster") || rDept.includes("community")) {
    matched = getDistrictClusterName(r.department, r.district_sub_team);
  }
  if (!matched) {
    const rDeptSuffix = rDept.includes(" - ") ? rDept.split(" - ").pop().trim() : null;
    matched = TEAM_NAME_LOOKUP[rTeam] || TEAM_NAME_LOOKUP[rDept] || (rDeptSuffix && TEAM_NAME_LOOKUP[rDeptSuffix]);
  }
  return matched || undefined;
}

/** Click plus keyboard (Enter / Space) activation for non-button clickable cells. */
function clickable(handler) {
  return {
    role: "button",
    tabIndex: 0,
    onClick: handler,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler();
      }
    },
  };
}

const thinBorder = { style: "thin", color: { argb: "FFE5E7EB" } };
const cellBorder = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

const confirmationLabel = (r) =>
  r.is_confirmed === true ? "Confirmed" : r.is_confirmed === false ? "Not Attending" : "No Response";

/**
 * Admin report for a meeting.
 *
 * @param {object} props
 * @param {"leaders"|"workers"} props.meetingType
 * @param {"confirmed"|"present"} props.metric
 *   confirmed: confirmation report (only registrations that responded are loaded).
 *   present:   attendance report (every registration is loaded, presence is the headline metric).
 */
export default function MeetingReport({ meetingType, metric }) {
  const isPresent = metric === "present";
  const config = METRICS[metric] || METRICS.confirmed;
  const label = MEETING_LABEL[meetingType] || "Leaders";

  const navigate = useNavigate();
  const [teamStrength] = useState(() => getStoredTeamStrengths());
  const [meetingDate, setMeetingDate] = useState(() => getMeetingDate(meetingType));
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState(null); // { meetingDate, reloadKey, registrations }
  const [view, setView] = useState("summary"); // summary | list
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [filterDirectorate, setFilterDirectorate] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterSubTeam, setFilterSubTeam] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const { isSuperAdmin, isChurchAdmin, isTeamAdmin } = getUserRole();
  const authUser = getUser();
  const myTeam =
    isTeamAdmin && !isSuperAdmin && !isChurchAdmin
      ? typeof authUser?.team === "string"
        ? authUser.team
        : authUser?.team?.name || ""
      : null;

  useEffect(() => {
    if (!isSuperAdmin && !isChurchAdmin && !isTeamAdmin) {
      toast.error("You do not have permission to view this page.");
      navigate("/login", { replace: true });
    }
  }, [navigate, isSuperAdmin, isChurchAdmin, isTeamAdmin]);

  const loading =
    !loaded || loaded.meetingDate !== meetingDate || loaded.reloadKey !== reloadKey;

  useEffect(() => {
    let active = true;
    const respondedOnly = config.respondedOnly;
    getMeetingRegistrations(meetingDate, "all", meetingType)
      .then((res) => {
        if (!active) return;
        const cleaned = (res.data || [])
          .filter((r) => !respondedOnly || r.is_confirmed === true || r.is_confirmed === false)
          .map((r) => ({ ...r, name: r.name ? r.name.replace(/\s+null$/i, "").trim() : "" }));
        setLoaded({ meetingDate, reloadKey, registrations: cleaned });
      })
      .catch((err) => {
        if (!active) return;
        toast.error(err.message || "Failed to load meeting data.");
        setLoaded((prev) => ({ meetingDate, reloadKey, registrations: prev?.registrations ?? [] }));
      });
    return () => {
      active = false;
    };
  }, [meetingDate, reloadKey, meetingType, config.respondedOnly]);

  const registrations = loaded?.registrations ?? EMPTY;
  const count = registrations.length;

  const handleSummaryClick = (directorate, teamName) => {
    setFilterDirectorate(directorate);
    const entry = TEAM_STRUCTURE.find((item) => item.teams.includes(teamName));
    if (entry) {
      const apiTeam = entry.apiTeams[0];
      setFilterTeam(apiTeam);
      if (apiTeam === "Districts" && teamName.includes("Biola")) setFilterSubTeam("Pastor Biola Cluster");
      else if (apiTeam === "Districts" && teamName.includes("Isaac")) setFilterSubTeam("Pastor Isaac Cluster");
      else setFilterSubTeam("");
    } else {
      setFilterTeam("");
      setFilterSubTeam("");
    }
    setFilterDept("");
    setView("list");
  };

  const handleDirectorateClick = (directorate) => {
    setFilterDirectorate(directorate);
    setFilterTeam("");
    setFilterSubTeam("");
    setFilterDept("");
    setView("list");
  };

  // Team admins only see their own team.
  const scopedRegistrations = useMemo(
    () => (myTeam ? registrations.filter((r) => r.team === myTeam) : registrations),
    [registrations, myTeam]
  );

  const unassignedConfirmedDistricts = useMemo(
    () =>
      registrations.filter(
        (r) =>
          (r.team || "").toLowerCase().trim() === "districts" &&
          r.is_confirmed === true &&
          (!r.district_sub_team || String(r.district_sub_team).trim() === "")
      ),
    [registrations]
  );

  // Overall counts plus per-display-team tallies.
  const { stats, byTeam } = useMemo(() => {
    const totals = { total: scopedRegistrations.length, confirmed: 0, declined: 0, noResponse: 0, present: 0 };
    const tally = {};
    scopedRegistrations.forEach((r) => {
      if (r.is_confirmed === true) totals.confirmed++;
      else if (r.is_confirmed === false) totals.declined++;
      else totals.noResponse++;
      if (isMarkedPresent(r)) totals.present++;

      const matched = resolveTeamName(r);
      if (!matched) return;
      const t = tally[matched] || (tally[matched] = { confirmed: 0, notAttending: 0, present: 0 });
      if (r.is_confirmed === true) t.confirmed++;
      else if (r.is_confirmed === false) t.notAttending++;
      if (isMarkedPresent(r)) t.present++;
    });
    return { stats: totals, byTeam: tally };
  }, [scopedRegistrations]);

  const teamCounts = (t) => byTeam[t] || { confirmed: 0, notAttending: 0, present: 0 };

  // A team's capacity is at least the number of people who have already responded / shown up.
  const adjustedStrength = (t) => {
    const c = teamCounts(t);
    return Math.max(teamStrength[t] ?? 0, c.confirmed + c.notAttending, isPresent ? c.present : 0);
  };

  const effectiveStrength = (() => {
    const all = () =>
      TEAM_STRUCTURE.reduce((acc, entry) => acc + entry.teams.reduce((s, t) => s + adjustedStrength(t), 0), 0);
    if (!myTeam) return all();
    const entry = TEAM_STRUCTURE.find((t) => t.apiTeams.includes(myTeam));
    return entry ? entry.teams.reduce((s, t) => s + adjustedStrength(t), 0) : all();
  })();

  const directorates = [...new Set(TEAM_STRUCTURE.map((t) => t.directorate))];
  const selectedApiTeams = filterDirectorate
    ? TEAM_STRUCTURE.filter((t) => t.directorate === filterDirectorate).flatMap((t) => t.apiTeams)
    : [];

  const apiTeamOptions = [
    ...new Set(
      scopedRegistrations
        .filter((r) => !filterDirectorate || selectedApiTeams.includes(r.team))
        .map((r) => r.team)
        .filter(Boolean)
    ),
  ].sort();

  const departments = [
    ...new Set(
      scopedRegistrations
        .filter((r) => !filterDirectorate || selectedApiTeams.includes(r.team))
        .filter((r) => !filterTeam || r.team === filterTeam)
        .map((r) => r.department)
        .filter(Boolean)
    ),
  ].sort();

  const filtered = scopedRegistrations.filter((r) => {
    if (filterDirectorate && !selectedApiTeams.includes(r.team)) return false;
    if (filterTeam && r.team !== filterTeam) return false;
    if (filterSubTeam === "Unassigned") {
      if (r.district_sub_team) return false;
    } else if (filterSubTeam && r.district_sub_team !== filterSubTeam) {
      return false;
    }
    if (filterDept && r.department !== filterDept) return false;

    if (status === "present" && r.is_present !== true) return false;
    if (status === "absent" && r.is_present === true) return false;
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

  const hasFilter = Boolean(filterDirectorate || filterTeam || filterDept || search.trim());

  const filteredStats = (() => {
    const total = filtered.length;
    let confirmed = 0;
    let declined = 0;
    let noResponse = 0;
    let present = 0;
    filtered.forEach((r) => {
      if (r.is_confirmed === true) confirmed++;
      else if (r.is_confirmed === false) declined++;
      else noResponse++;
      if (isMarkedPresent(r)) present++;
    });
    return {
      total,
      confirmed,
      declined,
      present,
      unconfirmed: noResponse + declined,
      absent: Math.max(total - present, 0),
      pctConfirmed: total ? `${Math.round((confirmed / total) * 100)}%` : "-",
      pctPresent: total ? `${((present / total) * 100).toFixed(1)}%` : "-",
    };
  })();

  // Directorate / team summary rows (TEAM_STRUCTURE is small, so this is cheap to recompute).
  const grouped = (() => {
    const mapped = TEAM_STRUCTURE.map(({ directorate, teams, apiTeams, bg, light }) => {
      const rows = teams.map((t) => {
        const c = teamCounts(t);
        const strength = adjustedStrength(t);
        return {
          team: t,
          total: strength,
          confirmed: c.confirmed,
          notAttending: c.notAttending,
          present: c.present,
          absent: isPresent ? Math.max(strength - c.present, 0) : strength - c.confirmed - c.notAttending,
          pct: pctOf(isPresent ? c.present : c.confirmed, strength),
        };
      });
      const total = sum(rows, "total");
      const confirmed = sum(rows, "confirmed");
      const present = sum(rows, "present");
      return {
        directorate,
        bg,
        light,
        rows,
        apiTeams,
        total,
        confirmed,
        notAttending: sum(rows, "notAttending"),
        present,
        absent: isPresent ? sum(rows, "absent") : total - confirmed,
        pct: pctOf(isPresent ? present : confirmed, total),
      };
    });

    const merged = [];
    mapped.forEach((g) => {
      const existing = merged.find((m) => m.directorate === g.directorate);
      if (!existing) {
        merged.push({ ...g });
        return;
      }
      existing.rows = [...existing.rows, ...g.rows];
      existing.apiTeams = [...existing.apiTeams, ...g.apiTeams];
      existing.total += g.total;
      existing.confirmed += g.confirmed;
      existing.notAttending += g.notAttending;
      existing.present += g.present;
      existing.absent += g.absent;
      existing.pct = pctOf(isPresent ? existing.present : existing.confirmed, existing.total);
    });

    return merged.filter((g) => !myTeam || g.apiTeams.includes(myTeam));
  })();

  const grandTotal = {
    total: sum(grouped, "total"),
    confirmed: sum(grouped, "confirmed"),
    notAttending: sum(grouped, "notAttending"),
    present: sum(grouped, "present"),
    absent: sum(grouped, "absent"),
  };
  grandTotal.pct = pctOf(isPresent ? grandTotal.present : grandTotal.confirmed, grandTotal.total);

  // Department-level breakdown for the team-admin view.
  const groupedByDept = myTeam
    ? (() => {
        const teamEntry = teamsAndDepartments.find((t) => t.team === myTeam);
        const map = {};
        (teamEntry?.department ?? []).forEach((dept) => {
          map[dept] = { department: dept, total: 0, confirmed: 0, notAttending: 0, present: 0 };
        });
        scopedRegistrations.forEach((r) => {
          const dept = r.department || "Unknown";
          const d = map[dept] || (map[dept] = { department: dept, total: 0, confirmed: 0, notAttending: 0, present: 0 });
          d.total += 1;
          if (r.is_confirmed === true) d.confirmed += 1;
          else if (r.is_confirmed === false) d.notAttending += 1;
          if (isMarkedPresent(r)) d.present += 1;
        });
        return Object.values(map)
          .map((d) => ({
            ...d,
            absent: isPresent ? Math.max(d.total - d.present, 0) : d.total - d.confirmed - d.notAttending,
          }))
          .sort((a, b) => a.department.localeCompare(b.department));
      })()
    : [];

  // Summary table numeric columns for the current metric.
  const summaryColumns = isPresent
    ? [
        { key: "total", header: "Total", tone: "text-ink-800", adminHidden: true },
        { key: "confirmed", header: "Confirmed", tone: "text-forest font-medium" },
        { key: "present", header: "Present", tone: "text-forest font-medium" },
        { key: "pct", header: "% of Present", tone: "text-ink-800", isPct: true, adminHidden: true },
        { key: "absent", header: "Absent", tone: "text-brick font-medium" },
      ]
    : [
        { key: "total", header: "Total", tone: "text-ink-800", adminHidden: true },
        { key: "confirmed", header: "Confirmed", tone: "text-forest font-medium" },
        { key: "pct", header: "% Confirmed", tone: "text-ink-800", isPct: true, adminHidden: true },
        { key: "notAttending", header: "Not Attending", tone: "text-sienna font-medium" },
        { key: "absent", header: "Unconfirmed", tone: "text-brick font-medium" },
      ];
  const visibleSummaryColumns = summaryColumns.filter((c) => !myTeam || !c.adminHidden);
  const summaryColSpan = (myTeam ? 1 : 2) + visibleSummaryColumns.length;

  const formatCell = (row, col) => (col.isPct ? `${row[col.key]}%` : row[col.key].toLocaleString());

  const showCluster = filterTeam === "Districts" || myTeam === "Districts";
  const showTeamCol = !filterTeam && !myTeam;
  const showReason = status === "all" || status === "not attending";
  const listColSpan =
    3 + (showTeamCol ? 1 : 0) + (!filterDept ? 1 : 0) + (showCluster ? 1 : 0) +
    (status === "all" ? (isPresent ? 2 : 1) : 0) + (showReason ? 1 : 0);

  const fileBase = `${meetingType}_meeting`;

  const exportSummarySheet = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Attendance Summary");

      const numericColumns = isPresent
        ? [
            { header: "TOTAL", key: "total", width: 12 },
            { header: "CONFIRMED", key: "confirmed", width: 15, color: "FF059669" },
            { header: "PRESENT", key: "present", width: 15, color: "FF059669" },
            { header: "% OF PRESENT", key: "pct", width: 18, isPct: true },
            { header: "ABSENT", key: "absent", width: 15, color: "FFDC2626" },
          ]
        : [
            { header: "TOTAL", key: "total", width: 12 },
            { header: "CONFIRMED", key: "confirmed", width: 15, color: "FF059669" },
            { header: "% CONFIRMED", key: "pct", width: 18, isPct: true },
            { header: "NOT ATTENDING", key: "notAttending", width: 18, color: "FFD97706" },
            { header: "UNCONFIRMED", key: "absent", width: 15, color: "FFDC2626" },
          ];

      worksheet.columns = [
        { header: "DIRECTORATE", key: "directorate", width: 25 },
        { header: "TEAM", key: "team", width: 25 },
        ...numericColumns.map(({ header, key, width }) => ({ header, key, width })),
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FF374151" }, size: 10 };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.border = { ...cellBorder, bottom: { style: "medium", color: { argb: "FFD1D5DB" } } };
      });

      const rowValues = (r) =>
        Object.fromEntries(
          numericColumns.map((c) => [c.key, c.isPct ? parseFloat(r.pct) / 100 : r[c.key]])
        );

      const styleNumericCells = (row, values) => {
        numericColumns.forEach((c) => {
          const cell = row.getCell(c.key);
          cell.alignment = { vertical: "middle", horizontal: "right" };
          if (c.isPct) cell.numFmt = "0.00%";
          if (c.color && values[c.key] > 0) cell.font = { color: { argb: c.color }, bold: true };
        });
      };

      let currentRow = 2;
      grouped.forEach((g) => {
        const startRow = currentRow;
        const colors = EXCEL_COLORS[g.directorate];

        g.rows.forEach((r) => {
          const values = rowValues(r);
          const row = worksheet.addRow({ directorate: g.directorate.toUpperCase(), team: r.team, ...values });
          row.getCell("directorate").alignment = { vertical: "middle", horizontal: "left" };
          row.getCell("team").alignment = { vertical: "middle", horizontal: "left" };
          styleNumericCells(row, values);
          row.eachCell((cell, colNumber) => {
            cell.border = cellBorder;
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
        if (startRow < endRow) worksheet.mergeCells(startRow, 1, endRow, 1);
        const firstCell = worksheet.getCell(startRow, 1);
        firstCell.font = { bold: true, color: { argb: "FF1F2937" } };
        firstCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });

      const totalRow = worksheet.addRow({ directorate: "TOTAL", team: "", ...rowValues(grandTotal) });
      totalRow.height = 24;
      totalRow.eachCell((cell) => {
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
        cell.border = {
          ...cellBorder,
          top: { style: "medium", color: { argb: "FF9CA3AF" } },
          bottom: { style: "double", color: { argb: "FF9CA3AF" } },
        };
      });
      totalRow.getCell("directorate").alignment = { vertical: "middle", horizontal: "left" };
      numericColumns.forEach((c) => {
        const cell = totalRow.getCell(c.key);
        cell.alignment = { vertical: "middle", horizontal: "right" };
        if (c.isPct) cell.numFmt = "0.00%";
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `${fileBase}_${config.summaryFile}_${meetingDate}.xlsx`
      );
    } catch (err) {
      toast.error("Failed to export summary sheet: " + err.message);
    }
  };

  const exportListExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      const teamGroups = {};
      TEAM_STRUCTURE.forEach((t) => t.teams.forEach((teamName) => { teamGroups[teamName] = []; }));
      teamGroups.Unassigned = [];
      filtered.forEach((r) => {
        const matched = resolveTeamName(r) || "Unassigned";
        (teamGroups[matched] || (teamGroups[matched] = [])).push(r);
      });

      const allTeamNames = [...TEAM_STRUCTURE.flatMap((t) => t.teams), "Unassigned"];

      const statusColumns = isPresent
        ? [
            { header: "Present", key: "presentStatus", width: 12 },
            { header: "Confirmed", key: "confirmedStatus", width: 15 },
          ]
        : [{ header: "Status", key: "status", width: 15 }];

      for (const teamName of allTeamNames) {
        const people = teamGroups[teamName] || [];
        const sheetName = teamName.replace(/[:?*/\\[\]]/g, "").substring(0, 31) || "Sheet";
        const worksheet = workbook.addWorksheet(sheetName);

        worksheet.columns = [
          { header: "#", key: "index", width: 6 },
          { header: "Name", key: "name", width: 30 },
          { header: "Phone Number", key: "phone", width: 16 },
          { header: "Directorate", key: "directorate", width: 20 },
          { header: "Team", key: "team", width: 25 },
          { header: "Department", key: "department", width: 30 },
          { header: "Role", key: "role", width: 20 },
          ...statusColumns,
          { header: "Confirmed At", key: "confirmedAt", width: 22 },
          { header: "Notes", key: "notes", width: 40 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.height = 26;
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
          cell.alignment = { vertical: "middle", horizontal: "left" };
        });
        headerRow.getCell("index").alignment = { vertical: "middle", horizontal: "center" };

        const rank = (r) => (isPresent ? (r.is_present === true ? 1 : 0) : r.is_confirmed ? 1 : 0);
        const sorted = [...people].sort((a, b) => {
          const deptA = (a.department || "").toLowerCase();
          const deptB = (b.department || "").toLowerCase();
          if (deptA !== deptB) return deptA.localeCompare(deptB);
          return rank(b) - rank(a);
        });

        sorted.forEach((person, idx) => {
          const matchedDir = TEAM_STRUCTURE.find(
            (t) => t.teams.includes(teamName) || t.apiTeams.includes(person.team)
          );
          const row = worksheet.addRow({
            index: idx + 1,
            name: person.name || "",
            phone: person.phone || person.phonenumber || person.phone_number || "",
            directorate: matchedDir ? matchedDir.directorate : "Others",
            team: teamName,
            department: person.department || "",
            role: person.role || "",
            status: confirmationLabel(person),
            presentStatus: person.is_present === true ? "Present" : "Absent",
            confirmedStatus: confirmationLabel(person),
            confirmedAt: person.confirmed_at ? formatDate(person.confirmed_at) : "",
            notes: person.notes || person.decline_reason || "",
          });
          row.height = 20;
          row.eachCell((cell) => {
            cell.alignment = { vertical: "middle", horizontal: "left" };
            cell.border = cellBorder;
            cell.font = { size: 10, color: { argb: "FF374151" } };
          });
          row.getCell("index").alignment = { vertical: "middle", horizontal: "center" };

          if (isPresent) {
            row.getCell("presentStatus").font = {
              bold: true,
              size: 10,
              color: { argb: person.is_present === true ? "FF059669" : "FFD97706" },
            };
          } else if (person.is_confirmed === true) {
            row.getCell("status").font = { bold: true, color: { argb: "FF059669" }, size: 10 };
          } else if (person.is_confirmed === false) {
            row.getCell("status").font = { bold: true, color: { argb: "FFD97706" }, size: 10 };
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `${fileBase}_${config.listFile}_${meetingDate}.xlsx`
      );
    } catch (err) {
      toast.error("Failed to export Excel list: " + err.message);
    }
  };

  const exportData = () => (view === "summary" ? exportSummarySheet() : exportListExcel());

  const viewButton = (value, text) => (
    <button
      type="button"
      onClick={() => setView(value)}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
        view === value ? "bg-ink-900 text-white" : "bg-ink-200 text-ink-700 hover:bg-ink-300"
      }`}
    >
      {text}
    </button>
  );

  const confirmationTag = (r) =>
    r.is_confirmed === true ? (
      <Tag tone="success">Confirmed</Tag>
    ) : r.is_confirmed === false ? (
      <Tag tone="error">Not Attending</Tag>
    ) : (
      <Tag tone="warning">No Response</Tag>
    );

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        {unassignedConfirmedDistricts.length > 0 && (
          <div
            className="mb-6 p-4 rounded-md border shadow-sm"
            style={{ backgroundColor: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }}
          >
            <h3 className="font-bold mb-1">Confirmed Districts {label.toLowerCase()} with no cluster:</h3>
            <ul className="list-disc pl-5">
              {unassignedConfirmedDistricts.map((w) => (
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
            <div className="qc-eyebrow">{label} Meeting {config.reportName}</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
              {formatMeetingDisplayDate(meetingDate)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-ink-200 rounded-lg px-3 py-1.5 shadow-sm">
              <label htmlFor="report-meeting" className="text-xs font-medium text-ink-500">
                Select Meeting:
              </label>
              <select
                id="report-meeting"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-ink-900 focus:outline-none cursor-pointer"
              >
                {getAllMeetings(meetingType).map((m) => (
                  <option key={m.id} value={m.date}>
                    {m.title} ({m.date}){m.isActive ? " ★ Active" : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          <Stat
            eyebrow={`Total ${label}`}
            value={hasFilter ? filteredStats.total : effectiveStrength}
            loading={loading}
          />
          <Stat
            eyebrow="Confirmed"
            value={hasFilter ? filteredStats.confirmed : stats.confirmed}
            loading={loading}
          />
          {isPresent ? (
            <>
              <Stat
                eyebrow="Present"
                value={hasFilter ? filteredStats.present : stats.present}
                loading={loading}
              />
              <Stat
                eyebrow="% of Present"
                value={
                  hasFilter
                    ? filteredStats.pctPresent
                    : effectiveStrength
                      ? `${((stats.present / effectiveStrength) * 100).toFixed(1)}%`
                      : "-"
                }
                loading={loading}
              />
              <Stat
                eyebrow="Absent"
                value={hasFilter ? filteredStats.absent : Math.max(effectiveStrength - stats.present, 0)}
                loading={loading}
              />
            </>
          ) : (
            <>
              <Stat
                eyebrow="% of Confirmed"
                value={
                  hasFilter
                    ? filteredStats.pctConfirmed
                    : effectiveStrength
                      ? `${Math.round((stats.confirmed / effectiveStrength) * 100)}%`
                      : "-"
                }
                loading={loading}
              />
              <Stat
                eyebrow="Not Attending"
                value={hasFilter ? filteredStats.declined : stats.declined}
                loading={loading}
              />
              <Stat
                eyebrow="Unconfirmed"
                value={hasFilter ? filteredStats.unconfirmed : effectiveStrength - stats.confirmed}
                loading={loading}
                footnote={
                  hasFilter
                    ? filteredStats.total
                      ? `${Math.round((filteredStats.unconfirmed / filteredStats.total) * 100)}%`
                      : undefined
                    : effectiveStrength
                      ? `${Math.round(((effectiveStrength - stats.confirmed) / effectiveStrength) * 100)}%`
                      : undefined
                }
              />
            </>
          )}
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
          {viewButton("list", "List View")}
          {viewButton("summary", "Summary View")}
        </div>

        {view === "summary" ? (
          <Card padding="none" className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-100">
              <thead className="bg-cream-200">
                <tr>
                  {myTeam ? (
                    <th className={`${summaryTh} text-left`}>Department</th>
                  ) : (
                    <>
                      <th className={`${summaryTh} text-left`}>Directorate</th>
                      <th className={`${summaryTh} text-left`}>Team</th>
                    </>
                  )}
                  {visibleSummaryColumns.map((c) => (
                    <th key={c.key} className={`${summaryTh} text-center`}>{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {loading ? (
                  <tr>
                    <td colSpan={summaryColSpan} className="px-4 py-8 text-center text-sm text-ink-400">
                      Loading...
                    </td>
                  </tr>
                ) : myTeam ? (
                  <>
                    {groupedByDept.length === 0 ? (
                      <tr>
                        <td colSpan={summaryColSpan} className="px-4 py-8 text-center text-sm text-ink-400">
                          No data available.
                        </td>
                      </tr>
                    ) : (
                      groupedByDept.map((d) => (
                        <tr key={d.department} className="hover:bg-cream-100">
                          <td className="px-4 py-2 text-sm text-ink-800 font-medium">{d.department}</td>
                          {visibleSummaryColumns.map((c) => (
                            <td key={c.key} className={`${summaryTd} ${c.tone}`}>{formatCell(d, c)}</td>
                          ))}
                        </tr>
                      ))
                    )}
                    <tr className="bg-cream-200 border-t-2 border-ink-200">
                      <td className="px-4 py-3 text-sm font-bold text-ink-900 uppercase">Total</td>
                      {visibleSummaryColumns.map((c) => (
                        <td key={c.key} className={totalTd}>{sum(groupedByDept, c.key).toLocaleString()}</td>
                      ))}
                    </tr>
                  </>
                ) : grouped.length === 0 ? (
                  <tr>
                    <td colSpan={summaryColSpan} className="px-4 py-8 text-center text-sm text-ink-400">
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
                                className="px-4 py-2 text-sm font-semibold text-ink-900 uppercase align-top border-r border-white/50 cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                                style={{ backgroundColor: `${g.bg}33` }}
                                title={`View all ${g.directorate} registrations`}
                                {...clickable(() => handleDirectorateClick(g.directorate))}
                              >
                                {g.directorate}
                              </td>
                            )}
                            <td
                              className="px-4 py-2 text-sm text-ink-800 font-medium cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                              title={`View ${r.team} registrations`}
                              {...clickable(() => handleSummaryClick(g.directorate, r.team))}
                            >
                              {r.team}
                            </td>
                            {visibleSummaryColumns.map((c) => (
                              <td key={c.key} className={`${summaryTd} ${c.tone}`}>{formatCell(r, c)}</td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    <tr className="bg-cream-200 border-t-2 border-ink-200">
                      <td colSpan={2} className="px-4 py-3 text-sm font-bold text-ink-900 uppercase">Total</td>
                      {visibleSummaryColumns.map((c) => (
                        <td key={c.key} className={totalTd}>{formatCell(grandTotal, c)}</td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
                {config.statusOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    aria-pressed={status === s}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      status === s ? "bg-ink-900 text-white" : "bg-ink-200 text-ink-700 hover:bg-ink-300"
                    }`}
                  >
                    {STATUS_LABEL[s] || s}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {!myTeam && (
                  <div className="w-full sm:w-44">
                    <label htmlFor="report-filter-directorate" className="sr-only">Directorate</label>
                    <select
                      id="report-filter-directorate"
                      value={filterDirectorate}
                      onChange={(e) => {
                        setFilterDirectorate(e.target.value);
                        setFilterTeam("");
                        setFilterSubTeam("");
                        setFilterDept("");
                      }}
                      className={filterSelectClass}
                    >
                      <option value="">All Directorates</option>
                      {directorates.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                {!myTeam && (
                  <div className="w-full sm:w-44">
                    <label htmlFor="report-filter-team" className="sr-only">Team</label>
                    <select
                      id="report-filter-team"
                      value={filterTeam}
                      onChange={(e) => {
                        setFilterTeam(e.target.value);
                        setFilterSubTeam("");
                        setFilterDept("");
                      }}
                      disabled={!filterDirectorate}
                      className={filterSelectClass}
                    >
                      <option value="">All Teams</option>
                      {apiTeamOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                {showCluster && (
                  <div className="w-full sm:w-52">
                    <label htmlFor="report-filter-cluster" className="sr-only">Cluster</label>
                    <select
                      id="report-filter-cluster"
                      value={filterSubTeam}
                      onChange={(e) => {
                        setFilterSubTeam(e.target.value);
                        setFilterDept("");
                      }}
                      className={filterSelectClass}
                    >
                      <option value="">All Clusters</option>
                      {DISTRICT_SUB_TEAM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      <option value="Unassigned">Unassigned</option>
                    </select>
                  </div>
                )}
                <div className="w-full sm:w-44">
                  <label htmlFor="report-filter-department" className="sr-only">Department</label>
                  <select
                    id="report-filter-department"
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    disabled={!myTeam && !filterTeam}
                    className={filterSelectClass}
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="w-full sm:w-48">
                  <label htmlFor="report-search" className="sr-only">Search name</label>
                  <input
                    id="report-search"
                    type="text"
                    placeholder="Search name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                  />
                </div>
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
                    {showTeamCol && <th className={th}>Team</th>}
                    {!filterDept && <th className={th}>Department</th>}
                    {showCluster && <th className={th}>Cluster</th>}
                    {status === "all" && isPresent && <th className={th}>Present</th>}
                    {status === "all" && <th className={th}>{isPresent ? "Confirmed" : "Status"}</th>}
                    {showReason && <th className={th}>Reason</th>}
                    <th className={th}>Confirmed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {loading ? (
                    <tr>
                      <td colSpan={listColSpan} className="px-3 py-8 text-center text-sm text-ink-400">
                        Loading registrations...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={listColSpan} className="px-3 py-8 text-center text-sm text-ink-400">
                        No registrations found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr key={r.id} className="hover:bg-cream-100">
                        <td className={td}>{i + 1}</td>
                        <td className={`${td} font-medium`}>{r.name}</td>
                        {showTeamCol && <td className={td}>{r.team || "-"}</td>}
                        {!filterDept && <td className={td}>{r.department || "-"}</td>}
                        {showCluster && (
                          <td className={td}>
                            {r.district_sub_team || <span className="text-ink-400 italic">Unassigned</span>}
                          </td>
                        )}
                        {status === "all" && isPresent && (
                          <td className={td}>
                            {r.is_present === true ? (
                              <Tag tone="success">Present</Tag>
                            ) : (
                              <Tag tone="warning">Absent</Tag>
                            )}
                          </td>
                        )}
                        {status === "all" && <td className={td}>{confirmationTag(r)}</td>}
                        {showReason && (
                          <td className={`${td} max-w-xs whitespace-normal text-ink-600 italic`}>
                            {r.notes || r.decline_reason || "-"}
                          </td>
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
