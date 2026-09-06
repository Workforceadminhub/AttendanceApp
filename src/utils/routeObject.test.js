import { afterEach, describe, expect, it } from "vitest";
import { getAdminSelectOptions, setDynamicDepartments } from "./routeObject";

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
