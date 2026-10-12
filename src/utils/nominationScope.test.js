import { describe, expect, it } from "vitest";
import { nominationDepartments } from "./nominationScope";
const routes = [
  { department: "Sound", route: "/sound", team: "Programs" },
  { department: "Protocol", route: "/protocol", team: "Programs" },
  { department: "Workforce Admin", route: "/wadata", team: "Ministry" },
];
describe("nomination department authorization", () => {
  it("restricts a team admin to their team even with a broad permissions list", () => {
    expect(nominationDepartments({ isTeamAdmin: true, user: { team: "Programs", permissions: ["Workforce Admin"] } }, [...routes, {department:"Programs", team:"Programs", route:"/admin/programs"}])).toEqual(["Protocol", "Sound"]);
  });
  it("accepts assigned department routes for subteam admins and keeps HODs in their department", () => {
    expect(nominationDepartments({ isSubTeamAdmin: true, assignedDepartments: ["/sound"], user: {} }, routes)).toEqual(["Sound"]);
    expect(nominationDepartments({ user: { department: "Sound" } }, routes)).toEqual(["Sound"]);
  });
  it("intersects role scope with narrower RBAC department and team filters", () => {
    expect(nominationDepartments({ isTeamAdmin: true, user: { team: "Programs" } }, routes, { departmentNames: ["Sound"] })).toEqual(["Sound"]);
    expect(nominationDepartments({ isTeamAdmin: true, user: { team: "Programs" } }, routes, { teamNames: ["Ministry"] })).toEqual([]);
  });
  it("preserves campus admin access", () => {
    expect(nominationDepartments({ isChurchAdmin: true }, routes)).toEqual(["Protocol", "Sound", "Workforce Admin"]);
    expect(nominationDepartments({ isSuperAdmin: true }, routes)).toHaveLength(3);
  });
});
