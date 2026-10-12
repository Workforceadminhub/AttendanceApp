import { isSameDepartment } from "./routeObject";

const valueOf = (value) => typeof value === "string" ? value : value?.name ?? value?.department ?? value?.route ?? "";
const matches = (value, entry) => isSameDepartment(valueOf(value), entry.department) ||
  String(valueOf(value)).replace(/^\//, "").toLowerCase() === String(entry.route).replace(/^\//, "").toLowerCase();

/** Intersect the user's role scope with any more restrictive RBAC scope. */
export function nominationDepartments(role, routes, scope) {
  const { user, isChurchAdmin, isSuperAdmin, isTeamAdmin, isSubTeamAdmin, assignedDepartments = [] } = role;
  const assigned = [...assignedDepartments, ...(user?.permissions ?? [])];
  return [...new Set(routes.filter((entry) => {
    if (!entry.department || String(entry.route || "").replace(/^\/+/, "").startsWith("admin/")) return false;
    const permitted = isChurchAdmin || isSuperAdmin || (isTeamAdmin
      ? isSameDepartment(valueOf(user?.team), valueOf(entry.team))
      : isSubTeamAdmin ? assigned.some((value) => matches(value, entry))
        : isSameDepartment(user?.department, entry.department));
    if (!permitted) return false;
    if (scope?.departmentNames?.length && !scope.departmentNames.some((value) => matches(value, entry))) return false;
    if (scope?.teamNames?.length && !scope.teamNames.some((value) => isSameDepartment(valueOf(value), valueOf(entry.team)))) return false;
    return true;
  }).map((entry) => entry.department))].sort();
}
