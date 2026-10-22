/**
 * Centralized typed API client.
 * Wraps the existing apiClient with named methods per resource.
 *
 * Migrate services/* progressively to call these instead of writing one-off
 * try/catch wrappers around `apiRequest`. Type each response with JSDoc so
 * editors get autocomplete; once the project moves to TypeScript, swap to
 * generics and the call-sites won't change.
 */
import apiRequest from "./apiClient";

/** @typedef {{ id:number, name:string, team:string, route:string|null, isactive:boolean, code?:string, cluster?:string }} Department */
/** @typedef {{ id:number, firstname:string, lastname:string, othername?:string, email:string, phonenumber:string, department:string, team:string, workerrole:string, cluster?:string, district_sub_team?:string, status?:string, isactive?:boolean }} Worker */

// ─── Departments ─────────────────────────────────────────────────
export const departmentsApi = {
  /** @returns {Promise<Department[]>} */
  list: async () => {
    const r = await apiRequest("GET", "/api/departments");
    return Array.isArray(r?.data) ? r.data : [];
  },
  /** @param {Partial<Department>} dept */
  create: (dept) => {
    const payload = {
      name: dept.name,
      team: dept.team,
      route: dept.route,
      code: dept.code,
      isactive: dept.isactive,
    };
    if (dept.cluster !== undefined && dept.cluster !== null && String(dept.cluster).trim() !== "") {
      payload.cluster = String(dept.cluster).trim();
    }
    return apiRequest("POST", "/api/departments", payload);
  },
  /** @param {Partial<Department> & { id:number }} dept */
  update: (dept) => {
    const payload = {
      id: dept.id,
      name: dept.name,
      team: dept.team,
      route: dept.route,
      code: dept.code,
      isactive: dept.isactive,
    };
    if (dept.cluster !== undefined && dept.cluster !== null && String(dept.cluster).trim() !== "") {
      payload.cluster = String(dept.cluster).trim();
    }
    return apiRequest("PUT", "/api/departments", payload);
  },
  toggleStatus: (id, isactive) =>
    apiRequest("PUT", "/api/departments/toggle-status", { id, isactive }),
  remove: (id) => apiRequest("DELETE", `/api/departments/${id}/delete`),
};

const normalizeWorkerClusterPayload = (worker = {}) => {
  const payload = { ...worker };
  const clusterVal = (worker.cluster || worker.district_sub_team || "").trim();
  if (clusterVal) {
    payload.cluster = clusterVal;
    payload.district_sub_team = clusterVal;
  } else {
    delete payload.cluster;
    delete payload.district_sub_team;
  }
  return payload;
};

// ─── Workers ─────────────────────────────────────────────────────
export const workersApi = {
  /**
   * Super admin: search/filter workers
   * @param {{ team?:string, department?:string, status?:string, search?:string, page?:number, limit?:number, sortBy?:string }} params
   */
  list: (params = {}) => apiRequest("GET", "/api/super/admin/workers", params),

  /** @param {Partial<Worker>} worker */
  create: (worker) => apiRequest("POST", "/api/super/admin/workers", normalizeWorkerClusterPayload(worker)),

  /** @param {Partial<Worker> & { id:number }} updates */
  update: (updates) => {
    const payload = { ...updates };
    if (updates.cluster !== undefined || updates.district_sub_team !== undefined) {
      const clusterVal = (updates.cluster || updates.district_sub_team || "").trim();
      if (clusterVal) {
        payload.cluster = clusterVal;
        payload.district_sub_team = clusterVal;
      } else {
        delete payload.cluster;
        delete payload.district_sub_team;
      }
    }
    return apiRequest("PUT", "/api/super/admin/workers", payload);
  },

  /** Hard delete (super-admin only) */
  hardDelete: (workerId) => apiRequest("DELETE", `/api/super/admin/${workerId}/workers`),

  /** Soft delete request → goes to PENDING_DELETE */
  requestDelete: (workerid, deleteData) =>
    apiRequest("PUT", "/api/workers/requestDelete", { workerid, deleteData }),

  /** Approve a PENDING_ADD worker */
  approve: (workerId) => apiRequest("PUT", `/api/super/admin/${workerId}/workers/approve`),

  /** Public add - goes to PENDING_ADD */
  addPublic: (worker) => apiRequest("POST", "/api/workers/add", normalizeWorkerClusterPayload(worker), undefined, false),
};

// ─── Auth ────────────────────────────────────────────────────────
export const authApi = {
  signin: (credentials) => apiRequest("POST", "/auth/signin", credentials, undefined, false),
};

const api = { departmentsApi, workersApi, authApi };
export default api;
