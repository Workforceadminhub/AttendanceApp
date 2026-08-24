import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import NewWorker from "./NewWorker";

vi.mock("../../services/departments", () => ({
  fetchTeamsAndDepartmentsForFilter: vi.fn().mockResolvedValue({
    teams: [{ value: "Membership" }],
    departments: ["New Converts"],
    departmentsByTeam: { Membership: ["New Converts"] },
  }),
}));

vi.mock("../../services/workers", () => ({
  addNewWorker: vi.fn(),
}));

describe("New worker registration accessibility", () => {
  it("has no critical or serious axe violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <NewWorker />
      </MemoryRouter>
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const blocking = results.violations.filter(({ impact }) =>
      ["critical", "serious"].includes(impact)
    );

    expect(blocking).toEqual([]);
  });
});
