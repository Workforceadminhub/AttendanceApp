import { useEffect, useMemo, useState } from "react";
import { teamsAndDepartments, filterDepartmentsForDistrictSubTeam } from "../../utils/teams";
import { getEffectiveRouteList } from "../../utils/routeObject";
import { fetchTeamsAndDepartmentsForFilter } from "../../services/departments";
import { isDistrictsTeam } from "../../utils/meeting/validation";

const isCampusPlaceholder = (val) => {
  const norm = String(val || "").trim().toLowerCase();
  return !norm || norm === "all" || norm === "gbagada campus" || norm === "gbagada";
};

/**
 * Team and department options for the present-flow forms, sourced from the API
 * with a static fallback. Department options for Districts are narrowed by the
 * selected District/Sub-team cluster.
 */
export default function useLiveTeamDepartments(selectedTeam, districtSubTeam = "") {
  const [filterData, setFilterData] = useState({ departmentsByTeam: {}, teams: [] });

  useEffect(() => {
    let mounted = true;
    fetchTeamsAndDepartmentsForFilter()
      .then((data) => {
        if (mounted && data) setFilterData(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const teamOptions = useMemo(() => {
    const fromApi = (filterData.teams || [])
      .map((t) => t?.value || t?.label || t)
      .filter((val) => !isCampusPlaceholder(val));
    if (fromApi.length) return fromApi;
    return teamsAndDepartments.map((t) => t.team).filter((val) => !isCampusPlaceholder(val));
  }, [filterData]);

  const departmentOptions = useMemo(() => {
    if (!selectedTeam) return [];
    const byTeam = filterData.departmentsByTeam || {};
    const fromApi =
      byTeam[selectedTeam] ||
      (isDistrictsTeam(selectedTeam) ? byTeam.District || byTeam.Districts : null) ||
      [];
    const source = fromApi.length
      ? fromApi
      : getEffectiveRouteList()
          .filter((r) => r.team === selectedTeam || (isDistrictsTeam(selectedTeam) && isDistrictsTeam(r.team)))
          .map((r) => r.department)
          .filter(Boolean);
    return filterDepartmentsForDistrictSubTeam(source, selectedTeam, districtSubTeam);
  }, [selectedTeam, districtSubTeam, filterData]);

  return { teamOptions, departmentOptions };
}
