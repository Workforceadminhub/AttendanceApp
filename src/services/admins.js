import apiRequest from "../utils/apiClient";

/**
 * Fetch all admin users
 * @returns {Promise<Array>} List of admin users
 */
export const fetchAdmins = async () => {
  try {
    const response = await apiRequest("GET", "/api/super/admin/admins");
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch admins");
    }
    return response.data || response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new admin user
 * @param {Object} data - Admin data
 * @param {string} data.code - Admin code
 * @param {string} data.role - Admin role (e.g. "admin", "HOD")
 * @param {string} data.route - Route path
 * @param {string} data.department - Department name
 * @param {string} data.team - Team name
 * @param {Array<string>} data.permissions - List of permissions
 * @returns {Promise<Object>} Created admin
 */
export const createAdmin = async (data) => {
  try {
    const response = await apiRequest("POST", "/api/super/admin/admins", {
      code: data.code,
      role: data.role,
      route: data.route,
      department: data.department,
      team: data.team,
      permissions: data.permissions,
    });
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to create admin");
    }
    return response.data || response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an admin user's editable fields (role and/or permissions).
 * Only updates fields that are provided.
 * @param {number} id - Admin ID
 * @param {Object} data - Fields to update
 * @param {string} [data.role] - New role (optional)
 * @param {Array<string>} [data.permissions] - New permissions (optional)
 * @returns {Promise<Object>} Updated admin
 */
export const updateAdmin = async (id, data) => {
  try {
    const results = {};
    if (data.role !== undefined) {
      results.role = await assignRole(id, data.role);
    }
    if (data.permissions !== undefined) {
      results.permissions = await assignPermissions(id, data.permissions);
    }
    return results;
  } catch (error) {
    throw error;
  }
};

/**
 * Assign permissions to an admin user
 * @param {number} id - Admin ID
 * @param {Array<string>} permissions - List of permissions
 * @returns {Promise<Object>} Updated admin
 */
export const assignPermissions = async (id, permissions) => {
  try {
    const response = await apiRequest(
      "PUT",
      `/api/super/admin/${id}/permissions`,
      { permissions }
    );
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to assign permissions");
    }
    return response.data || response;
  } catch (error) {
    throw error;
  }
};

/**
 * Assign a role to an admin user
 * @param {number} id - Admin ID
 * @param {string} role - Role to assign
 * @returns {Promise<Object>} Updated admin
 */
export const assignRole = async (id, role) => {
  try {
    const response = await apiRequest(
      "PUT",
      `/api/super/admin/${id}/role`,
      { role }
    );
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to assign role");
    }
    return response.data || response;
  } catch (error) {
    throw error;
  }
};

/**
 * Invite an admin by email (Email RBAC).
 * Backend upserts access, sets a temp password with mustResetPassword=true,
 * and emails the invite.
 * @param {Object} data
 * @param {string} data.email - Invitee email (required)
 * @param {string} [data.team] - Team name
 * @param {string} [data.department] - Department name
 * @param {Array<string>} [data.permissions] - List of permissions
 * @param {string} [data.role] - Role (e.g. "HOD")
 * @param {string} [data.userinfo] - Optional display info
 * @returns {Promise<Object>} Invite result
 */
export const inviteAdminByEmail = async (data) => {
  const body = { email: data.email };
  if (data.team) body.team = data.team;
  if (data.department) body.department = data.department;
  if (Array.isArray(data.permissions)) body.permissions = data.permissions;
  if (data.role) body.role = data.role;
  if (data.userinfo) body.userinfo = data.userinfo;

  const response = await apiRequest(
    "POST",
    "/api/super/admin/admins/invite",
    body
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to send invite");
  }
  return response.data || response;
};

/**
 * Assign team/department access keyed by email (Email RBAC).
 * Upserts team, permissions, role, department for the email.
 * Does not set a password (use inviteAdminByEmail for that).
 * @param {Object} data
 * @param {string} data.email - Target email (required)
 * @param {string} [data.team] - Team name
 * @param {string} [data.department] - Department name
 * @param {Array<string>} [data.permissions] - List of permissions
 * @param {string} [data.role] - Role
 * @param {boolean} [data.isactive] - Active flag
 * @returns {Promise<Object>} Updated access
 */
export const assignAccessByEmail = async (data) => {
  const body = { email: data.email };
  if (data.team) body.team = data.team;
  if (data.department) body.department = data.department;
  if (Array.isArray(data.permissions)) body.permissions = data.permissions;
  if (data.role) body.role = data.role;
  if (typeof data.isactive === "boolean") body.isactive = data.isactive;

  const response = await apiRequest(
    "PUT",
    "/api/super/admin/by-email/access",
    body
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to assign access");
  }
  return response.data || response;
};

/**
 * Delete an admin user
 * @param {number} id - Admin ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteAdmin = async (id) => {
  try {
    const response = await apiRequest(
      "DELETE",
      `/api/super/admin/${id}`
    );
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to delete admin");
    }
    return response.data || response;
  } catch (error) {
    throw error;
  }
};
