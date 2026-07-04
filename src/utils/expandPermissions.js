/**
 * Permission expansion: if a user's `permissions` array is just a role name
 * (e.g. ["Super Admin"]) the backend won't honor it as a department allowlist
 * and silently scopes results to the user's JWT team. Expand role-only
 * permissions into the full set of dept/team names the role implies.
 *
 * Source of truth for the expanded list: the live `/api/departments` response,
 * which is already cached by DepartmentsProvider. We append a few constant
 * names ("Super Admin", "Church Admin", "Districts", "Senior Leadership", etc.)
 * that are valid permission tokens but aren't departments per se.
 *
 * Until the backend signin handler populates `permissions` correctly, every
 * API call site that currently does `permissions = authUser?.permissions ?? []`
 * should switch to `permissions = expandPermissions(authUser, departments)`.
 */

import { getEffectiveRouteList } from "./routeObject";

// Role names + team aggregate names that aren't departments but are valid
// permission tokens the backend recognizes.
const META_TOKENS = [
  "Super Admin",
  "Church Admin",
  "Districts",
  "General Service",
  "Interactive Groups",
  "Maturity",
  "Membership",
  "Ministry",
  "Mission",
  "NLP",
  "Next Gen",
  "Programs",
  "Senior Leadership",
  "Pastoral leaders", // alternate casing seen in backend
];

/**
 * Returns an effective permissions array for API calls.
 *   - If `authUser.permissions` already looks like an explicit dept allowlist
 *     (more than ~3 items, includes department names not just role names),
 *     return as-is.
 *   - If it's just a role name like ["Super Admin"], expand to all known
 *     department names (from getEffectiveRouteList()) plus META_TOKENS.
 *
 * @param {{ permissions?: string[], department?: string }} authUser
 * @returns {string[]}
 */
export function expandPermissions(authUser) {
  const raw = Array.isArray(authUser?.permissions) ? authUser.permissions : [];

  // Campus-wide roles always get the full expansion. Their stored permissions
  // array may be a stale or partial allowlist (e.g. only Ministry departments
  // from a previous role), which would silently scope the whole app down.
  const roleRaw = String(authUser?.role || "").toLowerCase().replace(/[\s_]/g, "-");
  const isSuper =
    roleRaw === "super-admin" ||
    roleRaw === "superadmin" ||
    authUser?.permissionLevel === "SUPER_ADMIN" ||
    authUser?.department === "Super Admin" ||
    raw.includes("Super Admin");
  const isChurch =
    roleRaw === "church-admin" ||
    roleRaw === "churchadmin" ||
    authUser?.permissionLevel === "CHURCH_ADMIN" ||
    authUser?.department === "Church Admin" ||
    raw.includes("Church Admin");

  if (!isSuper && !isChurch) return raw;

  const allDepts = getEffectiveRouteList()
    .map((r) => r.department)
    .filter(Boolean);

  // Dedup
  const set = new Set([...allDepts, ...META_TOKENS]);
  return Array.from(set);
}

export default expandPermissions;
