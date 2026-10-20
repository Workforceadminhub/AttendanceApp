import { describe, it, expect, vi, beforeEach } from "vitest";
import apiRequest from "../utils/apiClient";
import {
  confirmWorkersBallRegistration,
  normalizeWorkersBallWorker,
  requestWorkersBallOtp,
  searchWorkersBall,
  updateWorkersBallEmail,
} from "./workersBall";

vi.mock("../utils/apiClient", () => ({ default: vi.fn() }));

beforeEach(() => {
  apiRequest.mockReset();
});

describe("workersBall service", () => {
  it("searches publicly by name and normalizes rows", async () => {
    apiRequest.mockResolvedValue({
      success: true,
      data: [
        {
          id: 18,
          name: "Chidi Bede Enwereji",
          phone: "******8143",
          email: "c***@g***.com",
          team: "Ministry",
          department: "Workforce Admin",
          registered: false,
          email_editable: true,
        },
      ],
    });

    const rows = await searchWorkersBall("  chidi ");

    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/workers-ball/search",
      { name: "chidi" },
      undefined,
      false
    );
    expect(rows[0]).toMatchObject({
      id: 18,
      firstName: "Chidi",
      lastName: "Bede Enwereji",
      registered: false,
      emailEditable: true,
    });
  });

  it("returns [] for a blank search without calling the API", async () => {
    expect(await searchWorkersBall("   ")).toEqual([]);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("PUTs only the email", async () => {
    apiRequest.mockResolvedValue({ success: true });
    await updateWorkersBallEmail(18, " me@example.com ");
    expect(apiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/workers-ball/workers/18/email",
      { email: "me@example.com" },
      undefined,
      false
    );
  });

  it("POSTs workerId to request an OTP", async () => {
    apiRequest.mockResolvedValue({ success: true });
    await requestWorkersBallOtp("18");
    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/workers-ball/register",
      { workerId: 18 },
      undefined,
      false
    );
  });

  it("confirms with workerId + otp and extracts the HGWB code", async () => {
    apiRequest.mockResolvedValue({
      success: true,
      message: "Registered",
      data: { code: "HGWB-ABC123" },
    });
    const result = await confirmWorkersBallRegistration(18, "123456");
    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/workers-ball/register/confirm",
      { workerId: 18, otp: "123456" },
      undefined,
      false
    );
    expect(result.accessCode).toBe("HGWB-ABC123");
  });

  it("propagates 409 from confirm", async () => {
    const err = Object.assign(new Error("Already registered"), { status: 409 });
    apiRequest.mockRejectedValue(err);
    await expect(confirmWorkersBallRegistration(18, "123456")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("splits single-word names", () => {
    expect(normalizeWorkersBallWorker({ id: 1, name: "Chidi" })).toMatchObject({
      firstName: "Chidi",
      lastName: "",
    });
  });
});
