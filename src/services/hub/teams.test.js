import { describe, expect, it } from "vitest";
import { normalizeTeamOptions } from "./teams";

describe("normalizeTeamOptions", () => {
  it("keeps Gbagada Campus when returned by the teams API", () => {
    expect(
      normalizeTeamOptions([
        "Districts",
        { name: "Gbagada Campus", display_name: "Gbagada Campus" },
      ])
    ).toEqual([
      { value: "Districts", label: "Districts" },
      { value: "Gbagada Campus", label: "Gbagada Campus" },
    ]);
  });
});
