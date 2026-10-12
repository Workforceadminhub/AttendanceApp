import { beforeEach, describe, expect, it, vi } from "vitest";
import apiRequest from "../utils/apiClient";
import { fetchAttendance, fetchAdminAttendance, fetchAttendanceHistory, fetchAttendanceLeaderboard } from "./attendance";
vi.mock("../utils/apiClient", () => ({ default: vi.fn() }));
const pagination = page => ({ page, limit: 1, total: 2, totalPages: 2, hasNext: page === 1 });

describe("attendance page collection", () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([
    ['attendance', () => fetchAttendance('2026-09-13', '2026-09-01', '2026-09-30', ['Sound'])],
    ['admin attendance', () => fetchAdminAttendance('Sound', true, '2026-09-13', '2026-09-01', '2026-09-30', ['Super Admin'])],
    ['history', () => fetchAttendanceHistory(['Sound'], '2026-09-01', '2026-09-30')],
    ['leaderboard', () => fetchAttendanceLeaderboard(['Sound'], '2026-09-01', '2026-09-30', 3)],
  ])("omits permissions while retaining date filters for %s", async (_label, fetch) => {
    apiRequest.mockResolvedValue({ data: [] });
    await fetch();
    expect(apiRequest).toHaveBeenCalled();
    const params = apiRequest.mock.calls[0][2];
    expect(params).not.toHaveProperty('permissions');
    if (params.fromDate) expect(params).toMatchObject({ fromDate: '2026-09-01', toDate: '2026-09-30' });
    else expect(params).toMatchObject({ startDate: '2026-09-01', endDate: '2026-09-30' });
  });
  it("preserves a non-paginated summary object and requests it once", async () => {
    const summary = { departments: [{ id: 1 }], totals: { present: 12 } };
    apiRequest.mockResolvedValue({ data: summary });
    expect(await fetchAdminAttendance('All', true, '2026-09-13')).toBe(summary);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
  it("returns a plain attendance array without another request", async () => {
    const rows = [{ id: 1 }];
    apiRequest.mockResolvedValue(rows);
    expect(await fetchAttendance('2026-09-13')).toBe(rows);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
  it("returns the full attendance array with the same date filters and no permission query", async () => {
    apiRequest.mockResolvedValueOnce({ data: [{ id: 1 }], pagination: pagination(1) })
      .mockResolvedValueOnce({ data: [{ id: 2 }], pagination: pagination(2) });
    expect(await fetchAttendance('2026-09-13', null, null, ['Sound'])).toEqual([{ id: 1 }, { id: 2 }]);
    expect(apiRequest).toHaveBeenLastCalledWith('GET', '/api/attendance', { activeDate: '2026-09-13', page: 2, limit: 1 });
  });
  it.each(['data', 'departments', 'items'])("collects the %s field while retaining first-page totals", async arrayKey => {
    apiRequest.mockResolvedValueOnce({ data: { [arrayKey]: [{ id: 1 }], totals: { present: 12 } }, pagination: pagination(1) })
      .mockResolvedValueOnce({ data: { [arrayKey]: [{ id: 2 }], totals: { present: 6 } }, pagination: pagination(2) });
    expect(await fetchAdminAttendance('All', true, '2026-09-13')).toEqual({ [arrayKey]: [{ id: 1 }, { id: 2 }], totals: { present: 12 } });
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
  it("collects nested history arrays", async () => {
    apiRequest.mockResolvedValueOnce({ data: { history: [{ id: 1 }], pagination: pagination(1) } })
      .mockResolvedValueOnce({ data: { history: [{ id: 2 }], pagination: pagination(2) } });
    expect(await fetchAttendanceHistory(['Sound'])).toEqual([{ id: 1 }, { id: 2 }]);
  });
  it("rejects when a later page fails instead of returning empty data", async () => {
    apiRequest.mockResolvedValueOnce({ data: [{ id: 1 }], pagination: pagination(1) }).mockRejectedValueOnce(new Error('Failed'));
    await expect(fetchAttendance('2026-09-13')).rejects.toThrow('Failed');
  });
});
