import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../utils/apiClient", () => ({
  default: apiRequestMock,
}));

vi.mock("./hub/teams", () => ({
  fetchHubTeams: vi.fn().mockResolvedValue([]),
}));

import { clearDepartmentsCache, fetchTeamsAndDepartmentsForFilter } from "./departments";

describe("fetchTeamsAndDepartmentsForFilter", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    clearDepartmentsCache();
  });

  it("offers only the API's departments once the API returns some", async () => {
    apiRequestMock.mockResolvedValue({
      data: [
        { id: 1, name: "Rehoboth Community", team: "Districts", route: "/rehoboth", isactive: true },
        { id: 2, name: "Sound", team: "Programs", route: "/sound", isactive: true },
      ],
    });

    const { departments, departmentsByTeam } = await fetchTeamsAndDepartmentsForFilter();

    expect(departmentsByTeam.Districts).toEqual(["Rehoboth Community"]);
    // A built-in department the API no longer returns (deleted) stays out.
    expect(departments.map((d) => d.value)).not.toContain("Bethel Community");
  });

  it("falls back to the built-in list when the API returns no departments", async () => {
    apiRequestMock.mockResolvedValue({ data: [] });

    const { departmentsByTeam } = await fetchTeamsAndDepartmentsForFilter();

    expect(departmentsByTeam.Districts).toContain("Bethel Community");
  });
});
