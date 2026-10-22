import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportWorkersBallWorkbook } from "./exportWorkersBall";
import { saveAs } from "file-saver";
import { fetchWorkersBallRegistrations } from "../services/workersBall";

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

vi.mock("../services/workersBall", () => ({
  fetchWorkersBallRegistrations: vi.fn(),
}));

describe("exportWorkersBallWorkbook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports provided registrations into multi-tab excel workbook and triggers download", async () => {
    const mockRows = [
      {
        id: 1,
        name: "Ayodeji Eluwande",
        code: "HGWB-AYO001",
        attended: true,
        attendedAt: "2026-10-22T19:30:00Z",
        department: "Technical",
        team: "Media",
        role: "Leader",
        phone: "08012345678",
        email: "ayo@example.com",
        registeredAt: "2026-10-15T10:00:00Z",
      },
      {
        id: 2,
        name: "Chidi Enwereji",
        code: "HGWB-CHI002",
        attended: false,
        attendedAt: null,
        department: "Admin",
        team: "Coordination",
        role: "Worker",
        phone: "08087654321",
        email: "chidi@example.com",
        registeredAt: "2026-10-16T11:00:00Z",
      },
    ];

    const count = await exportWorkersBallWorkbook({ registrations: mockRows });

    expect(count).toBe(2);
    expect(saveAs).toHaveBeenCalled();
    const [blob, filename] = saveAs.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toMatch(/^Workers-Ball-2026-Registrations-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("fetches registrations when not explicitly provided", async () => {
    fetchWorkersBallRegistrations.mockResolvedValue({
      registrations: [
        {
          id: 10,
          name: "Fetched Worker",
          code: "HGWB-FETCH01",
          attended: true,
          attendedAt: "2026-10-22T20:00:00Z",
        },
      ],
    });

    const count = await exportWorkersBallWorkbook({ filters: { status: "attended" } });

    expect(fetchWorkersBallRegistrations).toHaveBeenCalledWith({ status: "attended" });
    expect(count).toBe(1);
    expect(saveAs).toHaveBeenCalled();
  });

  it("throws error when no registrations are found", async () => {
    fetchWorkersBallRegistrations.mockResolvedValue({ registrations: [] });

    await expect(exportWorkersBallWorkbook({ registrations: [] })).rejects.toThrow(
      /No registrations found to export/i
    );
  });
});
