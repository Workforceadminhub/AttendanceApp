import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

/**
 * Department permissions picker grouped by team.
 *
 * Props:
 * - value: string[] of selected department names
 * - onChange: (nextPermissions: string[]) => void
 * - groups: Array<{ team: string, departments: string[] }>
 * - label: optional heading text (default "Permissions")
 */
export default function PermissionsTreePicker({
  value,
  onChange,
  groups,
  label = "Permissions",
}) {
  const selected = Array.isArray(value) ? value : [];
  const allDepts = groups.flatMap((g) => g.departments);
  const allChecked = allDepts.length > 0 && allDepts.every((d) => selected.includes(d));

  // Collapsed state per team; teams default to collapsed until toggled
  const [collapsed, setCollapsed] = useState({});
  const isCollapsed = (team) => collapsed[team] ?? true;

  const toggleCollapse = (team) => {
    setCollapsed((prev) => ({ ...prev, [team]: !(prev[team] ?? true) }));
  };

  const handleHeaderKeyDown = (event, team) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleCollapse(team);
    }
  };

  const toggleDept = (dept) => {
    onChange(
      selected.includes(dept)
        ? selected.filter((p) => p !== dept)
        : [...selected, dept]
    );
  };

  const toggleTeam = (teamDepts, allTeamChecked) => {
    onChange(
      allTeamChecked
        ? selected.filter((p) => !teamDepts.includes(p))
        : [...new Set([...selected, ...teamDepts])]
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-ink-700">{label}</label>
        <button
          type="button"
          onClick={() => onChange(allChecked ? [] : [...allDepts])}
          className="text-xs text-ink-900 hover:text-ink-900 font-medium"
        >
          {allChecked ? "Uncheck All" : "Check All"}
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
        {groups.map((group) => {
          const teamDepts = group.departments;
          const allTeamChecked = teamDepts.every((d) => selected.includes(d));
          const teamCollapsed = isCollapsed(group.team);
          const checkedCount = teamDepts.filter((d) => selected.includes(d)).length;
          return (
            <div key={group.team} className="mb-1">
              <div
                role="button"
                tabIndex={0}
                aria-expanded={!teamCollapsed}
                onClick={() => toggleCollapse(group.team)}
                onKeyDown={(e) => handleHeaderKeyDown(e, group.team)}
                className="flex items-center justify-between bg-cream rounded px-2 py-1.5 cursor-pointer select-none hover:bg-cream-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-900"
              >
                <div className="flex items-center">
                  {teamCollapsed ? (
                    <ChevronRightIcon className="h-3.5 w-3.5 mr-1.5 text-ink-500" />
                  ) : (
                    <ChevronDownIcon className="h-3.5 w-3.5 mr-1.5 text-ink-500" />
                  )}
                  <span className="text-xs font-semibold text-ink-600 uppercase tracking-wide">
                    {group.team}
                  </span>
                  <span className="ml-1.5 text-xs text-ink-400">
                    ({checkedCount}/{teamDepts.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTeam(teamDepts, allTeamChecked);
                  }}
                  className="text-xs text-ink-900 hover:text-ink-900 font-medium"
                >
                  {allTeamChecked ? "Uncheck" : "Check All"}
                </button>
              </div>
              {!teamCollapsed && (
                <div className="ml-5 mt-1 space-y-0.5">
                  {teamDepts.map((dept) => (
                    <label
                      key={dept}
                      className="flex items-center space-x-2 py-0.5 px-2 hover:bg-cream rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(dept)}
                        onChange={() => toggleDept(dept)}
                        className="h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded"
                      />
                      <span className="text-sm text-ink-700">{dept}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
