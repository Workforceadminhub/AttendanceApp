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

import {
  addDepartment,
  clearDepartmentsCache,
  fetchTeamsAndDepartmentsForFilter,
  updateDepartment,
} from "./departments";

describe("department cluster", () => {
  beforeEach(() => apiRequestMock.mockReset().mockResolvedValue({ data: {} }));

  it("sends the cluster when a community is added or updated", async () => {
    const community = { name: "New Community", team: "Districts", route: "/new", isactive: true, cluster: "Pastor Isaac Cluster" };

    await addDepartment(community);
    await updateDepartment({ id: 9, ...community });

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, "POST", "/api/departments", expect.objectContaining({ cluster: "Pastor Isaac Cluster" }));
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, "PUT", "/api/departments", expect.objectContaining({ id: 9, cluster: "Pastor Isaac Cluster" }));
  });

  it("leaves cluster out for departments that have none", async () => {
    await addDepartment({ name: "Sound", team: "Programs", route: "/sound", isactive: true });

    expect(apiRequestMock.mock.calls[0][2]).not.toHaveProperty("cluster");
  });
});

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

  it("leaves department options empty when the API returns no departments", async () => {
    apiRequestMock.mockResolvedValue({ data: [] });

    const { departmentsByTeam } = await fetchTeamsAndDepartmentsForFilter();

    expect(departmentsByTeam).toEqual({});
  });
});
