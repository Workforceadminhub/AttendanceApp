import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../utils/apiClient", () => ({
  default: apiRequestMock,
}));

import { checkAwakeningRegistration } from "./awakeningConference";

describe("checkAwakeningRegistration", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("sends trimmed email and phone query parameters without authentication", async () => {
    apiRequestMock.mockResolvedValue({ exists: false });

    await expect(checkAwakeningRegistration({
      email: "  ada@example.com ",
      phone: " 08012345678 ",
    })).resolves.toEqual({ exists: false, record: undefined });

    expect(apiRequestMock).toHaveBeenCalledWith(
      "GET",
      "/api/awakening-conference/check",
      { email: "ada@example.com", phone: "08012345678" },
      undefined,
      false
    );
  });

  it("supports a phone-only check", async () => {
    apiRequestMock.mockResolvedValue({ registered: true });

    await expect(checkAwakeningRegistration({ phone: "08012345678" }))
      .resolves.toMatchObject({ exists: true });
  });

  it("honours an explicit nested false result", async () => {
    apiRequestMock.mockResolvedValue({ data: { exists: false } });

    await expect(checkAwakeningRegistration({ email: "ada@example.com" }))
      .resolves.toMatchObject({ exists: false });
  });

  it("treats a 404 as not registered", async () => {
    apiRequestMock.mockRejectedValue(Object.assign(new Error("Not found"), { status: 404 }));

    await expect(checkAwakeningRegistration({ email: "ada@example.com" }))
      .resolves.toEqual({ exists: false });
  });
});
