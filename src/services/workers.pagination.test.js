import { beforeEach, describe, expect, it, vi } from "vitest";
import apiRequest from "../utils/apiClient";
import { listSuperAdminWorkers, fetchWorkers, fetchAllSuperAdminWorkers, fetchAllPending, fetchPendingAdd } from "./workers";
vi.mock("../utils/apiClient", () => ({ default: vi.fn() }));
const response = (page, totalPages = 2) => ({ data: [{ id: page, team: 'Programs', department: 'Sound' }], pagination: { page, limit: 50, total: totalPages * 50, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } });

describe("worker pagination", () => {
  beforeEach(() => vi.resetAllMocks());
  it("unwraps one directory page and sends search and placement filters", async () => {
    apiRequest.mockResolvedValue(response(2, 4));
    expect(await listSuperAdminWorkers({ page: 2, limit: 50, search: ' Alice ', team: 'Programs' })).toEqual(response(2, 4));
    expect(apiRequest).toHaveBeenCalledWith('GET', '/api/super/admin/workers', { page: 2, limit: 50, search: 'Alice', team: 'Programs', sortBy: 'team' });
  });
  it("assembles both worker pages", async () => {
    apiRequest.mockImplementation((method, endpoint, { page }) => response(page));
    expect(await fetchWorkers('Sound', '2026-09-13')).toEqual([...response(1).data, ...response(2).data]);
    expect(apiRequest.mock.calls.map(call => call[2].page)).toEqual([1, 2]);
  });
  it("requests plain worker lists only once", async () => {
    apiRequest.mockResolvedValue({ data: [{ id: 1 }] });
    expect(await fetchWorkers('Sound')).toEqual([{ id: 1 }]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
  it("keeps walking when placement filtering removes a whole server page", async () => {
    apiRequest.mockResolvedValueOnce({ ...response(1), data: [{ id: 1, team: 'Programs', department: 'Media' }] })
      .mockResolvedValueOnce(response(2));
    expect(await fetchAllSuperAdminWorkers({ team: 'Programs', department: 'Sound' })).toEqual(response(2).data);
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
  it("collects pending exports even when a server page has only another status", async () => {
    apiRequest.mockResolvedValueOnce({ ...response(1), data: [{ id: 1, status: 'ACTIVE' }] })
      .mockResolvedValueOnce({ ...response(2), data: [{ id: 2, status: 'PENDING_ADD' }] });
    expect(await fetchAllPending('PENDING_ADD')).toEqual([{ id: 2, status: 'PENDING_ADD' }]);
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
  it("does not invent requests for a full plain pending export", async () => {
    const rows = Array.from({ length: 100 }, (_, id) => ({ id, status: 'PENDING_ADD' }));
    apiRequest.mockResolvedValue({ data: rows });
    expect(await fetchAllPending('PENDING_ADD')).toEqual(rows);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
  it("preserves unknown-total pagination and count hints on pending directory pages", async () => {
    apiRequest.mockResolvedValue({ data: [{ id: 1, status: 'PENDING_ADD' }] });
    expect((await fetchPendingAdd(1, 1)).pagination).toMatchObject({ total: null, hasNext: true, filteredCount: 1, pageCount: 1 });
  });
  it("collects every super-admin page", async () => {
    apiRequest.mockImplementation((method, endpoint, { page }) => response(page, 3));
    expect(await fetchAllSuperAdminWorkers()).toHaveLength(3);
    expect(apiRequest).toHaveBeenCalledTimes(3);
  });
});
