/** Split a full name into its first word and the rest. */
export function splitName(fullName) {
  if (!fullName) return { firstName: "", lastName: "" };
  const [firstName = "", ...rest] = fullName.trim().split(" ");
  return { firstName, lastName: rest.join(" ") };
}

export const workerFirstName = (worker) => worker.firstname || splitName(worker.fullname).firstName;
export const workerLastName = (worker) => worker.lastname || splitName(worker.fullname).lastName;

const SORT_VALUE = {
  firstname: workerFirstName,
  lastname: workerLastName,
  role: (w) => w.workerrole || w.role || "Worker",
  status: (w) => w.status || "ACTIVE",
};

/** Sorted copy of `rows`; numeric values compare as numbers, missing values go last. */
export function sortWorkers(rows, { key, direction = "asc" } = {}) {
  if (!key) return rows;
  const read = SORT_VALUE[key] ?? ((w) => w[key]);
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const aVal = read(a);
    const bVal = read(b);
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const aNum = Number(aVal);
    const bNum = Number(bVal);
    if (!isNaN(aNum) && !isNaN(bNum)) return sign * (aNum - bNum);
    return sign * String(aVal).localeCompare(String(bVal));
  });
}

/** One page of an already complete list, with the same pagination shape the API returns. */
export function paginateRows(rows, page, limit) {
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    data: rows.slice((current - 1) * limit, current * limit),
    pagination: { page: current, limit, total: rows.length, totalPages, hasNext: current < totalPages, hasPrev: current > 1 },
  };
}
