import { getUserRole, getUserRoleString } from "../../utils/getUserRole";

/**
 * Declarative permission gate.
 *
 *   <RequirePermission level="SUPER_ADMIN">
 *     <DangerousButton />
 *   </RequirePermission>
 *
 *   <IfRole anyOf={["SUPER_ADMIN", "CHURCH_ADMIN"]}>
 *     <AdminPanel />
 *   </IfRole>
 *
 * Replaces scattered `if (isSuperAdmin)` / `if (user.role === "...")` checks
 * with a single auditable surface. Easier to grep and review.
 */

const PERMISSION_RANK = {
  HOD: 1,
  SUB_TEAM_ADMIN: 2,
  TEAM_ADMIN: 3,
  CHURCH_ADMIN: 4,
  SUPER_ADMIN: 5,
};

/**
 * Renders children only if the current user is at or above the given level.
 * Optional `fallback` rendered otherwise.
 */
export function RequirePermission({ level, fallback = null, children }) {
  const role = getUserRoleString();
  if (!role) return fallback;
  const userRank = PERMISSION_RANK[role] ?? 0;
  const requiredRank = PERMISSION_RANK[level] ?? 0;
  if (userRank < requiredRank) return fallback;
  return <>{children}</>;
}

/**
 * Renders children if the user matches ANY of the listed roles.
 *   <IfRole anyOf={["SUPER_ADMIN", "CHURCH_ADMIN"]}>...</IfRole>
 *   <IfRole not="HOD">...</IfRole>
 */
export function IfRole({ anyOf, not, fallback = null, children }) {
  const role = getUserRoleString();
  if (anyOf && Array.isArray(anyOf)) {
    if (!role || !anyOf.includes(role)) return fallback;
  }
  if (not && role === not) return fallback;
  return <>{children}</>;
}

/**
 * Imperative escape hatch: returns booleans for use in conditional rendering
 * where a wrapper component would be awkward.
 *   const { isSuperAdmin, can } = usePermissions();
 *   {can("SUPER_ADMIN") && <X />}
 */
export function usePermissions() {
  const { isSuperAdmin, isChurchAdmin, isTeamAdmin, isSubTeamAdmin, isHOD, isAdmin } = getUserRole();
  const role = getUserRoleString();
  const userRank = PERMISSION_RANK[role] ?? 0;
  return {
    role,
    isSuperAdmin,
    isChurchAdmin,
    isTeamAdmin,
    isSubTeamAdmin,
    isHOD,
    isAdmin,
    can: (level) => userRank >= (PERMISSION_RANK[level] ?? 0),
  };
}

export default RequirePermission;
