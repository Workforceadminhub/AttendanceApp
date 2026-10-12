import { beforeEach, describe, expect, it, vi } from "vitest";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("axios", () => ({
  default: { create: () => ({ request, interceptors: { response: { use: vi.fn() } } }) },
}));

import apiRequest from "./apiClient";
import { persistSession } from "./authSession";

describe("access-token query authorization", () => {
  beforeEach(() => {
    sessionStorage.clear();
    request.mockReset().mockResolvedValue({ data: { success: true } });
  });

  it.each(["HOD", "ASSISTANT_HOD", "SUB_TEAM_ADMIN", "TEAM_ADMIN", "WORKFORCE_ADMIN", "CHURCH_ADMIN", "SUPER_ADMIN"])(
    "uses the login access token and strips permissions for %s",
    async (permissionLevel) => {
      persistSession("test-login-access-token", { permissionLevel, permissions: ["Sound"] });
      await apiRequest("GET", "/api/workers", {
        permissions: ["Sound"], department: "Sound", page: 2, limit: 50,
      }, { params: { permissions: '["Programs"]', search: "Ada" } });
      expect(request).toHaveBeenCalledWith(expect.objectContaining({
        headers: { Authorization: "Bearer test-login-access-token" },
        params: { department: "Sound", page: 2, limit: 50, search: "Ada" },
      }));
    }
  );

  it.each(["PUT", "DELETE"])("strips permissions from %s query parameters", async (method) => {
    persistSession("test-login-access-token", { role: "admin" });
    await apiRequest(method, "/api/admin/1/workers", undefined, {
      params: { permissions: ["Sound"], reason: "requested" },
    });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      headers: { Authorization: "Bearer test-login-access-token" },
      params: { reason: "requested" },
    }));
  });

  it("preserves explicit admin permission-assignment bodies", async () => {
    persistSession("test-login-access-token", { permissionLevel: "SUPER_ADMIN" });
    await apiRequest("PUT", "/api/hub/super/admin/1/permissions", { permissions: ["Sound"] });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      headers: { Authorization: "Bearer test-login-access-token" },
      data: { permissions: ["Sound"] },
    }));
  });

  it("leaves public login requests unauthenticated", async () => {
    await apiRequest("POST", "/auth/signin", { password: "test-code" }, undefined, false);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ headers: {}, data: { password: "test-code" } }));
  });
});
