import { describe, expect, it } from "vitest";
import { canSendBulkEmail } from "./bulkEmailAccess";
import { pickSessionUser } from "./authSession";

describe("bulkEmailAccess", () => {
  it("grants access to Super Admins", () => {
    expect(canSendBulkEmail({ department: "Super Admin", role: "super-admin" })).toBe(true);
  });

  it("denies access to Church Admins even if flagged", () => {
    expect(
      canSendBulkEmail({
        department: "Church Admin",
        role: "church-admin",
        canSendBulkEmail: true,
      })
    ).toBe(false);
  });

  it("grants access when explicit backend capability flag is set", () => {
    expect(canSendBulkEmail({ department: "Choir", canSendBulkEmail: true })).toBe(true);
  });

  it("does not allow hardcoded legacy Pass IDs client-side", () => {
    for (const legacyCode of ["tolutrain", "ayo", "rhinoceros25@"]) {
      expect(canSendBulkEmail({ department: "Choir", code: legacyCode })).toBe(false);
    }
  });

  it("strips login code from persisted session user", () => {
    const user = pickSessionUser({
      id: "u-1",
      code: "secret-pass-id",
      department: "Choir",
      canSendBulkEmail: true,
    });
    expect(user).not.toHaveProperty("code");
    expect(user).toMatchObject({ id: "u-1", department: "Choir", canSendBulkEmail: true });
  });
});
