import { afterEach, describe, expect, it } from "vitest";
import { getAdminSelectOptions, getDepartmentEntry, getDepartmentNameFromRoute, getDepartmentRoute, getTeamForDepartment, isSameDepartment, setDynamicDepartments } from "./routeObject";

afterEach(() => setDynamicDepartments(null));

describe("admin department filter", () => {
  it("finds departments for legacy team accounts", () => {
    expect(getAdminSelectOptions(false, { department: "Ministry" }))
      .toContainEqual({ value: "Call Centre", label: "Call Centre" });
  });

  it("uses the parent team when department is an actual department", () => {
    expect(getAdminSelectOptions(false, { department: "Workforce Admin", team: "Ministry" }))
      .toContainEqual({ value: "Call Centre", label: "Call Centre" });
  });

  it("supports team objects and normalized names without exposing other departments", () => {
    const user = { team: { name: " ministry " }, permissions: [" call centre "] };
    expect(getAdminSelectOptions(false, { department: "Workforce Admin" }, user))
      .toEqual([{ value: "Call Centre", label: "Call Centre" }]);
  });

  it("does not fall back to every department for an unknown team", () => {
    expect(getAdminSelectOptions(false, null)).toEqual([]);
  });

  it("includes newly loaded departments and excludes inactive ones", () => {
    setDynamicDepartments([
      { name: "New Department", team: "New Team", isactive: true },
      { name: "Retired Department", team: "New Team", isactive: false },
    ]);
    expect(getAdminSelectOptions(false, { department: "Team Head", team: "New Team" }))
      .toEqual([{ value: "New Department", label: "New Department" }]);
  });
});

describe("renamed department identity", () => {
  it.each([
    ["Ushering - Tosin", "Ushering - Champions", "/usheringtosin"],
    ["Ushering - Bimpe", "Ushering - Bloom", "/usheringbimpe"],
    ["Ushering - Queen", "Ushering - Emerald", "/usheringqueen"],
    ["Ushering - Iyaanu", "Ushering - Alpha", "/usheringiyanu"],
    ["Ushering - Kofoworola", "Ushering - Diamond", "/usheringkofo"],
  ])("resolves %s to its current catalog entry", (oldName, newName, route) => {
    setDynamicDepartments([{ name: newName, route, team: "Programs" }]);
    expect(isSameDepartment(oldName, newName)).toBe(true);
    expect(isSameDepartment(oldName, route.slice(1))).toBe(true);
    expect(getDepartmentRoute(oldName)).toBe(route.slice(1));
    expect(getDepartmentNameFromRoute(oldName)).toBe(newName);
    expect(getTeamForDepartment(oldName)).toBe("Programs");
    expect(isSameDepartment(oldName, "Workforce Admin")).toBe(false);
  });

  it("does not resurrect inactive departments through legacy routes", () => {
    setDynamicDepartments([{ name: "Ushering - Champions", route: "/usheringtosin", team: "Programs", isactive: false }]);
    expect(getDepartmentEntry("Ushering - Tosin")).toBeNull();
    expect(getDepartmentEntry("usheringtosin")).toBeNull();
    expect(isSameDepartment("Ushering - Tosin", "Ushering - Champions")).toBe(false);
  });
});
