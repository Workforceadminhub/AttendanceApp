import { useMemo } from "react";
import { getTeamForDepartment, getEffectiveRouteList } from "../../utils/routeObject";
import { getSundayTitleDate } from "../../utils/getDate";

/** Resolve team from department name; use case-insensitive and common aliases so API variants still match */
function resolveTeamForDepartment(dept) {
 if (!dept) return null;
 const exact = getTeamForDepartment(dept);
 if (exact) return exact;
 const lower = dept.trim().toLowerCase();
 const entry = getEffectiveRouteList().find(
 (r) => r.department && r.department.trim().toLowerCase() === lower
 );
 if (entry) return entry.team;
 if (lower.includes("directional") && lower.includes("leader")) return "Senior Leadership";
 if (lower.includes("pastoral") && lower.includes("leader")) return "Senior Leadership";
 return null;
}

// Directorate order and team -> directorate mapping (reference layout)
const DIRECTORATE_ORDER = [
 "ATTRACTION",
 "NLP",
 "SPD",
 "NEXT GEN",
 "GENERAL SERVICES",
 "COMMUNITIES",
 "INTERACTIVE GROUPS",
 "SENIOR LEADERSHIP",
];

const TEAM_TO_DIRECTORATE = {
 Mission: "ATTRACTION",
 Programs: "ATTRACTION",
 NLP: "NLP",
 Maturity: "SPD",
 Ministry: "SPD",
 Membership: "SPD",
 "Next Gen": "NEXT GEN",
 "General Service": "GENERAL SERVICES",
 Districts: "COMMUNITIES",
 "Interactive Groups": "COMMUNITIES",
 "Senior Leadership": "SENIOR LEADERSHIP",
};

// Directorate background colors (for DIRECTORATE + TEAMS columns)
const DIRECTORATE_COLORS = {
 ATTRACTION: "bg-cyan-100",
 NLP: "bg-violet-100",
 SPD: "bg-mustard/15",
 "NEXT GEN": "bg-sky-100",
 "GENERAL SERVICES": "bg-sienna/15",
 COMMUNITIES: "bg-rose-100",
 "INTERACTIVE GROUPS": "bg-emerald-100",
 "SENIOR LEADERSHIP": "bg-lime-100",
};

function getDirectorate(team) {
 return TEAM_TO_DIRECTORATE[team] || null;
}

/** For Next Gen, derive display sub-team from department name */
function getNextGenSubTeam(department) {
 const d = (department || "").toLowerCase();
 if (d.includes("kidszone") || d.includes("kidzone")) return "Kidzone";
 if (d.includes("stirhouse") || d.includes("stir house")) return "Stir House";
 return "Next Gen";
}

/** Canonical department name for keying/aggregation (e.g. "Directional leader" -> "Directional Leaders") */
function canonicalDeptName(department, team) {
 if (!department) return department;
 const d = department.trim().toLowerCase();
 if (team === "Senior Leadership") {
 if (d.includes("directional")) return "Directional Leaders";
 if (d.includes("pastoral")) return "Pastoral Leaders";
 }
 return department;
}

/** Build display label for team/department (reference uses "Admin & Facility", "Directional leaders") */
function getTeamDisplayLabel(team, department) {
 if (team === "General Service" || team === "Interactive Groups" || team === "Senior Leadership") {
 const labels = {
 "Admin and Facility": "Admin & Facility",
 "Communications (DMU)": "Communication (DMU)",
 "Directional Leaders": "Directional leaders",
 "Pastoral Leaders": "Pastoral Leaders",
 };
 return labels[department] || department;
 }
 if (team === "Next Gen") return getNextGenSubTeam(department);
 return team;
}

/**
 * Builds a flat list of table rows: { directorate, teamLabel, total, present, absent, percentage }.
 * Aggregates by team for most directorates; uses department-level rows for General Service, Interactive Groups, Senior Leadership.
 */
function buildTableRows(rows) {
 const items = Array.isArray(rows) ? rows : [];
 const byDirectorate = new Map();

 items.forEach((item) => {
 const dept = item.department || item.department_name;
 // Prefer the API's `team` field (always present) over a name-based lookup
 // that depends on routeObject having the dept registered. The lookup
 // remains as a fallback for legacy rows that lack the team field.
 const team =
 (item.team && TEAM_TO_DIRECTORATE[item.team] ? item.team : null) ||
 resolveTeamForDepartment(dept) ||
 "Other";
 const directorate = getDirectorate(team);
 if (!directorate) return;

 const total = item.total ?? 0;
 const present = item.present ?? 0;
 const absent = item.absent ?? 0;
 const teamLabel = getTeamDisplayLabel(team, canonicalDeptName(dept, team));

 const key =
 directorate === "GENERAL SERVICES" ||
 directorate === "INTERACTIVE GROUPS" ||
 directorate === "SENIOR LEADERSHIP"
 ? `${directorate}-${canonicalDeptName(dept, team)}`
 : `${directorate}-${teamLabel}`;

 if (!byDirectorate.has(directorate)) byDirectorate.set(directorate, new Map());
 const dirMap = byDirectorate.get(directorate);
 if (!dirMap.has(key)) {
 dirMap.set(key, {
 directorate,
 teamLabel,
 total: 0,
 present: 0,
 absent: 0,
 });
 }
 const agg = dirMap.get(key);
 agg.total += total;
 agg.present += present;
 agg.absent += absent;
 });

 const flatRows = [];
 DIRECTORATE_ORDER.forEach((dir) => {
 const dirMap = byDirectorate.get(dir);
 if (!dirMap) return;
 dirMap.forEach((agg) => {
 flatRows.push({
 ...agg,
 percentage:
 agg.total > 0
 ? ((agg.present / agg.total) * 100).toFixed(2) + "%"
 : "0.00%",
 });
 });
 });

 return flatRows;
}

export default function SundayWorkersAttendanceTable({ rows, selectedDate }) {
 const tableRows = useMemo(() => buildTableRows(rows), [rows]);
 const totals = useMemo(() => {
 let total = 0,
 present = 0,
 absent = 0;
 tableRows.forEach((r) => {
 total += r.total;
 present += r.present;
 absent += r.absent;
 });
 const pct = total > 0 ? ((present / total) * 100).toFixed(2) + "%" : "0.00%";
 return { total, present, absent, percentage: pct };
 }, [tableRows]);

 const titleDate = getSundayTitleDate(selectedDate);

 if (tableRows.length === 0) return null;

 // Group consecutive rows by directorate for rowSpan
 const rowsWithSpan = [];
 let i = 0;
 while (i < tableRows.length) {
 const directorate = tableRows[i].directorate;
 let count = 0;
 while (i + count < tableRows.length && tableRows[i + count].directorate === directorate) count++;
 for (let j = 0; j < count; j++) {
 rowsWithSpan.push({
 ...tableRows[i + j],
 directorateRowSpan: j === 0 ? count : 0,
 });
 }
 i += count;
 }

 return (
 <div className="mt-8 overflow-x-auto rounded-lg border border-ink-300">
 <table className="min-w-full border-collapse border border-ink-300 text-sm">
 <caption className="bg-sienna py-3 text-center text-lg font-bold text-white">
 {titleDate} - SUNDAY WORKERS ATTENDANCE
 </caption>
 <thead>
 <tr>
 <th className="border border-ink-300 bg-sienna px-3 py-2.5 text-left font-bold text-white">
 DIRECTORATE
 </th>
 <th className="border border-ink-300 bg-sienna px-3 py-2.5 text-left font-bold text-white">
 TEAMS
 </th>
 <th className="border border-ink-300 bg-sienna px-3 py-2.5 text-center font-bold text-white">
 TEAM STRENGTH
 </th>
 <th className="border border-ink-300 bg-forest px-3 py-2.5 text-center font-bold text-white">
 Present
 </th>
 <th className="border border-ink-300 bg-forest px-3 py-2.5 text-center font-bold text-white">
 % of Present
 </th>
 <th className="border border-ink-300 bg-rose-600 px-3 py-2.5 text-center font-bold text-white">
 Absent
 </th>
 </tr>
 </thead>
 <tbody>
 {rowsWithSpan.map((row, idx) => (
 <tr key={idx}>
 {row.directorateRowSpan > 0 ? (
 <td
 className={`border border-ink-300 px-3 py-2 align-middle ${DIRECTORATE_COLORS[row.directorate] || ""}`}
 rowSpan={row.directorateRowSpan}
 >
 {row.directorate}
 </td>
 ) : null}
 <td
 className={`border border-ink-300 px-3 py-2 ${DIRECTORATE_COLORS[row.directorate] || ""}`}
 >
 {row.teamLabel}
 </td>
 <td className="border border-ink-300 bg-mustard/15 px-3 py-2 text-center">
 {row.total}
 </td>
 <td className="border border-ink-300 bg-forest/10 px-3 py-2 text-center">
 {row.present}
 </td>
 <td className="border border-ink-300 bg-forest/10 px-3 py-2 text-center">
 {row.percentage}
 </td>
 <td className="border border-ink-300 bg-rose-100 px-3 py-2 text-center">
 {row.absent}
 </td>
 </tr>
 ))}
 <tr className="border-t-2 border-dashed border-sky-300">
 <td
 className="border border-ink-300 bg-slate-50 px-3 py-2 font-bold"
 colSpan={2}
 >
 TOTAL
 </td>
 <td className="border border-ink-300 bg-amber-200 px-3 py-2 text-center font-bold">
 {totals.total}
 </td>
 <td className="border border-ink-300 bg-forest/20 px-3 py-2 text-center font-bold">
 {totals.present}
 </td>
 <td className="border border-ink-300 bg-forest/20 px-3 py-2 text-center font-bold">
 {totals.percentage}
 </td>
 <td className="border border-ink-300 bg-rose-200 px-3 py-2 text-center font-bold">
 {totals.absent}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 );
}
