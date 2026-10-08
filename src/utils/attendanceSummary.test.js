import { describe, expect, it } from "vitest";
import { applyPendingPicks } from "./attendanceSummary";

const counts = { total: 10, present: 4, absent: 2, unmarked: 4 };

describe("applyPendingPicks", () => {
  it("moves each unsaved pick from the worker's saved status to the picked one", () => {
    const pickedFrom = new Map([
      [1, { status: "", scope: "s" }],
      [2, { status: "Absent", scope: "s" }],
      [3, { status: "", scope: "s" }],
    ]);
    const picks = [
      { workerid: 1, attendance: "Online" },
      { workerid: 2, attendance: "Present" },
      { workerid: 3, attendance: "Absent" },
    ];

    expect(applyPendingPicks(counts, picks, pickedFrom, "s")).toEqual({
      total: 10,
      present: 6,
      absent: 2,
      unmarked: 2,
    });
  });

  it("leaves out picks made in another scope and leaves the input alone", () => {
    const pickedFrom = new Map([[1, { status: "", scope: "other" }]]);

    expect(applyPendingPicks(counts, [{ workerid: 1, attendance: "Present" }], pickedFrom, "s")).toEqual(counts);
    expect(counts.present).toBe(4);
  });
});
