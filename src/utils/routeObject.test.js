import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEffectiveRouteList, departmentNameForApi, getAdminSelectOptions, getDepartmentEntry, getDepartmentNameFromRoute, getDepartmentRoute, getTeamForDepartment, isSameDepartment, setDynamicDepartments } from "./routeObject";

afterEach(() => setDynamicDepartments(null));
beforeEach(() => setDynamicDepartments([{name:"Call Centre", route:"/api-call", team:"Ministry"}]));

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

describe("API department authority", () => {
  it("uses arbitrary API names and routes without inferring legacy aliases", () => {
    setDynamicDepartments([{ name: "API New Name", route: "/opaque-route", team: "API Team" }]);
    expect(getEffectiveRouteList()).toEqual([{ department: "API New Name", route: "/opaque-route", team: "API Team" }]);
    expect(getDepartmentNameFromRoute("opaque-route")).toBe("API New Name");
    expect(getDepartmentRoute("API New Name")).toBe("opaque-route");
    expect(getTeamForDepartment("API New Name")).toBe("API Team");
    expect(isSameDepartment("API New Name", "/opaque-route")).toBe(true);
    expect(getDepartmentEntry("Ushering - Tosin")).toBeNull();
    expect(isSameDepartment("API New Name", "Old Name")).toBe(false);
  });

  it("keeps an empty API catalog empty, with no built-in department fallback", () => {
    setDynamicDepartments([]);
    expect(getEffectiveRouteList()).toEqual([]);
    expect(getDepartmentEntry("Sound")).toBeNull();
  });

  it("preserves exact API names in outgoing requests", () => {
    setDynamicDepartments([{name:"Pastoral Leaders", route:"/api-pastoral", team:"API Team"}]);
    expect(departmentNameForApi("Pastoral Leaders")).toBe("Pastoral Leaders");
  });

  it("does not expose inactive API entries", () => {
    setDynamicDepartments([{ name: "API New Name", route: "/opaque-route", team: "API Team", isactive: false }]);
    expect(getDepartmentEntry("API New Name")).toBeNull();
    expect(getDepartmentEntry("opaque-route")).toBeNull();
  });
});
