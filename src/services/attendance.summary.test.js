import { beforeEach, describe, expect, it, vi } from "vitest";
import apiRequest from "../utils/apiClient";
import { fetchAttendanceSummary } from "./attendance";
vi.mock("../utils/apiClient", () => ({ default: vi.fn() }));

describe("fetchAttendanceSummary", () => {
  beforeEach(() => vi.resetAllMocks());
  it("loads the scope's counts in one request", async () => {
    const counts = { total: 205, present: 153, absent: 52, unmarked: 0 };
    apiRequest.mockResolvedValue({ success: true, data: counts });
    expect(await fetchAttendanceSummary("Ministry", "All", "Sunday - 4/10/2026")).toBe(counts);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/admin/attendance/summary",
      { team: "Ministry", activeGroup: "All", activeDate: "Sunday - 4/10/2026" },
      undefined
    );
  });
  it("rejects when the request fails", async () => {
    apiRequest.mockResolvedValue({ error: "Forbidden" });
    await expect(fetchAttendanceSummary("Ministry", "All", "Sunday - 4/10/2026")).rejects.toThrow("Forbidden");
  });
});
