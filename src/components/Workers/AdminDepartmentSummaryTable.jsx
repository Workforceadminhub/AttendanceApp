import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { getDepartmentRoute, getTeamForDepartment, routeObject } from "../../utils/routeObject";

// Stable team order: use order from routeObject, then "Other" last
const TEAM_ORDER = (() => {
  const seen = new Set();
  const order = [];
  routeObject.forEach((r) => {
    if (r.team && !seen.has(r.team)) {
      seen.add(r.team);
      order.push(r.team);
    }
  });
  return order;
})();

function sortRows(items, sortConfig, getSortableValue) {
  if (!sortConfig?.key) return items;
  return [...items].sort((a, b) => {
    const aValue = getSortableValue(a, sortConfig.key);
    const bValue = getSortableValue(b, sortConfig.key);
    if (aValue === null || aValue === undefined || aValue === "") return 1;
    if (bValue === null || bValue === undefined || bValue === "") return -1;
    const aNum = Number(aValue);
    const bNum = Number(bValue);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
    }
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
    if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
}

export default function AdminDepartmentSummaryTable({ rows, showLinks = true }) {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });
  const hasRows = Array.isArray(rows) && rows.length > 0;

  const getSortableValue = (item, key) => {
    switch (key) {
      case "department":
        return item.department || "";
      case "total":
        return item.total ?? 0;
      case "present":
        return item.present ?? 0;
      case "absent":
        return item.absent ?? 0;
      case "unfilled":
        return item.unfilled ?? 0;
      case "percentage": {
        if (typeof item.percentage === "number") return item.percentage;
        const num = parseFloat(String(item.percentage || "").replace("%", ""));
        return isNaN(num) ? 0 : num;
      }
      default:
        return item[key];
    }
  };

  const rowsByTeam = useMemo(() => {
    const items = Array.isArray(rows) ? rows : [];
    const map = new Map();
    items.forEach((item) => {
      const dept = item.department || item.department_name;
      const team = getTeamForDepartment(dept) || "Other";
      if (!map.has(team)) map.set(team, []);
      map.get(team).push({ ...item, department: dept });
    });
    return map;
  }, [rows]);

  const orderedTeams = useMemo(() => {
    const teams = Array.from(rowsByTeam.keys());
    return teams.sort((a, b) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      const i = TEAM_ORDER.indexOf(a);
      const j = TEAM_ORDER.indexOf(b);
      if (i === -1 && j === -1) return String(a).localeCompare(String(b));
      if (i === -1) return 1;
      if (j === -1) return -1;
      return i - j;
    });
  }, [rowsByTeam]);

  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return { key: columnKey, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key: columnKey, direction: "asc" };
    });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === "asc" ? (
      <ArrowUpIcon className="h-3 w-3 inline-block ml-1" />
    ) : (
      <ArrowDownIcon className="h-3 w-3 inline-block ml-1" />
    );
  };

  const tableHeader = (
    <thead>
      <tr>
        <th
          scope="col"
          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
        >
          S/N
        </th>
        <th
          scope="col"
          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
        >
          <button
            type="button"
            onClick={() => handleSort("department")}
            className="flex items-center hover:text-gray-700"
          >
            <span>Department</span>
            {getSortIcon("department")}
          </button>
        </th>
        <th
          scope="col"
          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
        >
          <button
            type="button"
            onClick={() => handleSort("total")}
            className="flex items-center hover:text-gray-700"
          >
            <span>Strength</span>
            {getSortIcon("total")}
          </button>
        </th>
        <th
          scope="col"
          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
        >
          <button
            type="button"
            onClick={() => handleSort("present")}
            className="flex items-center hover:text-gray-700"
          >
            <span>Present</span>
            {getSortIcon("present")}
          </button>
        </th>
        <th
          scope="col"
          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
        >
          <button
            type="button"
            onClick={() => handleSort("absent")}
            className="flex items-center hover:text-gray-700"
          >
            <span>Absent</span>
            {getSortIcon("absent")}
          </button>
        </th>
        <th
          scope="col"
          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
        >
          <button
            type="button"
            onClick={() => handleSort("unfilled")}
            className="flex items-center hover:text-gray-700"
          >
            <span>Unfilled</span>
            {getSortIcon("unfilled")}
          </button>
        </th>
        <th
          scope="col"
          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
        >
          <button
            type="button"
            onClick={() => handleSort("percentage")}
            className="flex items-center hover:text-gray-700"
          >
            <span>Percentage</span>
            {getSortIcon("percentage")}
          </button>
        </th>
      </tr>
    </thead>
  );

  if (!hasRows) return null;

  return (
    <div className="space-y-8">
      {orderedTeams.map((teamName) => {
        const teamRows = rowsByTeam.get(teamName) || [];
        const sortedTeamRows = sortRows(teamRows, sortConfig, getSortableValue);
        return (
          <div key={teamName}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{teamName}</h3>
            <table className="min-w-full divide-y divide-gray-300">
              {tableHeader}
              <tbody className="divide-y divide-gray-200">
                {sortedTeamRows.map((item, index) => {
                  const dept = item.department;
                  const deptRoute = dept ? getDepartmentRoute(dept) : null;
                  const linkHref =
                    dept && deptRoute
                      ? `/department/${deptRoute}`
                      : dept
                      ? `/department/${encodeURIComponent(dept)}`
                      : null;
                  return (
                    <tr key={item.id || `${dept || "row"}-${index}`}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {showLinks && linkHref ? (
                          <Link to={linkHref} className="text-blue-600 hover:underline">
                            {dept}
                          </Link>
                        ) : (
                          dept
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.total}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.present}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.absent}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.unfilled}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.percentage}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

