import { fetchDepartments } from "./departments";
import { fetchWorkers } from "./workers";
import { getUserRole, canAccessDepartment } from "../utils/getUserRole";
import { getDepartmentEntry, getEffectiveRouteList, isSameDepartment } from "../utils/routeObject";

const idOf = (worker) => worker?.id ?? worker?.worker_id ?? worker?.workerId ?? worker?.workerid;

/** Validate placement using API data, never an inferred historical-name alias. */
export async function resolveWorkerForEditing(worker) {
  const role = getUserRole();
  if (role.isSuperAdmin || role.isChurchAdmin) return worker;
  if (!role.user || idOf(worker) == null) return null;
  await fetchDepartments();
  const department = worker.department || worker.department_name;
  if (getDepartmentEntry(department) && canAccessDepartment(department)) return worker;

  // Details may contain a stale department name. Find the same worker ID in
  // the authenticated roster, whose placement uses the API's current names.
  const team = typeof role.user.team === "string" ? role.user.team : role.user.team?.name;
  const scopes = role.isTeamAdmin && team ? [team] :
    [...new Set(getEffectiveRouteList().filter((entry) => canAccessDepartment(entry.department))
      .map((entry) => entry.department))];
  for (const scope of scopes) {
    const roster = await fetchWorkers(scope);
    const current = roster.find((entry) => String(idOf(entry)) === String(idOf(worker)));
    if (!current || !canAccessDepartment(current.department)) continue;
    if (role.isTeamAdmin && !isSameDepartment(current.team, team)) continue;
    // Use the roster API's exact name and team; preserve details-only fields.
    return { ...worker, department: getDepartmentEntry(current.department)?.department ?? current.department,
      team: current.team ?? worker.team };
  }
  return null;
}
