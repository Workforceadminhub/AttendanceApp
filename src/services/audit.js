import apiRequest from "../utils/apiClient";

/**
 * Fetches audit log entries with pagination and filtering.
 * Sends GET /api/audit?page&limit&action&event plus any extra filter keys passed through as-is.
 * @param {number} [page=1] - Page number (sent as `page`)
 * @param {number} [limit=50] - Number of entries per page
 * @param {Object} [filters={}] - Optional filters { actionType, event, ...rest }; actionType is sent as `action`, other keys are forwarded unchanged
 * @returns {Promise<Object|null>} { data: [], pagination: { total, page, limit, totalPages, hasNext, hasPrev } } or null on error
 */
export const fetchAuditLogs = async (page = 1, limit = 50, filters = {}) => {
  try {
    const { actionType, event, ...restFilters } = filters || {};
    const params = {
      page,
      limit,
      ...restFilters,
      ...(actionType && { action: actionType }),
      ...(event && { event }),
    };

    const response = await apiRequest("GET", "/api/audit", params);

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch audit logs");
    }

    const list = Array.isArray(response.data) ? response.data : [];
    const pag = response.pagination || {};
    const fallbackTotalPages = Math.ceil((pag.total || 0) / limit) || 1;
    const totalPages = pag.totalPages != null ? pag.totalPages : fallbackTotalPages;
    const currentPage = pag.page ?? page;

    return {
      data: list,
      pagination: {
        ...pag,
        total: pag.total ?? list.length,
        page: currentPage,
        limit: pag.limit ?? limit,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
    };
  } catch (error) {
    return null;
  }
};
