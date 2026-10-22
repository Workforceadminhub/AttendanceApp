import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkersBallScanner from "./WorkersBallScanner";
import { scanWorkersBallPass } from "../services/workersBall";
import { getUser } from "../utils/getUser";
import { getUserRole } from "../utils/getUserRole";

vi.mock("../services/workersBall", () => ({
  scanWorkersBallPass: vi.fn(),
}));

vi.mock("../utils/getUser", () => ({
  getUser: vi.fn(),
}));

vi.mock("../utils/getUserRole", () => ({
  getUserRole: vi.fn(),
}));

// Mock mediaDevices
const mockGetUserMedia = vi.fn().mockRejectedValue(new Error("Camera unavailable in test"));
Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
  configurable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockReturnValue(null);
  getUserRole.mockReturnValue({ isSuperAdmin: false, isChurchAdmin: false });
});

afterEach(() => {
  cleanup();
});

describe("WorkersBallScanner (/scan/wb26)", () => {
  it("renders the accreditation scanner header and mode toggles", () => {
    render(
      <MemoryRouter>
        <WorkersBallScanner />
      </MemoryRouter>
    );

    expect(screen.getByText(/Accreditation Scanner/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Desk/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Camera QR/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Code Entry \/ Gun/i })).toBeInTheDocument();
    expect(screen.getByText(/No passes scanned yet in this session/i)).toBeInTheDocument();
  });

  it("checks in a worker via manual code entry and shows confirmed badge", async () => {
    scanWorkersBallPass.mockResolvedValue({
      success: true,
      attended: true,
      alreadyAttended: false,
      code: "HGWB-AB23CD",
      name: "Ayodeji Eluwande",
      department: "Technical",
      team: "Media",
      role: "Lead",
      message: "Check-in confirmed",
    });

    render(
      <MemoryRouter>
        <WorkersBallScanner />
      </MemoryRouter>
    );

    // Switch to manual / gun mode
    fireEvent.click(screen.getByRole("button", { name: /Code Entry \/ Gun/i }));

    const input = screen.getByLabelText(/Workers Ball Access Code/i);
    fireEvent.change(input, { target: { value: "HGWB-AB23CD" } });
    fireEvent.click(screen.getByRole("button", { name: /Check In Worker/i }));

    await waitFor(() => {
      expect(scanWorkersBallPass).toHaveBeenCalledWith("HGWB-AB23CD");
    });

    expect(await screen.findByText(/Check-In Confirmed/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ayodeji Eluwande/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Welcome to Workers Ball 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Accredited this session:/i)).toBeInTheDocument();
  });

  it("handles Already Attended scan with a warning badge", async () => {
    scanWorkersBallPass.mockResolvedValue({
      success: true,
      attended: true,
      alreadyAttended: true,
      code: "HGWB-AB23CD",
      name: "Ayodeji Eluwande",
      message: "Already attended",
    });

    render(
      <MemoryRouter>
        <WorkersBallScanner />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Code Entry \/ Gun/i }));

    const input = screen.getByLabelText(/Workers Ball Access Code/i);
    fireEvent.change(input, { target: { value: "HGWB-AB23CD" } });
    fireEvent.click(screen.getByRole("button", { name: /Check In Worker/i }));

    expect(
      (await screen.findAllByText(/Already Attended/i)).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Already attended — this pass was already scanned/i)).toBeInTheDocument();
  });

  it("handles invalid pass scan error gracefully", async () => {
    scanWorkersBallPass.mockRejectedValue(new Error("Pass not found in registry"));

    render(
      <MemoryRouter>
        <WorkersBallScanner />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Code Entry \/ Gun/i }));

    const input = screen.getByLabelText(/Workers Ball Access Code/i);
    fireEvent.change(input, { target: { value: "INVALID-CODE" } });
    fireEvent.click(screen.getByRole("button", { name: /Check In Worker/i }));

    expect(await screen.findByText(/Verification Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Pass not found in registry/i)).toBeInTheDocument();
  });

  it("clears the session scan history when clear is clicked", async () => {
    scanWorkersBallPass.mockResolvedValue({
      success: true,
      attended: true,
      alreadyAttended: false,
      code: "HGWB-990011",
      name: "Bisi Akande",
    });

    render(
      <MemoryRouter>
        <WorkersBallScanner />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Code Entry \/ Gun/i }));
    const input = screen.getByLabelText(/Workers Ball Access Code/i);
    fireEvent.change(input, { target: { value: "HGWB-990011" } });
    fireEvent.click(screen.getByRole("button", { name: /Check In Worker/i }));

    await screen.findAllByText(/Bisi Akande/i);
    expect(screen.getByText(/Recent Scans \(1\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear/i }));
    expect(screen.getByText(/No passes scanned yet in this session/i)).toBeInTheDocument();
  });

  it("navigates back to super admin tracking dashboard when signed in as super admin", () => {
    getUser.mockReturnValue({ id: 1, role: "Super Admin", department: "Super Admin" });
    getUserRole.mockReturnValue({ isSuperAdmin: true, isChurchAdmin: false });

    render(
      <MemoryRouter>
        <WorkersBallScanner />
      </MemoryRouter>
    );

    const backLink = screen.getByRole("link", {
      name: /Return to Workers Ball Tracking Dashboard/i,
    });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/admin/workers-ball-registrations");
  });

  it("navigates back to state.from when opened from admin registration view", () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/scan/wb26",
            state: { from: "/admin/workers-ball-registrations" },
          },
        ]}
      >
        <WorkersBallScanner />
      </MemoryRouter>
    );

    const backLink = screen.getByRole("link", { name: /Return/i });
    expect(backLink).toHaveAttribute("href", "/admin/workers-ball-registrations");
  });
});
