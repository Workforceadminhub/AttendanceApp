import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { routeObject } from "./routeObject";

const HEADERS = [
  "First Name",
  "Last Name",
  "Other Name",
  "Email",
  "Phone",
  "Gender",
  "Worker Role",
  "Birth Date",
  "Marital Status",
  "Age Range",
  "Employment Status",
  "Department",
  "Team",
  "Occupation",
  "Address",
];

const SAMPLE_ROWS = [
  [
    "Jane",
    "Doe",
    "A.",
    "jane.doe@example.com",
    "+2348012345670",
    "Female",
    "Worker",
    "15th May",
    "Single",
    "26-30",
    "Employed",
    "House of Dorcas",
    "Ministry",
    "Teacher",
    "123 Main Street Lagos",
  ],
  [
    "John",
    "Smith",
    "B.",
    "john.smith@example.com",
    "+2348098765432",
    "Male",
    "Worker",
    "20th August",
    "Married",
    "31-35",
    "Self-Employed",
    "Call Centre",
    "Ministry",
    "Engineer",
    "456 Oak Avenue Abuja",
  ],
];

import { routeObject, getEffectiveRouteList } from "./routeObject";

/** Unique team names from effective route list; used for sample Excel Team dropdown */
export const getTeamOptions = () =>
  [...new Set(getEffectiveRouteList().map((r) => r.team).filter(Boolean))].sort();

/** Allowed values for dropdown columns; used in sample Excel and for bulk-upload validation */
export const DROPDOWN_OPTIONS = {
  Gender: ["Female", "Male"],
  get Team() {
    return getTeamOptions();
  },
  "Worker Role": [
    "Worker",
    "Assistant Small Group Leader",
    "Small Group Leader",
    "E-Group Leader",
    "Assistant Cell Leader",
    "Cell Leader",
    "Interest Group Leader",
    "Assistant HOD",
    "Zonal Leader",
    "Admin",
    "District Leader",
    "HOD",
    "Assistant Sub Team Head",
    "Sub Team Head",
    "Assistant Community Leader",
    "Community Leader",
    "Pastoral Leader",
    "Directional Leader",
  ],
  "Marital Status": ["Single", "Married", "Widow", "Divorced", "Separated"],
  "Age Range": ["18-25", "26-30", "31-35", "36-40", "41-45", "46-50", "51 & Above"],
  "Employment Status": ["Employed", "Self-Employed", "Student", "Unemployed"],
};

/** Column letters for dropdowns (F=Gender, G=Worker Role, I=Marital, J=Age Range, K=Employment, M=Team) */
const DROPDOWN_COLUMNS = [
  { col: "F", header: "Gender" },
  { col: "G", header: "Worker Role" },
  { col: "I", header: "Marital Status" },
  { col: "J", header: "Age Range" },
  { col: "K", header: "Employment Status" },
  { col: "M", header: "Team" },
];

/** Build list formula for Excel (comma-separated, quoted; Excel list has 255 char limit per item, 1024 total for formula) */
function listFormula(values) {
  const escaped = values.map((v) => String(v).replace(/"/g, '""'));
  return `"${escaped.join(",")}"`;
}

/**
 * Generate and download sample workers Excel with dropdowns for Gender, Worker Role, Marital Status, Age Range, Employment Status, and Team.
 * Department and Team mapping by role:
 * - Super Admin bulk add: "Department" and "Team" columns are read from the file; use exact names from the app.
 * - Church Admin bulk add: same as Super Admin — "Department" and "Team" are read from the file; fill them for each row.
 * - Team Admin / Sub Team Admin bulk add: "Department" and "Team" are read from the file when present; you must have access to that department. If omitted, the page's department/team are used.
 * - HOD bulk add: Department and Team are set from the page (the department you're on); these columns are ignored. You can leave them blank or omit them.
 */
export async function downloadSampleWorkersExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Workers", { views: [{ state: "frozen", ySplit: 1 }] });

  // Headers (row 1)
  sheet.addRow(HEADERS);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Sample data (rows 2+)
  SAMPLE_ROWS.forEach((row) => sheet.addRow(row));

  // Column widths
  HEADERS.forEach((h, i) => {
    sheet.getColumn(i + 1).width = Math.min(28, Math.max(12, h.length + 2));
  });

  // Data validation (dropdowns) for rows 2–500
  const dataEndRow = 500;
  DROPDOWN_COLUMNS.forEach(({ col, header }) => {
    const options = DROPDOWN_OPTIONS[header];
    if (!options || options.length === 0) return;
    const range = `${col}2:${col}${dataEndRow}`;
    const formula = listFormula(options);
    sheet.dataValidations.add(range, {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: "Invalid value",
      error: `Choose from the list (${header})`,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, "sample-workers.xlsx");
}
