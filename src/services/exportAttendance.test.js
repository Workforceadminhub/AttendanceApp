import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../utils/apiClient", () => ({
  default: apiRequestMock,
}));

import { downloadAttendanceWorkbook } from "./exportAttendance";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("downloadAttendanceWorkbook", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("requests the workbook for the given Sundays as one comma-separated param", async () => {
    const workbook = new Blob(["xlsx"], { type: XLSX_TYPE });
    apiRequestMock.mockResolvedValue(workbook);

    await expect(downloadAttendanceWorkbook(["2026-09-06", "2026-09-13"])).resolves.toBe(workbook);
    expect(apiRequestMock).toHaveBeenCalledWith(
      "GET",
      "/api/admin/attendance/workbook",
      { dates: "2026-09-06,2026-09-13" },
      { responseType: "blob" }
    );
  });

  it("returns null when the session expired and the client is redirecting", async () => {
    apiRequestMock.mockResolvedValue(undefined);

    await expect(downloadAttendanceWorkbook(["2026-10-04"])).resolves.toBeNull();
  });

  it("throws the server's message when it answers with JSON instead of a workbook", async () => {
    apiRequestMock.mockResolvedValue(
      new Blob([JSON.stringify({ success: false, message: "No attendance for these dates" })], {
        type: "application/json",
      })
    );

    await expect(downloadAttendanceWorkbook(["2026-10-04"])).rejects.toThrow(
      "No attendance for these dates"
    );
  });
});
