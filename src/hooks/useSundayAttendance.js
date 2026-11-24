import { useQuery } from "@tanstack/react-query";
import { fetchAttendance } from "../services/attendance";
import { getNextSunday, getSundaysInYear } from "../utils/getDate";
import { queryKeys } from "../queries/queryKeys";

/** Parse "Sunday - d/m/y" to yyyy-MM-dd */
export function sundayToYYYYMMDD(dateStr) {
  if (!dateStr || !/^Sunday - \d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return null;
  const [day, month, year] = dateStr.split(" - ")[1].split("/").map((p) => parseInt(p, 10));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Run `worker` over `items` with at most `concurrency` calls in flight. */
export async function mapWithConcurrency(items, worker, concurrency = 4) {
  const results = new Array(items.length);
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run())
  );
  return results;
}

// Shared cap for attendance fan-outs: unbounded parallel requests saturate
// Lambda concurrency and come back 503.
const CONCURRENCY = 4;

// A Sunday that still fails after retries is left empty rather than failing
// the whole chart.
async function fetchWithRetry(activeDate, permissions, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchAttendance(activeDate, null, null, permissions);
    } catch {
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** i));
    }
  }
  return null;
}

/**
 * GET /api/attendance for each Sunday of `month` ("yyyy-MM") up to the coming
 * Sunday: the 4 or 5 requests the selected month needs, not the whole year.
 *
 * The response depends only on the date and the user's permissions, not on
 * the page asking, so DepartmentDetail and AdminSummaryDetail share this one
 * cached query. Each page filters the lists for its own department(s);
 * switching department or team reuses the cached month.
 *
 * Resolves to [{ activeDate, dateStr, list }] in chronological order.
 */
export function useSundayAttendance(month, permissions, { enabled = true } = {}) {
  const permissionsKey = [...(permissions || [])].sort().join("|");
  return useQuery({
    queryKey: queryKeys.sundayAttendance(month, permissionsKey),
    queryFn: async () => {
      const cutoff = sundayToYYYYMMDD(getNextSunday()) || "";
      const sundays = getSundaysInYear(Number(month.slice(0, 4))).filter((s) => {
        const d = sundayToYYYYMMDD(s);
        return d && d.startsWith(month) && d <= cutoff;
      });
      const results = await mapWithConcurrency(
        sundays,
        (activeDate) => fetchWithRetry(activeDate, permissions),
        CONCURRENCY
      );
      return sundays
        .map((activeDate, i) => ({
          activeDate,
          dateStr: sundayToYYYYMMDD(activeDate) || "",
          list: Array.isArray(results[i]) ? results[i] : [],
        }))
        .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    },
    enabled,
  });
}
