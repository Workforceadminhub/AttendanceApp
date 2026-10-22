import { describe, it, expect, vi, beforeEach } from "vitest";
import apiRequest from "../utils/apiClient";
import {
  confirmWorkersBallRegistration,
  extractWorkersBallRegistrations,
  fetchWorkersBallRegistrations,
  normalizeWorkersBallRegistrationRow,
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

  describe("fetchWorkersBallRegistrations", () => {
    it("calls GET /api/workers-ball/registrations with auth=true and passes filters", async () => {
      apiRequest.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            name: "Ayodeji Eluwande",
            email: "ayo@example.com",
            phone: "08012345678",
            department: "Technical",
            team: "Sound",
            role: "Leader",
            code: "HGWB-ABC123",
            attended: true,
            attended_at: "2026-10-22T19:30:00Z",
            created_at: "2026-10-15T12:00:00Z",
          },
          {
            id: 2,
            firstName: "Chidi",
            lastName: "Enwereji",
            email: "chidi@example.com",
            department: "Protocol",
            team: "Ushers",
            access_code: "HGWB-DEF456",
            attended: false,
            created_at: "2026-10-16T08:00:00Z",
          },
        ],
      });

      const result = await fetchWorkersBallRegistrations({
        search: "Ayodeji",
        department: "Technical",
        team: "Sound",
        status: "attended",
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "GET",
        "/api/workers-ball/registrations",
        {
          search: "Ayodeji",
          department: "Technical",
          team: "Sound",
          status: "attended",
        },
        undefined,
        true
      );

      expect(result.registrations).toHaveLength(2);
      expect(result.registrations[0]).toMatchObject({
        id: 1,
        name: "Ayodeji Eluwande",
        code: "HGWB-ABC123",
        attended: true,
        attendedAt: "2026-10-22T19:30:00Z",
      });
      expect(result.registrations[1]).toMatchObject({
        id: 2,
        name: "Chidi Enwereji",
        code: "HGWB-DEF456",
        attended: false,
        attendedAt: null,
      });
      expect(result.totalAttended).toBe(1);
      expect(result.totalRegistered).toBe(2);
    });

    it("normalizes attended when attended_at timestamp is present", () => {
      const row = normalizeWorkersBallRegistrationRow({
        id: 10,
        worker_name: "Jane Doe",
        attended_at: "2026-10-22T18:00:00Z",
      });
      expect(row.attended).toBe(true);
      expect(row.attendedAt).toBe("2026-10-22T18:00:00Z");
      expect(row.name).toBe("Jane Doe");
    });

    it("respects explicit attended: false when attended_at is null", () => {
      const row = normalizeWorkersBallRegistrationRow({
        id: 11,
        name: "John Bull",
        attended: false,
        attended_at: null,
      });
      expect(row.attended).toBe(false);
      expect(row.attendedAt).toBeNull();
    });

    it("handles nested worker object in registration row", () => {
      const row = normalizeWorkersBallRegistrationRow({
        id: 55,
        access_code: "HGWB-TEST99",
        worker: {
          first_name: "Tola",
          last_name: "Akin",
          email: "tola@example.com",
          department: "Media",
          team: "Visuals",
          role: "Worker",
        },
      });
      expect(row.name).toBe("Tola Akin");
      expect(row.email).toBe("tola@example.com");
      expect(row.department).toBe("Media");
      expect(row.team).toBe("Visuals");
      expect(row.code).toBe("HGWB-TEST99");
    });

    it("parses split { registered: [...], attended: [...] } response and cross-references attendance", () => {
      const response = {
        success: true,
        data: {
          registered: [
            { id: 1, name: "Worker One", code: "HGWB-001" },
            { id: 2, name: "Worker Two", code: "HGWB-002" },
          ],
          attended: [
            { id: 1, name: "Worker One", code: "HGWB-001", attended_at: "2026-10-22T19:00:00Z" },
          ],
        },
      };

      const result = extractWorkersBallRegistrations(response);
      expect(result.registrations).toHaveLength(2);
      expect(result.totalRegistered).toBe(2);
      expect(result.totalAttended).toBe(1);

      const worker1 = result.registrations.find((r) => r.code === "HGWB-001");
      const worker2 = result.registrations.find((r) => r.code === "HGWB-002");
      expect(worker1.attended).toBe(true);
      expect(worker1.attendedAt).toBe("2026-10-22T19:00:00Z");
      expect(worker2.attended).toBe(false);
    });

    it("handles attended list as string code identifiers", () => {
      const response = {
        registered: [
          { id: 10, name: "Ayo", code: "HGWB-AYO" },
          { id: 20, name: "Bisi", code: "HGWB-BIS" },
        ],
        attended: ["HGWB-AYO"],
      };

      const result = extractWorkersBallRegistrations(response);
      expect(result.registrations).toHaveLength(2);
      expect(result.registrations.find((r) => r.code === "HGWB-AYO").attended).toBe(true);
      expect(result.registrations.find((r) => r.code === "HGWB-BIS").attended).toBe(false);
    });

    it("unpacks stringified JSON / Lambda proxy body payload", () => {
      const lambdaProxy = {
        statusCode: 200,
        body: JSON.stringify({
          registered: [{ id: 99, name: "Proxy Worker", code: "HGWB-PRX" }],
          attended: [],
        }),
      };

      const result = extractWorkersBallRegistrations(lambdaProxy);
      expect(result.registrations).toHaveLength(1);
      expect(result.registrations[0].name).toBe("Proxy Worker");
      expect(result.totalRegistered).toBe(1);
      expect(result.totalAttended).toBe(0);
    });

    it("parses the real production response with summary, registered, confirmed, and pending lists", () => {
      const rawResponse = {
        success: true,
        message: "Workers Ball registrations",
        data: {
          summary: {
            total_registered: 6,
            total_confirmed: 5,
            total_pending: 1,
            total_attended: 1,
            by_department: [{ name: "Workforce Admin", registered: 6, confirmed: 5, attended: 1 }],
            by_team: [{ name: "Ministry", registered: 6, confirmed: 5, attended: 1 }],
          },
          registered: [
            {
              worker_id: 2,
              name: "Ayodeji Cornelius Eluwande",
              phone: "*******2753",
              email: "a***@g***.com",
              team: "Ministry",
              department: "Workforce Admin",
              role: "HOD",
              cluster: null,
              status: "registered",
              reference_code: "HGWB-RSSSED",
              attended: true,
              checked_in_at: "2026-10-21T13:01:03.246Z",
            },
            {
              worker_id: 5072,
              name: "Cynthia Ogochukwu Uzoalu",
              phone: "******5420",
              email: "c***@g***.com",
              team: "Ministry",
              department: "Workforce Admin",
              role: "Small Group Leader",
              cluster: null,
              status: "registered",
              reference_code: "HGWB-YGUDGW",
              attended: false,
              checked_in_at: null,
            },
            {
              worker_id: 15,
              name: "Rebecca Funsho Adeeko",
              phone: "******1321",
              email: "f***@g***.com",
              team: "Ministry",
              department: "Workforce Admin",
              role: "Small Group Leader",
              cluster: null,
              status: "pending",
              reference_code: null,
              attended: false,
              checked_in_at: null,
            },
          ],
          confirmed: [],
          pending: [],
        },
      };

      const result = extractWorkersBallRegistrations(rawResponse);
      expect(result.registrations).toHaveLength(3);
      expect(result.totalRegistered).toBe(5);
      expect(result.totalConfirmed).toBe(5);
      expect(result.totalPending).toBe(1);
      expect(result.totalAttended).toBe(1);
      expect(result.total).toBe(6);

      const ayodeji = result.registrations.find((r) => r.id === 2);
      expect(ayodeji).toMatchObject({
        name: "Ayodeji Cornelius Eluwande",
        role: "HOD",
        code: "HGWB-RSSSED",
        status: "attended",
        attended: true,
        attendedAt: "2026-10-21T13:01:03.246Z",
      });

      const cynthia = result.registrations.find((r) => r.id === 5072);
      expect(cynthia).toMatchObject({
        name: "Cynthia Ogochukwu Uzoalu",
        role: "Small Group Leader",
        code: "HGWB-YGUDGW",
        status: "registered",
        isPending: false,
        attended: false,
      });

      const rebecca = result.registrations.find((r) => r.id === 15);
      expect(rebecca).toMatchObject({
        name: "Rebecca Funsho Adeeko",
        role: "Small Group Leader",
        code: "",
        status: "pending",
        isPending: true,
        attended: false,
      });
    });
  });
});
