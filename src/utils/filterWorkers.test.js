import { describe, expect, it } from "vitest";
import { filterWorkersByPlacement } from "./filterWorkers";

const workers = [
  { id: 1, department: "Workforce Admin", team: "Ministry" },
  { id: 2, department: "Kids Support", team: "Ministry" },
  { id: 3, department: "Workforce Admin", team: "Programs" },
];

describe("filterWorkersByPlacement", () => {
  it("requires department and team filters to both match", () => {
    expect(
      filterWorkersByPlacement(workers, {
        department: "Workforce Admin",
        team: "Ministry",
      }).map((worker) => worker.id)
    ).toEqual([1]);
  });

  it("matches values case-insensitively and ignores surrounding whitespace", () => {
    expect(
      filterWorkersByPlacement(workers, {
        department: " workforce admin ",
        team: "MINISTRY",
      }).map((worker) => worker.id)
    ).toEqual([1]);
  });

  it("does not constrain fields set to All", () => {
    expect(
      filterWorkersByPlacement(workers, {
        department: "All",
        team: "Ministry",
      }).map((worker) => worker.id)
    ).toEqual([1, 2]);
  });
});
