import { afterEach, describe, expect, it } from "vitest";
import { canAccessDepartment, canAccessDepartmentByRoute, getUserRole, PERMISSION_LEVELS } from "./getUserRole";
import { setDynamicDepartments } from "./routeObject";

function setUser(user) {
  sessionStorage.setItem("authUser", JSON.stringify(user));
}

afterEach(() => {
  sessionStorage.clear();
  setDynamicDepartments([]);
});

describe("training administrator role aliases", () => {
  it("treats a workforce admin role as an admin", () => {
    setUser({ role: "wf-admin" });
    expect(getUserRole()).toMatchObject({ isAdmin: true, isTeamAdmin: true, isHOD: false });
  });

  it("treats assistant HOD permission as a department leader", () => {
    setUser({ permissionLevel: PERMISSION_LEVELS.ASSISTANT_HOD });
    expect(getUserRole()).toMatchObject({ isAdmin: false, isHOD: true });
  });
});

describe("team administrator worker department access", () => {
  function programsAdmin(team = "Programs") {
    setUser({ role: "admin", department: "Programs", team });
  }

  it("allows legacy worker names through the renamed department's stable route", () => {
    programsAdmin();
    setDynamicDepartments([{ name: "Ushering - Champions", route: "/usheringtosin", team: "Programs" }]);
    expect(canAccessDepartment("Ushering - Tosin")).toBe(true);
    expect(canAccessDepartment("Ushering - Champions")).toBe(true);
    expect(canAccessDepartment("Workforce Admin")).toBe(false);
  });

  it("uses the current team when a legacy department has moved teams", () => {
    programsAdmin();
    setDynamicDepartments([{ name: "Ushering - Champions", route: "/usheringtosin", team: "Ministry" }]);
    expect(canAccessDepartment("Ushering - Tosin")).toBe(false);
  });

  it("normalizes department and team spelling and supports object team values", () => {
    programsAdmin({ name: " programs " });
    expect(canAccessDepartment(" sound ")).toBe(true);
    expect(canAccessDepartment("Unknown Department")).toBe(false);
  });

  it("does not expand HOD or subteam access to the entire team", () => {
    setUser({ permissionLevel: "HOD", department: "Sound", team: "Programs" });
    expect(canAccessDepartment("Sound")).toBe(true);
    expect(canAccessDepartment("Ushering - Champions")).toBe(false);
    setUser({ permissionLevel: "SUB_TEAM_ADMIN", department: "Sound", team: "Programs", assignedDepartments: ["Sound"] });
    expect(canAccessDepartment("Sound")).toBe(true);
    expect(canAccessDepartment("Ushering - Champions")).toBe(false);
  });

  it.each([
    { permissionLevel: "HOD", department: "Ushering - Tosin", route: "usheringtosin" },
    { permissionLevel: "SUB_TEAM_ADMIN", assignedDepartments: ["Ushering - Tosin"] },
    { permissionLevel: "SUB_TEAM_ADMIN", assignedDepartments: ["/usheringtosin"] },
    { role: "admin", team: "Programs" },
    { permissionLevel: "TEAM_ADMIN", team: { name: "Programs" } },
  ])("applies the same scope to old/new names and routes for $permissionLevel $role", (user) => {
    setDynamicDepartments([{ name: "Ushering - Champions", route: "/usheringtosin", team: "Programs" }]);
    setUser(user);
    for (const value of ["Ushering - Tosin", "Ushering - Champions", "usheringtosin", "/usheringtosin"]) {
      expect(canAccessDepartment(value)).toBe(true);
      expect(canAccessDepartmentByRoute(user, value)).toBe(true);
    }
    expect(canAccessDepartmentByRoute(user, "Workforce Admin")).toBe(false);
    expect(canAccessDepartment("Sound")).toBe(Boolean(user.team));
  });

  it("rejects blank, unknown and inactive department routes for team admins", () => {
    programsAdmin();
    setDynamicDepartments([{ name: "Ushering - Champions", route: "/usheringtosin", team: "Programs", isactive: false }]);
    for (const value of ["", "Unknown Department", "usheringtosin", "Ushering - Tosin"]) {
      expect(canAccessDepartmentByRoute(undefined, value)).toBe(false);
    }
  });
});
