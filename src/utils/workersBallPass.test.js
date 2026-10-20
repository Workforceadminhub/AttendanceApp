import { describe, it, expect, vi } from "vitest";
import { downloadWorkersBallPassPng } from "./workersBallPass";

describe("workersBallPass", () => {
  it("creates a high-DPI canvas and triggers PNG download", async () => {
    const mockContext = {
      scale: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setLineDash: vi.fn(),
      drawImage: vi.fn(),
    };

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      toDataURL: vi.fn().mockReturnValue("data:image/png;base64,mockPassData"),
      width: 0,
      height: 0,
    };

    const origCreateElement = Document.prototype.createElement;
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") return mockCanvas;
      return origCreateElement.call(document, tag);
    });

    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => {});

    await downloadWorkersBallPassPng({
      firstName: "Ayodeji",
      lastName: "Eluwande",
      email: "ayo@example.com",
      phone: "08012345678",
      role: "Media Lead",
      department: "Technical",
      team: "Media",
      accessCode: "HGWB-Z5WNHQ",
      qrCode: null,
    });

    expect(mockCanvas.getContext).toHaveBeenCalledWith("2d");
    expect(mockContext.fillText).toHaveBeenCalledWith(
      "Workers Ball 2026",
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockContext.fillText).toHaveBeenCalledWith(
      "Ayodeji Eluwande",
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockContext.fillText).toHaveBeenCalledWith(
      "HGWB-Z5WNHQ",
      expect.any(Number),
      expect.any(Number)
    );

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
  });
});
