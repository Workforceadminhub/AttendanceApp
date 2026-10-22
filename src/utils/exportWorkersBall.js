import { loadExcelJS } from "./loadExcelJS";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { fetchWorkersBallRegistrations } from "../services/workersBall";

function parseDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateSafe(raw) {
  const d = parseDate(raw);
  return d ? format(d, "dd MMM yyyy, h:mm a") : "-";
}

function populateSheet(sheet, rows) {
  sheet.columns = [
    { header: "SN", key: "sn", width: 6 },
    { header: "Full Name", key: "name", width: 28 },
    { header: "Access Code", key: "code", width: 16 },
    { header: "Attendance Status", key: "status", width: 18 },
    { header: "Attended At", key: "attendedAt", width: 24 },
    { header: "Department", key: "department", width: 22 },
    { header: "Team", key: "team", width: 20 },
    { header: "Role", key: "role", width: 18 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 30 },
    { header: "Registered At", key: "registeredAt", width: 24 },
  ];

  // Header row styling
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFDFBF7" }, size: 11 };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1A1714" }, // Luxury obsidian
  };
  header.alignment = { vertical: "middle", horizontal: "left" };
  header.height = 26;

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  rows.forEach((r, idx) => {
    const isPending = r.status === "pending";
    const statusText = r.attended
      ? "Attended"
      : isPending
        ? "Pending"
        : "Registered";

    const row = sheet.addRow({
      sn: idx + 1,
      name: r.name || "-",
      code: r.code || r.accessCode || (isPending ? "Pending" : "-"),
      status: statusText,
      attendedAt: formatDateSafe(r.attendedAt),
      department: r.department || "-",
      team: r.team || "-",
      role: r.role || "Worker",
      phone: r.phone || "-",
      email: r.email || "-",
      registeredAt: formatDateSafe(r.registeredAt),
    });

    row.height = 20;
    row.alignment = { vertical: "middle" };

    // Tone status cell
    const statusCell = row.getCell("status");
    if (r.attended) {
      statusCell.font = { color: { argb: "FF065F46" }, bold: true }; // Emerald text
    } else if (isPending) {
      statusCell.font = { color: { argb: "FFB45309" }, italic: true }; // Amber italic text
    } else {
      statusCell.font = { color: { argb: "FF1F2937" } }; // Slate text
    }
  });

  return sheet;
}

/**
 * Export Workers Ball registrations to Excel.
 * Accepts existing row list or fetches using provided filters.
 */
export async function exportWorkersBallWorkbook({
  registrations = null,
  filters = {},
} = {}) {
  let rows = registrations;
  if (!rows || !rows.length) {
    const result = await fetchWorkersBallRegistrations(filters);
    rows = result.registrations;
  }

  if (!rows || !rows.length) {
    throw new Error("No registrations found to export.");
  }

  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Harvesters Workers System";
  workbook.created = new Date();

  // Sheet 1: Master List
  const allSheet = workbook.addWorksheet("All");
  populateSheet(allSheet, rows, "All");

  // Sheet 2: Attended
  const attendedRows = rows.filter((r) => r.attended);
  if (attendedRows.length > 0) {
    const attendedSheet = workbook.addWorksheet("Attended");
    populateSheet(attendedSheet, attendedRows, "Attended");
  }

  // Sheet 3: Registered (Confirmed, awaiting arrival)
  const registeredRows = rows.filter((r) => !r.attended && r.status !== "pending");
  if (registeredRows.length > 0) {
    const registeredSheet = workbook.addWorksheet("Registered");
    populateSheet(registeredSheet, registeredRows, "Registered");
  }

  // Sheet 4: Pending Confirmation
  const pendingRows = rows.filter((r) => r.status === "pending");
  if (pendingRows.length > 0) {
    const pendingSheet = workbook.addWorksheet("Pending");
    populateSheet(pendingSheet, pendingRows, "Pending");
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const timestamp = format(new Date(), "yyyy-MM-dd");
  saveAs(blob, `Workers-Ball-2026-Registrations-${timestamp}.xlsx`);

  return rows.length;
}
