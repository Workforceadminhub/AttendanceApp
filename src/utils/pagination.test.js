import { describe, expect, it, vi } from "vitest";
import { extractRows, hasPaginationMeta, unwrapPaginated, fetchAllPages } from "./pagination.js";

const paged = (page, data, totalPages = 3) => ({ data, pagination: { page, limit: 1, total: totalPages, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } });

describe("pagination", () => {
  it("unwraps direct and nested envelopes", () => {
    const response = paged(2, [{ id: 2 }]);
    expect(unwrapPaginated(response)).toEqual(response);
    expect(unwrapPaginated({ data: response })).toEqual(response);
  });
  it("recognizes plain arrays without inventing metadata", () => {
    const rows = [{ id: 1 }];
    expect(hasPaginationMeta(rows)).toBe(false);
    expect(unwrapPaginated(rows).data).toBe(rows);
  });
  it("normalizes snake-case fields and string booleans", () => {
    expect(unwrapPaginated({ items: [1], page: '2', per_page: '1', total: '3', total_pages: '3', has_next: 'false', has_prev: 'true' }).pagination)
      .toEqual({ page: 2, limit: 1, total: 3, totalPages: 3, hasNext: false, hasPrev: true });
  });
  it("extracts supported row aliases in order", () => {
    for (const key of ['workers', 'items', 'results', 'history']) expect(extractRows({ [key]: [1] })).toEqual([1]);
    expect(extractRows({ data: [1], workers: [2] })).toEqual([1]);
  });
  it("walks three pages", async () => {
    const fetch = vi.fn(({ page }) => paged(page, [{ id: page }]));
    expect(await fetchAllPages(fetch, { pageSize: 1 })).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fetch.mock.calls.map(([args]) => args.page)).toEqual([1, 2, 3]);
  });
  it("does not request a second page without metadata even when full", async () => {
    const fetch = vi.fn(() => ({ data: [{ id: 1 }] }));
    expect(await fetchAllPages(fetch, { pageSize: 1 })).toEqual([{ id: 1 }]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("stops at an empty page", async () => {
    const fetch = vi.fn(({ page }) => paged(page, page === 1 ? [{ id: 1 }] : []));
    expect(await fetchAllPages(fetch)).toEqual([{ id: 1 }]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("uses the raw page count when a service filters out current-page rows", async () => {
    const fetch = vi.fn(({ page }) => ({ ...paged(page, page === 1 ? [] : [{ id: page }]), pagination: { ...paged(page, []).pagination, pageCount: 1 } }));
    expect(await fetchAllPages(fetch)).toEqual([{ id: 2 }, { id: 3 }]);
  });
  it("deduplicates ids and fallback identities", async () => {
    const rows = [{ id: 1 }, { workerid: 'w' }, { worker_id: 'x' }, { name: 'Fallback' }];
    const fetch = vi.fn(({ page }) => paged(page, rows));
    expect(await fetchAllPages(fetch)).toEqual(rows);
  });
  it("reuses the first response and respects the safety bound", async () => {
    const fetch = vi.fn(({ page }) => paged(page, [{ id: page }]));
    expect(await fetchAllPages(fetch, { first: paged(1, [{ id: 1 }]), maxPages: 2 })).toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("walks hasNext-only metadata until false", async () => {
    const fetch = vi.fn(({ page }) => ({ data: [{ id: page }], pagination: { page, hasNext: page < 3 } }));
    expect(await fetchAllPages(fetch)).toHaveLength(3);
  });
  it("keeps walking when hasNext is true even if totalPages is stale", async () => {
    const fetch = vi.fn(({ page }) => ({
      data: [{ id: page }],
      pagination: { page, limit: 1, totalPages: 1, hasNext: page < 2 },
    }));
    expect(await fetchAllPages(fetch)).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
