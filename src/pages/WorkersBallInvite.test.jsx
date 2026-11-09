import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkersBallInvite from "./WorkersBallInvite";
import {
  confirmWorkersBallInvite,
  fetchWorkersBallInvite,
} from "../services/workersBall";

vi.mock("../services/workersBall", () => ({
  fetchWorkersBallInvite: vi.fn(),
  confirmWorkersBallInvite: vi.fn(),
  decodeQrCodeDataUrl: vi.fn().mockResolvedValue(null),
}));

window.scrollTo = vi.fn();

const renderInvite = (initialEntry = "/workers-ball/invite?token=01M6XPZEF3340FP0E8M1AX9E2D") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/workers-ball/invite" element={<WorkersBallInvite />} />
        <Route path="/workers-ball/invite/:token" element={<WorkersBallInvite />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("WorkersBallInvite (/workers-ball/invite?token=...)", () => {
  it("loads worker data from GET /api/workers-ball/invite/{token} and confirms via POST .../confirm", async () => {
    fetchWorkersBallInvite.mockResolvedValue({
      id: 18,
      name: "Chidi Bede Enwereji",
      firstName: "Chidi",
      lastName: "Bede Enwereji",
      email: "c**@g**.com",
      phone: "******8143",
      department: "Workforce Admin",
      team: "Ministry",
      role: "Worker",
      confirmed: false,
      registered: false,
      token: "01M6XPZEF3340FP0E8M1AX9E2D",
    });

    confirmWorkersBallInvite.mockResolvedValue({
      accessCode: "HGWB-CB1234",
      qrCode: "data:image/png;base64,inviteQr",
      worker: {
        id: 18,
        name: "Chidi Bede Enwereji",
        firstName: "Chidi",
        lastName: "Bede Enwereji",
        email: "c**@g**.com",
        phone: "******8143",
        department: "Workforce Admin",
        team: "Ministry",
        role: "Worker",
      },
    });

    renderInvite("/workers-ball/invite?token=01M6XPZEF3340FP0E8M1AX9E2D");

    await waitFor(() => {
      expect(fetchWorkersBallInvite).toHaveBeenCalledWith(
        "01M6XPZEF3340FP0E8M1AX9E2D"
      );
    });

    // Displays invited worker's data
    expect(
      await screen.findByText(/Chidi Bede Enwereji/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Workforce Admin")).toBeInTheDocument();
    expect(screen.getByText("Ministry")).toBeInTheDocument();
    expect(screen.getByText("c**@g**.com")).toBeInTheDocument();

    // Click one-time confirmation button
    const confirmBtn = screen.getByRole("button", {
      name: /Confirm Invitation & Claim Gala Pass/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(confirmWorkersBallInvite).toHaveBeenCalledWith(
        "01M6XPZEF3340FP0E8M1AX9E2D"
      );
    });

    // Shows Gala Pass with HGWB code
    expect(
      await screen.findByText(/See you at Workers Ball, Chidi!/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/HGWB-CB1234/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Download Official Pass \(PNG\)/i)
    ).toBeInTheDocument();
  });

  it("also supports path parameter /workers-ball/invite/:token", async () => {
    fetchWorkersBallInvite.mockResolvedValue({
      id: 18,
      name: "Chidi Bede Enwereji",
      firstName: "Chidi",
      lastName: "Bede Enwereji",
      department: "Workforce Admin",
      team: "Ministry",
      role: "Worker",
      confirmed: false,
      registered: false,
      token: "01M6XPZEF3340FP0E8M1AX9E2D",
    });

    renderInvite("/workers-ball/invite/01M6XPZEF3340FP0E8M1AX9E2D");

    await waitFor(() => {
      expect(fetchWorkersBallInvite).toHaveBeenCalledWith(
        "01M6XPZEF3340FP0E8M1AX9E2D"
      );
    });
    expect(
      await screen.findByText(/Chidi Bede Enwereji/i)
    ).toBeInTheDocument();
  });

  it("shows already confirmed notice when invite was already used", async () => {
    const conflict = Object.assign(new Error("Invite already confirmed"), {
      status: 409,
    });
    fetchWorkersBallInvite.mockRejectedValue(conflict);

    renderInvite("/workers-ball/invite?token=USED_TOKEN");

    expect(
      await screen.findByText(/This invitation has already been confirmed/i)
    ).toBeInTheDocument();
  });

  it("shows error state when token is missing", async () => {
    renderInvite("/workers-ball/invite");

    expect(
      await screen.findByText(/missing a valid invite token/i)
    ).toBeInTheDocument();
    expect(fetchWorkersBallInvite).not.toHaveBeenCalled();
  });
});
