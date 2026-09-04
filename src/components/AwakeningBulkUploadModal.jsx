import { useState } from "react";
import ExcelJS from "exceljs";
import { toast } from "react-toastify";
import GenericModal from "./GenericModal";
import Tag from "./ui/Tag";
import { submitAwakeningRegistration } from "../services/awakeningConference";
import { awakeningRegistrationSchema } from "../utils/schemas";
import {
  buildAwakeningRegistrationPayload,
  normalizeAwakeningDays,
} from "../utils/awakeningRegistration";
import {
  AWAKENING_CAMPUSES,
  AWAKENING_SERVICE_TEAMS,
  AWAKENING_CELL_DESIGNATIONS,
} from "../utils/schemas";
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";

const PREVIEW_ROWS = 20;

const CSV_HEADERS = [
  "first_name", "last_name", "phone", "email", "campus", "registration_type",
  "worker_team", "department", "worker_designation",
  "belongs_to_cell", "cell_designation", "foundation_course_status",
  "attendance_day", "preferred_service_team", "serving_day",
  "join_prayer_team", "lead_prayer_team",
];

// ── Sample CSV download ───────────────────────────────────────────────────────

export function downloadSampleCsv() {
  const sampleRows = [
    [
      "Ada", "Okafor", "08012345678", "ada@example.com", "Gbagada", "attendee",
      "", "", "", "yes", "Member", "yes",
      "wednesday_9th_september|sunday_13th_september",
      "", "", "", "",
    ],
    [
      "Emeka", "Nwosu", "+2348023456789", "emeka@example.com", "Magodo", "worker",
      "Programs", "Protocol", "HOD", "no", "", "not_yet_but_would_love_to",
      "all_days", "Ushering", "friday_11th|sunday_13th_september", "no", "no",
    ],
  ];
  const csv = [CSV_HEADERS.join(","), ...sampleRows.map((r) => r.join(","))].join("\n");
  saveCsvBlob(csv, "awakening-bulk-upload-sample.csv");
}

function saveCsvBlob(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Normalisation helpers ─────────────────────────────────────────────────────

const clean = (v) => (v ?? "").toString().trim();

function canonical(value, options) {
  const v = clean(value).toLowerCase();
  const direct = options.find((o) => o.toLowerCase() === v);
  if (direct) return direct;
  const collapsed = v.replace(/[\s\-_]/g, "");
  return options.find((o) => o.toLowerCase().replace(/[\s\-_]/g, "") === collapsed) ?? value;
}

const yesNo = (v) => {
  const n = clean(v).toLowerCase();
  return n === "yes" || n === "y" ? "yes" : n === "no" || n === "n" ? "no" : clean(v);
};

function normaliseRow(raw) {
  const row = {
    first_name: clean(raw.first_name),
    last_name: clean(raw.last_name),
    phone: clean(raw.phone),
    email: clean(raw.email),
    campus: canonical(raw.campus, AWAKENING_CAMPUSES),
    registration_type: clean(raw.registration_type).toLowerCase(),
    belongs_to_cell: yesNo(raw.belongs_to_cell),
    cell_designation: raw.cell_designation
      ? canonical(raw.cell_designation, AWAKENING_CELL_DESIGNATIONS)
      : undefined,
    foundation_course_status: clean(raw.foundation_course_status).toLowerCase(),
    attendance_day: normalizeAwakeningDays(raw.attendance_day),
    // Free text for the endpoint - trimmed only, no enum constraint
    worker_team: clean(raw.worker_team) || undefined,
    department: clean(raw.department) || undefined,
    worker_designation: clean(raw.worker_designation) || undefined,
    preferred_service_team: raw.preferred_service_team
      ? canonical(raw.preferred_service_team, AWAKENING_SERVICE_TEAMS)
      : undefined,
    serving_day: normalizeAwakeningDays(raw.serving_day),
    join_prayer_team: raw.join_prayer_team ? yesNo(raw.join_prayer_team) : undefined,
    lead_prayer_team: raw.lead_prayer_team ? yesNo(raw.lead_prayer_team) : undefined,
  };
  // Worker-only fields stay undefined for attendees so payload stays minimal
  if (!row.worker_team) delete row.worker_team;
  if (!row.department) delete row.department;
  if (!row.worker_designation) delete row.worker_designation;
  if (!raw.preferred_service_team) delete row.preferred_service_team;
  if (!row.serving_day.length) delete row.serving_day;
  if (!raw.join_prayer_team) delete row.join_prayer_team;
  if (!raw.lead_prayer_team) delete row.lead_prayer_team;
  if (!row.cell_designation) delete row.cell_designation;
  return row;
}

function validateRow(normalised) {
  const result = awakeningRegistrationSchema.safeParse(normalised);
  if (result.success) {
    return { payload: buildAwakeningRegistrationPayload(result.data), errors: [] };
  }
  return {
    payload: null,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "row"}: ${issue.message}`
    ),
  };
}

// ── File parsing ──────────────────────────────────────────────────────────────

function parseCsvText(text) {
  const rows = [];
  let cur = [];
  let val = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { val += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else val += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { cur.push(val); val = ""; }
    else if (ch === "\n") { cur.push(val); rows.push(cur); cur = []; val = ""; }
    else if (ch !== "\r") val += ch;
  }
  if (val.length > 0 || cur.length > 0) { cur.push(val); rows.push(cur); }
  return rows.filter((r) => r.some((c) => clean(c) !== ""));
}

async function parseFile(file) {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const text = await file.text();
    const matrix = parseCsvText(text);
    if (!matrix.length) throw new Error("The file appears to be empty.");
    const headers = matrix[0].map((h) => clean(h));
    return matrix.slice(1).map((cells) => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = cells[i] ?? ""; });
      return obj;
    });
  }

  // Excel (.xlsx / .xls) via ExcelJS - same approach as HODBulkAddWorker
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  const headers = [];
  const objects = [];
  worksheet.eachRow((row, rowNumber) => {
    const values = row.values.slice(1);
    if (rowNumber === 1) {
      values.forEach((h) => headers.push(h != null ? clean(h) : ""));
    } else {
      const obj = {};
      values.forEach((v, i) => { if (headers[i]) obj[headers[i]] = v != null ? String(v) : ""; });
      objects.push(obj);
    }
  });
  return objects;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AwakeningBulkUploadModal({ onClose, onComplete }) {
  const [rows, setRows] = useState(null); // [{ rowNumber, payload, errors }]
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(null); // { completed, total, failures: [] }

  const validRows = rows?.filter((r) => r.payload) ?? [];
  const invalidCount = (rows?.length ?? 0) - validRows.length;

  const handleFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsParsing(true);
    setRows(null);
    setFileName(file.name);
    try {
      const rawRows = await parseFile(file);
      const validated = rawRows
        .map((raw, index) => ({ raw, rowNumber: index + 2 })) // header is row 1
        .filter(({ raw }) => Object.values(raw).some((v) => clean(v) !== ""))
        .map(({ raw, rowNumber }) => {
          const normalised = normaliseRow(raw);
          const { payload, errors } = validateRow(normalised);
          return { rowNumber, payload, errors, normalised };
        });
      if (!validated.length) throw new Error("No data rows found under the header.");
      setRows(validated);
    } catch (err) {
      toast.error(err.message || "Could not parse the file.");
      setFileName("");
    } finally {
      setIsParsing(false);
      event.target.value = ""; // allow re-selecting the same file
    }
  };

  const handleUpload = async () => {
    const queue = validRows;
    const failures = [];
    setProgress({ completed: 0, total: queue.length, failures });
    for (let i = 0; i < queue.length; i += 1) {
      try {
        // Sequential on purpose - register endpoint called one after the other
         
        await submitAwakeningRegistration(queue[i].payload);
      } catch (err) {
        failures.push({
          rowNumber: queue[i].rowNumber,
          name: [queue[i].normalised.first_name, queue[i].normalised.last_name]
            .filter(Boolean)
            .join(" "),
          error: err.message || "Request failed",
        });
        setProgress({ completed: i + 1, total: queue.length, failures: [...failures] });
        continue;
      }
      setProgress({ completed: i + 1, total: queue.length, failures: [...failures] });
    }
    const succeeded = queue.length - failures.length;
    toast.success(`Bulk upload finished - ${succeeded} registered, ${failures.length} failed.`);
    onComplete();
  };

  const inputCls =
    "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink transition";

  return (
    <GenericModal isOpen onClose={progress ? undefined : onClose} title="Bulk Upload Registrations" size="large">
      {/* Step 1: sample + file picker */}
      {!rows && !progress && (
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            Upload a CSV or Excel file with one registration per row. Rows are sent to the
            registration endpoint <strong className="text-ink">one after another</strong> once you confirm.
          </p>
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink underline underline-offset-2 hover:text-ink/70 transition"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download Sample CSV
          </button>
          <div>
            <label htmlFor="bulk-file" className={inputCls + " cursor-pointer block"}>
              {isParsing
                ? "Parsing..."
                : fileName || "Click to choose a .csv or .xlsx file"}
            </label>
            <input id="bulk-file" type="file" accept=".csv,.xlsx,.xls" className="sr-only"
              onChange={handleFile} disabled={isParsing} />
            {fileName && (
              <button type="button" onClick={() => setFileName("")}
                className="mt-2 text-xs text-ink-500 hover:text-ink transition">
                Choose a different file
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: preview */}
      {rows && !progress && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-ink truncate max-w-[50%]">{fileName}</span>
            <Tag tone="success">{validRows.length} valid</Tag>
            {invalidCount > 0 && <Tag tone="danger">{invalidCount} invalid</Tag>}
            <button type="button" onClick={() => setRows(null)}
              className="ml-auto text-xs text-ink-500 hover:text-ink transition">
              Change file
            </button>
          </div>

          <div className="border border-ink-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-cream-200 border-b border-ink-200">
                  <th className="qc-section-title px-3 py-2 text-left whitespace-nowrap">Row</th>
                  <th className="qc-section-title px-3 py-2 text-left">Name</th>
                  <th className="qc-section-title px-3 py-2 text-left">Campus</th>
                  <th className="qc-section-title px-3 py-2 text-left">Type</th>
                  <th className="qc-section-title px-3 py-2 text-left">Phone</th>
                  <th className="qc-section-title px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_ROWS).map((r) => (
                  <tr key={r.rowNumber} className="border-b border-ink-100 last:border-b-0">
                    <td className="px-3 py-2 qc-num">{r.rowNumber}</td>
                    <td className="px-3 py-2">
                      {[r.normalised.first_name, r.normalised.last_name].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td className="px-3 py-2">{r.normalised.campus || "-"}</td>
                    <td className="px-3 py-2">{r.normalised.registration_type || "-"}</td>
                    <td className="px-3 py-2 qc-num">{r.normalised.phone}</td>
                    <td className="px-3 py-2">
                      {r.payload ? (
                        <Tag tone="success">Ready</Tag>
                      ) : (
                        <span title={r.errors.join("\n")} className="block max-w-56 truncate text-brick">
                          {r.errors[0]}
                          {r.errors.length > 1 && ` (+${r.errors.length - 1})`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > PREVIEW_ROWS && (
            <p className="text-xs text-ink-500">
              Previewing first {PREVIEW_ROWS} of {rows.length} rows. All {validRows.length} valid rows will be uploaded.
            </p>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!validRows.length}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            Upload {validRows.length} Registration{validRows.length !== 1 ? "s" : ""}
          </button>
          {invalidCount > 0 && (
            <p className="text-xs text-sienna">
              Invalid rows will be skipped. Fix them in the file and re-upload to include them.
            </p>
          )}
        </div>
      )}

      {/* Step 3: progress */}
      {progress && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-ink">
                Registering… {progress.completed}/{progress.total}
              </span>
              <span className="text-ink-500 qc-num">
                {Math.round((progress.completed / Math.max(progress.total, 1)) * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
              <div
                className="h-full bg-forest transition-all duration-300"
                style={{ width: `${(progress.completed / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-ink-500 mt-1.5">
              Sending requests sequentially - please keep this window open.
            </p>
          </div>

          {progress.completed === progress.total && (
            <div className="rounded-lg border border-ink-200 p-3 space-y-1.5">
              <p className="text-sm font-medium text-forest">
                Done - {progress.total - progress.failures.length} registered
                {progress.failures.length > 0 && `, ${progress.failures.length} failed`}
              </p>
              {progress.failures.map((f) => (
                <p key={f.rowNumber} className="text-xs text-brick">
                  Row {f.rowNumber} ({f.name}): {f.error}
                </p>
              ))}
            </div>
          )}

          {progress.completed === progress.total && (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90"
            >
              Close
            </button>
          )}
        </div>
      )}
    </GenericModal>
  );
}
