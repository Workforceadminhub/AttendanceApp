/** Default directory page size. */
export const DEFAULT_PAGE_LIMIT = 50;
/** Page size for complete datasets. */
export const FETCH_ALL_PAGE_LIMIT = 100;
/** Safety bound for page collection. */
export const MAX_PAGES = 500;

const keys = ['page', 'limit', 'per_page', 'total', 'totalPages', 'total_pages', 'hasNext', 'has_next', 'hasPrev', 'has_prev'];
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Extract the first supported row array from an API response. */
export function extractRows(response) {
  return [response, response?.data, response?.data?.data, response?.workers,
    response?.items, response?.results, response?.history].find(Array.isArray) || [];
}

/** Find pagination metadata, preferring explicit envelopes. */
export function extractPaginationMeta(response) {
  for (const candidate of [response?.pagination, isObject(response?.data) ? response.data.pagination : null]) {
    if (isObject(candidate) && keys.some(key => key in candidate)) return candidate;
  }
  for (const candidate of [response, response?.data]) {
    if (isObject(candidate) && keys.some(key => key in candidate)) {
      return Object.fromEntries([...keys, 'count'].filter(key => key in candidate).map(key => [key, candidate[key]]));
    }
  }
  return null;
}

/** Whether the server supplied pagination metadata. */
export function hasPaginationMeta(response) {
  return extractPaginationMeta(response) !== null;
}

const toBoolean = value => typeof value === 'string' ? !['false', '0', ''].includes(value.toLowerCase()) : Boolean(value);

/** Normalize pagination aliases and missing metadata. */
export function normalizePagination(meta = {}, requested = {}) {
  const rowCount = requested.rowCount ?? 0;
  const page = Number(meta.page ?? requested.page ?? 1) || 1;
  const limit = Number(meta.limit ?? meta.per_page ?? requested.limit ?? rowCount) || rowCount || 1;
  let total = meta.total != null ? Number(meta.total) : meta.count != null ? Number(meta.count) : rowCount;
  let totalPages = Number(meta.totalPages ?? meta.total_pages ?? Math.max(1, Math.ceil((total || 0) / limit)));
  let hasNext = toBoolean(meta.hasNext ?? meta.has_next ?? (page < totalPages));
  const hasPrev = toBoolean(meta.hasPrev ?? meta.has_prev ?? (page > 1));
  if (meta.total == null && meta.count == null && meta.totalPages == null && meta.total_pages == null) {
    if (meta.hasNext == null && meta.has_next == null) {
      total = rowCount;
      totalPages = page;
      hasNext = false;
    } else {
      totalPages = page + (hasNext ? 1 : 0);
    }
  }
  return { page, limit, total, totalPages, hasNext, hasPrev };
}

/** Return rows and normalized pagination without changing the response. */
export function unwrapPaginated(response, requested = {}) {
  const data = extractRows(response);
  return { data, pagination: normalizePagination(extractPaginationMeta(response) || {}, { ...requested, rowCount: data.length }) };
}

/** Collect each server page once; plain array endpoints require only one request. */
export async function fetchAllPages(fetchPage, { pageSize = FETCH_ALL_PAGE_LIMIT, maxPages = MAX_PAGES, first } = {}) {
  let page = 1;
  let raw = first ?? await fetchPage({ page, limit: pageSize });
  let current = unwrapPaginated(raw, { page, limit: pageSize });
  if (!hasPaginationMeta(raw)) return current.data;
  const rows = [];
  const seen = new Set();
  const append = data => data.forEach(row => {
    const key = row?.id ?? row?.workerid ?? row?.worker_id ?? JSON.stringify(row);
    if (!seen.has(key)) { seen.add(key); rows.push(row); }
  });
  append(current.data);
  // Trust hasNext over totalPages: some APIs send a stale or 1-based total
  // while still marking another page. Cap with maxPages so a stuck flag cannot loop.
  while (
    current.pagination.hasNext &&
    page < maxPages &&
    (extractPaginationMeta(raw)?.pageCount ?? current.data.length) > 0
  ) {
    page += 1;
    raw = await fetchPage({ page, limit: pageSize });
    current = unwrapPaginated(raw, { page, limit: pageSize });
    append(current.data);
  }
  return rows;
}
