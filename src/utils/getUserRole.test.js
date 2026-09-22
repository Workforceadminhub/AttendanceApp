import { afterEach, describe, expect, it } from "vitest";
import { getUserRole, PERMISSION_LEVELS } from "./getUserRole";

function setUser(user) {
  sessionStorage.setItem("authUser", JSON.stringify(user));
}

afterEach(() => sessionStorage.clear());

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
