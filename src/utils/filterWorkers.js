const normalizeFilterValue = (value) => String(value ?? "").trim().toLowerCase();

/**
 * Enforce worker filters as an intersection. This is intentionally applied to
 * API results as well, because the workers endpoint may treat multiple query
 * parameters as alternatives instead of requiring every selected value.
 */
export function filterWorkersByPlacement(workers, filters = {}) {
  const selectedDepartment = normalizeFilterValue(filters.department);
  const selectedTeam = normalizeFilterValue(filters.team);

  const hasDepartmentFilter = selectedDepartment && selectedDepartment !== "all";
  const hasTeamFilter = selectedTeam && selectedTeam !== "all";

  return (Array.isArray(workers) ? workers : []).filter((worker) => {
    const matchesDepartment =
      !hasDepartmentFilter ||
      normalizeFilterValue(worker?.department) === selectedDepartment;
    const matchesTeam =
      !hasTeamFilter || normalizeFilterValue(worker?.team) === selectedTeam;

    return matchesDepartment && matchesTeam;
  });
}
