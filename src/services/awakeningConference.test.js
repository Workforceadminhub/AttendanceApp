import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../utils/apiClient", () => ({
  default: apiRequestMock,
}));

import {
  checkAwakeningRegistration,
  fetchAllAwakeningRegistrations,
} from "./awakeningConference";

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

  it("combines historical service-team values for a normalized filter", async () => {
    const rowsByServiceTeam = {
      Media: [{ id: "current", created_at: "2026-08-03T12:00:00Z" }],
      Photography: [{ id: "photo", created_at: "2026-08-02T12:00:00Z" }],
      Streaming: [{ id: "stream", created_at: "2026-08-04T12:00:00Z" }],
      Videography: [{ id: "video", created_at: "2026-08-01T12:00:00Z" }],
    };
    apiRequestMock.mockImplementation((_method, _path, params) => ({
      data: rowsByServiceTeam[params.preferred_service_team],
      pagination: { totalPages: 1 },
    }));

    await expect(fetchAllAwakeningRegistrations({ serviceTeam: "Media" })).resolves.toEqual([
      { id: "stream", created_at: "2026-08-04T12:00:00Z" },
      { id: "current", created_at: "2026-08-03T12:00:00Z" },
      { id: "photo", created_at: "2026-08-02T12:00:00Z" },
      { id: "video", created_at: "2026-08-01T12:00:00Z" },
    ]);
    expect(apiRequestMock).toHaveBeenCalledTimes(4);
  });
});
