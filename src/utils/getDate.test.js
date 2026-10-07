import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { getMonthSundaysThrough } from "./getDate";

const days = (dates) => dates.map((d) => format(d, "yyyy-MM-dd"));

describe("getMonthSundaysThrough", () => {
  it("returns only the date itself when it is the month's first Sunday", () => {
    expect(days(getMonthSundaysThrough(new Date(2026, 9, 4)))).toEqual(["2026-10-04"]);
  });

  it("returns every Sunday of the month up to the date", () => {
    expect(days(getMonthSundaysThrough(new Date(2026, 8, 27)))).toEqual([
      "2026-09-06",
      "2026-09-13",
      "2026-09-20",
      "2026-09-27",
    ]);
  });

  it("includes the 1st when the month starts on a Sunday", () => {
    expect(days(getMonthSundaysThrough(new Date(2026, 10, 29)))).toEqual([
      "2026-11-01",
      "2026-11-08",
      "2026-11-15",
      "2026-11-22",
      "2026-11-29",
    ]);
  });

  it("returns nothing without a date", () => {
    expect(getMonthSundaysThrough(null)).toEqual([]);
  });
});
