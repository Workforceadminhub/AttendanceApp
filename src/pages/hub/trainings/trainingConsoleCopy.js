export function trainingConsoleCopy(roleInfo, scope) {
  const { isSuperAdmin, isChurchAdmin, isSubTeamAdmin, isTeamAdmin, user } = roleInfo;
  if (isSuperAdmin) return {
    label: "Super Admin Console",
    description: "Manage training modules, cohorts, and certification metrics across your authorized campuses.",
  };
  if (isChurchAdmin) return {
    label: "Church Admin Console",
    description: "Manage training modules, cohorts, and certification metrics for your campus.",
  };
  if (isSubTeamAdmin) return {
    label: "Sub-Team Admin Console",
    description: `Manage training modules, cohorts, and certification metrics for ${scope?.departmentNames?.length ? scope.departmentNames.join(", ") : "your assigned departments"}.`,
  };
  if (isTeamAdmin) return {
    label: "Team Admin Console",
    description: `Manage training modules, cohorts, and certification metrics for ${scope?.teamNames?.length ? scope.teamNames.join(", ") : (typeof user?.team === "string" ? user.team : user?.team?.name) || "your team"}.`,
  };
  return {
    label: "Training Console",
    description: "View training modules, cohorts, and certification metrics within your assigned scope.",
  };
}
