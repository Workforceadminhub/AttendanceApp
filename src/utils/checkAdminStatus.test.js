import { afterEach, describe, expect, it } from "vitest";
import { checkAdminStatus } from "./checkAdminStatus";

function setUser(user) {
  sessionStorage.setItem("authUser", JSON.stringify(user));
}

afterEach(() => sessionStorage.clear());

describe("checkAdminStatus", () => {
  it("gives a Team Admin the admin view on their team route", () => {
    setUser({ role: "admin", team: "Ministry", permissions: ["Sound", "Ushering"] });
    expect(checkAdminStatus("/dashboard/admin/ministry")).toBe(true);
  });

  it("keeps a Team Admin on the department view for a department route", () => {
    setUser({ role: "admin", team: "Ministry" });
    expect(checkAdminStatus("/attendance/sound")).toBe(false);
  });

  it("does not grant the admin view to an HOD from the URL", () => {
    setUser({ role: "HOD", department: "Sound" });
    expect(checkAdminStatus("/dashboard/admin/ministry")).toBe(false);
  });

  it("treats Church Admins as admins on any route", () => {
    setUser({ permissionLevel: "CHURCH_ADMIN" });
    expect(checkAdminStatus("/dashboard/sound")).toBe(true);
  });
});
