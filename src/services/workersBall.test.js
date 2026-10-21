import { describe, it, expect, vi, beforeEach } from "vitest";
import apiRequest from "../utils/apiClient";
import {
  confirmWorkersBallRegistration,
  normalizeWorkersBallWorker,
  requestWorkersBallOtp,
  scanWorkersBallPass,
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

  it("falls back to workerId-derived HGWB code when API only returns qrCode", async () => {
    apiRequest.mockResolvedValue({
      success: true,
      message: "Your HGWB access code is in your email.",
      data: { qrCode: "data:image/png;base64,sampleQR" },
    });
    const result = await confirmWorkersBallRegistration(42, "654321");
    expect(result.accessCode).toBe("HGWB-000042");
    expect(result.qrCode).toBe("data:image/png;base64,sampleQR");
  });

  it("extracts nested HGWB code from serialized response", async () => {
    apiRequest.mockResolvedValue({
      success: true,
      data: {
        registration: {
          badge: "HGWB-Z5WNHQ",
        },
      },
    });
    const result = await confirmWorkersBallRegistration(99, "111222");
    expect(result.accessCode).toBe("HGWB-Z5WNHQ");
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

  describe("scanWorkersBallPass", () => {
    it("POSTs /api/workers-ball/scan with { scan: code } and marks attended", async () => {
      apiRequest.mockResolvedValue({
        success: true,
        message: "Check-in confirmed",
        data: {
          attended: true,
          name: "Ayodeji Eluwande",
          department: "Technical",
          team: "Media",
        },
      });

      const result = await scanWorkersBallPass("HGWB-AB23CD");

      expect(apiRequest).toHaveBeenCalledWith(
        "POST",
        "/api/workers-ball/scan",
        { scan: "HGWB-AB23CD" },
        undefined,
        false
      );
      expect(result).toMatchObject({
        success: true,
        attended: true,
        alreadyAttended: false,
        name: "Ayodeji Eluwande",
        code: "HGWB-AB23CD",
      });
    });

    it("handles 'Already attended' in 200 response without error", async () => {
      apiRequest.mockResolvedValue({
        success: true,
        message: "Already attended",
        data: {
          attended: true,
          name: "Ayodeji Eluwande",
        },
      });

      const result = await scanWorkersBallPass("HGWB-AB23CD");
      expect(result.alreadyAttended).toBe(true);
      expect(result.attended).toBe(true);
      expect(result.name).toBe("Ayodeji Eluwande");
    });

    it("handles 'Already attended' when returned as an API error", async () => {
      const err = Object.assign(new Error("Already attended"), {
        status: 400,
        responseData: {
          message: "Already attended",
          data: { name: "Ayodeji Eluwande" },
        },
      });
      apiRequest.mockRejectedValue(err);

      const result = await scanWorkersBallPass("HGWB-AB23CD");
      expect(result.alreadyAttended).toBe(true);
      expect(result.name).toBe("Ayodeji Eluwande");
    });

    it("extracts HGWB code from scanned URL or prefixed input", async () => {
      apiRequest.mockResolvedValue({
        success: true,
        data: { attended: true, name: "Chidi" },
      });

      await scanWorkersBallPass("https://hicc.church/verify?code=HGWB-998877");
      expect(apiRequest).toHaveBeenCalledWith(
        "POST",
        "/api/workers-ball/scan",
        { scan: "HGWB-998877" },
        undefined,
        false
      );
    });

    it("throws when pass scan string is empty", async () => {
      await expect(scanWorkersBallPass("   ")).rejects.toThrow(
        /valid pass or enter an access code/i
      );
    });
  });
});
