import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../utils/apiClient";
import { hubGetAll, hubGetPaged } from "./client";
import { fetchAllTrainings, fetchTrainings, fetchEnrollees } from "./trainings";
import { fetchCourses } from "./courses";
vi.mock("../../utils/apiClient", () => ({ apiRequest: vi.fn() }));
const paged = page => ({ data: [{ id: page }], pagination: { page, per_page: 1, total: 2, total_pages: 2, has_next: page === 1 }, label: 'Roster' });

describe("Hub pagination", () => {
  beforeEach(() => vi.resetAllMocks());
  it("preserves a plain envelope without an extra request", async () => {
    const response = { data: [{ id: 1 }], label: 'Roster' };
    apiRequest.mockResolvedValue(response);
    expect(await hubGetPaged('/trainings/1/enrollees')).toBe(response);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
  it("reuses page one and preserves the envelope for roster callers", async () => {
    apiRequest.mockResolvedValueOnce(paged(1)).mockResolvedValueOnce(paged(2));
    expect(await fetchEnrollees(1, { status: 'active' })).toEqual({ ...paged(1), data: [{ id: 1 }, { id: 2 }] });
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest).toHaveBeenLastCalledWith('GET', '/api/hub/trainings/1/enrollees', { status: 'active', page: 2, limit: 1, per_page: 1 }, undefined, true);
  });
  it("returns complete worker picker arrays", async () => {
    apiRequest.mockResolvedValueOnce(paged(1)).mockResolvedValueOnce(paged(2));
    expect(await hubGetAll('/workers', { department: 'Sound' })).toEqual([{ id: 1 }, { id: 2 }]);
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
  it.each([fetchTrainings, fetchCourses])("normalizes list-page metadata without walking", async fetchList => {
    apiRequest.mockResolvedValue(paged(1));
    const result = await fetchList({ page: 1, per_page: 1 });
    expect(result.total).toBe(2);
    expect(result.pagination).toMatchObject({ page: 1, total: 2, totalPages: 2, hasNext: true });
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
  it("assembles and sorts all trainings for pickers", async () => {
    apiRequest.mockResolvedValueOnce({ ...paged(1), data: [{ id: 3 }] }).mockResolvedValueOnce(paged(2));
    expect(await fetchAllTrainings()).toEqual({ data: [{ id: 2 }, { id: 3 }] });
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});
