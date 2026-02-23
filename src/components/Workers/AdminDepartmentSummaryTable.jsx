import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { getDepartmentRoute } from "../../utils/routeObject";

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

  const sortedRows = useMemo(() => {
    const items = Array.isArray(rows) ? [...rows] : [];
    if (!sortConfig.key) return items;

    return items.sort((a, b) => {
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
  }, [rows, sortConfig]);

  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
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

  if (!hasRows) return null;

  return (
    <table className="min-w-full divide-y divide-gray-300">
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
      <tbody className="divide-y divide-gray-200">
        {sortedRows.map((item, index) => {
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
  );
}

