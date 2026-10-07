import apiRequest from "../utils/apiClient";

export const exportAttendance = async (attendancedate) => {
  const result = await apiRequest("POST", "/api/super/admin/attendance/export", {
    attendancedate,
  });
  const payload = result?.data;
  if (payload === undefined) {
    throw new Error(result?.error || "Failed to export attendance");
  }
  return payload;
};

/**
 * Download the workers' attendance workbook (.xlsx) for the given Sundays:
 * name, phone number and status per worker, one column per Sunday.
 * @param {string[]} dates - Sundays as yyyy-MM-dd
 * @returns {Promise<Blob|null>} null when the session expired (the client
 *   is already redirecting to login)
 */
export const downloadAttendanceWorkbook = async (dates) => {
  const blob = await apiRequest(
    "GET",
    "/api/admin/attendance/workbook",
    { dates: dates.join(",") },
    { responseType: "blob" }
  );
  if (blob === undefined) return null;
  if (!(blob instanceof Blob) || blob.type.includes("json")) {
    let message;
    try {
      message = JSON.parse(await blob.text())?.message;
    } catch {
      // Not JSON: fall through to the generic message.
    }
    throw new Error(message || "Failed to export attendance");
  }
  return blob;
};
