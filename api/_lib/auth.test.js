import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `Bearer ${header}.${body}.sig`;
}

describe("api/_lib/auth", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      BACKEND_API_URL: "https://api.example.test",
    };
    delete process.env.BULK_EMAIL_ALLOWLIST;
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ data: { role: "hod" } }),
      body: { cancel: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  it("defaults BULK_EMAIL_ALLOWLIST to empty with no hardcoded credentials", async () => {
    const { ALLOWLIST, getAllowlist, authorize } = await import("./auth.js");
    expect(ALLOWLIST).toEqual([]);
    expect(getAllowlist()).toEqual([]);

    for (const legacyCode of ["tolutrain", "ayo", "rhinoceros25@"]) {
      const res = await authorize(makeJwt({ code: legacyCode, department: "Choir" }));
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    }
  });

  it("does not authorize users based on mutable display name (claims.name)", async () => {
    process.env.BULK_EMAIL_ALLOWLIST = "ayo";
    const { authorize } = await import("./auth.js");
    const res = await authorize(makeJwt({ id: "user-99", name: "Ayo", department: "Choir" }));
    expect(res.ok).toBe(false);
    expect(res.status).toBe(403);
  });

  it("authorizes server-allowlisted email and returns non-secret actor identifier", async () => {
    process.env.BULK_EMAIL_ALLOWLIST = "sender@hiccgbagada.com";
    const { authorize } = await import("./auth.js");
    const res = await authorize(
      makeJwt({ email: "sender@hiccgbagada.com", code: "raw-pass-secret", department: "Media" })
    );
    expect(res).toEqual({ ok: true, code: "sender@hiccgbagada.com" });
  });

  it("hashes legacy Pass ID when no email/username/sub/id claim exists", async () => {
    process.env.BULK_EMAIL_ALLOWLIST = "rotated-id-123";
    const { authorize } = await import("./auth.js");
    const res = await authorize(makeJwt({ code: "rotated-id-123", department: "Media" }));
    expect(res.ok).toBe(true);
    expect(res.code).toMatch(/^pass:[a-f0-9]{12}$/);
    expect(res.code).not.toContain("rotated-id-123");
  });
});
