import { clearFilterCache } from "./filterCache";
import { clearSessionRoutes } from "./routeObject";

/** Fields required for routing, RBAC, and header display — nothing else from login. */
const SESSION_USER_KEYS = [
  "code",
  "department",
  "route",
  "permissionLevel",
  "assignedDepartments",
  "permissions",
  "team",
  "role",
  "firstname",
  "firstName",
  "lastname",
  "lastName",
  "fullname",
  "name",
  "email",
  "id",
  "sub",
  "workerId",
  "worker_id",
  "username",
];

/**
 * Strip login response down to the minimum needed client-side.
 * Avoids caching worker PII or other fields the backend may include.
 */
export function pickSessionUser(rawUser = {}, { permissionLevel, assignedDepartments } = {}) {
  const user = {};
  for (const key of SESSION_USER_KEYS) {
    const val = rawUser[key];
    if (val === undefined || val === null || val === "") continue;
    // Keep arrays (including empty permissions) and objects (e.g. team: { name }).
    if (Array.isArray(val) || (typeof val === "object" && val !== null)) {
      user[key] = val;
      continue;
    }
    user[key] = val;
  }
  if (permissionLevel) user.permissionLevel = permissionLevel;
  if (Array.isArray(assignedDepartments) && assignedDepartments.length > 0) {
    user.assignedDepartments = assignedDepartments;
  }
  return user;
}

export function persistSession(accessToken, rawUser, extras = {}) {
  if (!accessToken) return null;
  const authUser = pickSessionUser(rawUser, extras);
  sessionStorage.setItem("accessToken", accessToken);
  sessionStorage.setItem("authUser", JSON.stringify(authUser));
  return authUser;
}

export function getAccessToken() {
  return sessionStorage.getItem("accessToken");
}

export function getSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem("authUser") || "null");
  } catch {
    return null;
  }
}

/** Clear tokens only (e.g. expired session redirect). */
export function clearAuthTokens() {
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("authUser");
  sessionStorage.removeItem("refreshToken");
}

/** Full logout — tokens, route hints, and cached filters. */
export function logoutSession() {
  clearAuthTokens();
  clearSessionRoutes();
  clearFilterCache();
}
