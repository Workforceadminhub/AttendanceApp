import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { fetchAllAwakeningRegistrations } from "../services/awakeningConference";
import {
  formatAwakeningDays,
  normalizeAwakeningDepartment,
  normalizeAwakeningServiceTeam,
} from "./awakeningRegistration";

/**
 * Export Awakening Conference registrations to a multi-sheet Excel workbook.
 *
 * - Fetches every page of registrations matching the current admin filters.
 * - One worksheet per campus, rows sorted newest-registration-first.
 * - Sheet names are the campus names; campuses without records are skipped.
 */

const foundationLabel = (value) => ({
  yes: "Completed",
  no: "Not completed",
  not_yet_but_would_love_to: "Wants to",
}[value] ?? "-");
const yesNoLabel = (v) => (v === "yes" ? "Yes" : v === "no" ? "No" : "-");

function registeredAt(row) {
  const raw = row?.created_at ?? row?.createdAt ?? row?.timestamp;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function fullName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || "-";
}

function addSheet(workbook, campusName, rows) {
  const sheet = workbook.addWorksheet(campusName);
  sheet.columns = [
    { header: "SN", key: "sn", width: 6 },
    { header: "Full Name", key: "name", width: 26 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Email", key: "email", width: 30 },
    { header: "Campus", key: "campus", width: 14 },
    { header: "Type", key: "type", width: 12 },
    { header: "Worker Team", key: "workerTeam", width: 18 },
    { header: "Department", key: "department", width: 20 },
    { header: "Worker Designation", key: "designation", width: 18 },
    { header: "Service Team", key: "team", width: 22 },
    { header: "Serving Days", key: "servingDay", width: 34 },
    { header: "Attending Days", key: "attendingDays", width: 34 },
    { header: "Cell Designation", key: "cell", width: 18 },
    { header: "Foundation Course", key: "foundation", width: 18 },
    { header: "Join Prayer Team", key: "joinPrayer", width: 15 },
    { header: "Lead Prayer Team", key: "leadPrayer", width: 15 },
    { header: "Registered", key: "registered", width: 20 },
  ];

  // Header row styling + frozen pane below it
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  rows.forEach((row, index) => {
    sheet.addRow({
      sn: index + 1,
      name: fullName(row),
      phone: row.phone ?? "-",
      email: row.email ?? "-",
      campus: row.campus ?? "-",
      type: row.registration_type === "worker" ? "Worker" : "Attendee",
      workerTeam: row.worker_team || "-",
      department: normalizeAwakeningDepartment(row.department) || "-",
      designation: row.worker_designation || "-",
      team: normalizeAwakeningServiceTeam(row.preferred_service_team) || "-",
      servingDay: formatAwakeningDays(row.serving_day),
      attendingDays: formatAwakeningDays(row.attendance_day),
      cell:
        row.belongs_to_cell === "yes"
          ? row.cell_designation || "Yes"
          : "No",
      foundation: foundationLabel(row.foundation_course_status),
      joinPrayer: yesNoLabel(row.join_prayer_team),
      leadPrayer: yesNoLabel(row.lead_prayer_team),
      registered: registeredAt(row)
        ? format(registeredAt(row), "dd MMM yyyy, h:mm a")
        : "-",
    });
  });

  return sheet;
}

export async function exportAwakeningWorkbook(filters = {}) {
  const rows = await fetchAllAwakeningRegistrations(filters);
  if (!rows.length) {
    throw new Error("No registrations match the current filters.");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Harvesters Workers System";

  // Group by campus preserving the newest-first order within each sheet
  const byCampus = new Map();
  for (const row of rows) {
    const campus = row.campus || "Unspecified";
    if (!byCampus.has(campus)) byCampus.set(campus, []);
    byCampus.get(campus).push(row);
  }
  for (const [campus, campusRows] of byCampus.entries()) {
    addSheet(workbook, campus.slice(0, 31), campusRows); // Excel sheet-name cap
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `awakening-registrations-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  return rows.length;
}
