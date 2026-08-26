import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../utils/apiClient", () => ({
  default: apiRequestMock,
}));

import { fetchAdmins, updateAdminProfile } from "./admins";

describe("admin service", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("loads admins from the Hub API, which includes their access details", async () => {
    const response = { data: [{ id: 12, department: "Sound", team: "Programs" }] };
    apiRequestMock.mockResolvedValue(response);

    await expect(fetchAdmins()).resolves.toEqual(response.data);
    expect(apiRequestMock).toHaveBeenCalledWith("GET", "/api/hub/super/admin/admins");
  });

  it("updates an admin's department and team through the Hub API", async () => {
    apiRequestMock.mockResolvedValue({ data: { id: 12 } });

    await updateAdminProfile(12, { department: "Sound", team: "Programs" });

    expect(apiRequestMock).toHaveBeenCalledWith(
      "PUT",
      "/api/hub/super/admin/12",
      { department: "Sound", team: "Programs" }
    );
  });
});
