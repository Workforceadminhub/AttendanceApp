import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkersBallAdmin from "./WorkersBallAdmin";
import { fetchWorkersBallRegistrations } from "../services/workersBall";
import { getUser } from "../utils/getUser";
import { getUserRole } from "../utils/getUserRole";
import { exportWorkersBallWorkbook } from "../utils/exportWorkersBall";

vi.mock("../services/workersBall", () => ({
  fetchWorkersBallRegistrations: vi.fn(),
}));

vi.mock("../utils/getUser", () => ({
  getUser: vi.fn(),
}));

vi.mock("../utils/getUserRole", () => ({
  getUserRole: vi.fn(),
}));

vi.mock("../utils/exportWorkersBall", () => ({
  exportWorkersBallWorkbook: vi.fn(),
}));

// Mock Layout to keep tests focused on page logic
vi.mock("../components/Layout", () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

const mockRegistrations = [
  {
    id: 1,
    workerId: 101,
    name: "Ayodeji Eluwande",
    email: "ayo@example.com",
    phone: "08011223344",
    department: "Technical",
    team: "Media",
    role: "Lead",
    code: "HGWB-AYO001",
    status: "attended",
    attended: true,
    attendedAt: "2026-10-22T19:30:00Z",
    registeredAt: "2026-10-15T10:00:00Z",
  },
  {
    id: 2,
    workerId: 102,
    name: "Chidi Enwereji",
    email: "chidi@example.com",
    phone: "08099887766",
    department: "Workforce",
    team: "Admin",
    role: "Coordinator",
    code: "HGWB-CHI002",
    status: "registered",
    attended: false,
    attendedAt: null,
    registeredAt: "2026-10-16T12:00:00Z",
  },
  {
    id: 3,
    workerId: 103,
    name: "Grace Adebayo",
    email: "grace@example.com",
    phone: "08055443322",
    department: "Choir",
    team: "Soprano",
    role: "Worker",
    code: "HGWB-GRA003",
    status: "attended",
    attended: true,
    attendedAt: "2026-10-22T19:45:00Z",
    registeredAt: "2026-10-17T14:00:00Z",
  },
  {
    id: 4,
    workerId: 104,
    name: "Rebecca Funsho",
    email: "rebecca@example.com",
    phone: "08012345678",
    department: "Workforce",
    team: "Admin",
    role: "Small Group Leader",
    code: "",
    status: "pending",
    attended: false,
    attendedAt: null,
    registeredAt: "2026-10-18T10:00:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockReturnValue({
    id: 999,
    name: "Super Admin",
    permissionLevel: "SUPER_ADMIN",
    department: "Super Admin",
  });
  getUserRole.mockReturnValue({
    isSuperAdmin: true,
    isChurchAdmin: false,
  });
  fetchWorkersBallRegistrations.mockResolvedValue({
    registrations: mockRegistrations,
    total: 4,
    totalRegistered: 3,
    totalConfirmed: 3,
    totalPending: 1,
    totalAttended: 2,
  });
});

afterEach(() => {
  cleanup();
});

describe("WorkersBallAdmin (/admin/workers-ball-registrations)", () => {
  it("denies access when the user is not super admin or church admin", () => {
    getUser.mockReturnValue({
      id: 5,
      name: "Regular Worker",
      role: "worker",
      department: "Choir",
    });
    getUserRole.mockReturnValue({
      isSuperAdmin: false,
      isChurchAdmin: false,
    });

    render(
      <MemoryRouter>
        <WorkersBallAdmin />
      </MemoryRouter>
    );

    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Super Admin authorization is required/i)
    ).toBeInTheDocument();
  });

  it("loads and displays registrations, KPI metrics, and attendance status", async () => {
    render(
      <MemoryRouter>
        <WorkersBallAdmin />
      </MemoryRouter>
    );

    // Initial loading indicator
    expect(screen.getByText(/Loading registrations/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchWorkersBallRegistrations).toHaveBeenCalled();
    });

    // Page title and KPI metrics
    expect(screen.getByText(/Workers Ball 2026 Tracking/i)).toBeInTheDocument();
    expect(screen.getAllByText("Registered").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Attended").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Turnout")).toBeInTheDocument();

    // Table rows rendered
    expect(screen.getByText("Ayodeji Eluwande")).toBeInTheDocument();
    expect(screen.getByText("Chidi Enwereji")).toBeInTheDocument();
    expect(screen.getByText("Grace Adebayo")).toBeInTheDocument();
    expect(screen.getByText("Rebecca Funsho")).toBeInTheDocument();

    // Access codes rendered
    expect(screen.getByText("HGWB-AYO001")).toBeInTheDocument();
    expect(screen.getByText("HGWB-CHI002")).toBeInTheDocument();
    expect(screen.getByText("HGWB-GRA003")).toBeInTheDocument();

    // Status badges
    expect(screen.getAllByText("ATTENDED").length).toBe(2);
    expect(screen.getAllByText("REGISTERED").length).toBe(1);
    expect(screen.getAllByText("PENDING").length).toBe(1);
  });

  it("filters registrations by search keyword (name or code)", async () => {
    render(
      <MemoryRouter>
        <WorkersBallAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Ayodeji Eluwande")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search name, code/i);
    fireEvent.change(searchInput, { target: { value: "Chidi" } });

    expect(screen.getByText("Chidi Enwereji")).toBeInTheDocument();
    expect(screen.queryByText("Ayodeji Eluwande")).not.toBeInTheDocument();
    expect(screen.queryByText("Grace Adebayo")).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("Ayodeji Eluwande")).toBeInTheDocument();
  });

  it("filters registrations by status tab (Attended vs Registered vs Pending)", async () => {
    render(
      <MemoryRouter>
        <WorkersBallAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Ayodeji Eluwande")).toBeInTheDocument();
    });

    // Click "Pending" tab
    const pendingTab = screen.getByRole("button", { name: /^Pending/i });
    fireEvent.click(pendingTab);

    // Only Rebecca should be visible
    expect(screen.getByText("Rebecca Funsho")).toBeInTheDocument();
    expect(screen.queryByText("Ayodeji Eluwande")).not.toBeInTheDocument();
    expect(screen.queryByText("Chidi Enwereji")).not.toBeInTheDocument();

    // Click "Registered" tab
    const registeredTab = screen.getByRole("button", { name: /^Registered/i });
    fireEvent.click(registeredTab);

    // Only Chidi should be visible
    expect(screen.getByText("Chidi Enwereji")).toBeInTheDocument();
    expect(screen.queryByText("Ayodeji Eluwande")).not.toBeInTheDocument();
    expect(screen.queryByText("Rebecca Funsho")).not.toBeInTheDocument();

    // Click "Attended" tab
    const attendedTab = screen.getByRole("button", { name: /^Attended/i });
    fireEvent.click(attendedTab);

    // Ayodeji and Grace should be visible, others hidden
    expect(screen.getByText("Ayodeji Eluwande")).toBeInTheDocument();
    expect(screen.getByText("Grace Adebayo")).toBeInTheDocument();
    expect(screen.queryByText("Chidi Enwereji")).not.toBeInTheDocument();
    expect(screen.queryByText("Rebecca Funsho")).not.toBeInTheDocument();
  });

  it("opens worker registration detail modal on click", async () => {
    render(
      <MemoryRouter>
        <WorkersBallAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Ayodeji Eluwande")).toBeInTheDocument();
    });

    // Click Details button on Ayodeji's row
    const detailsButtons = screen.getAllByRole("button", { name: /Details/i });
    fireEvent.click(detailsButtons[0]);

    // Modal opens
    expect(screen.getByText(/Workers Ball Registration Record/i)).toBeInTheDocument();
    expect(screen.getByText(/OFFICIAL GALA PASS • 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/ACCREDITATION CODE/i)).toBeInTheDocument();
    expect(screen.getAllByText("HGWB-AYO001").length).toBeGreaterThanOrEqual(2);

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /^Close$/i }));
    await waitFor(() => {
      expect(screen.queryByText(/OFFICIAL GALA PASS • 2026/i)).not.toBeInTheDocument();
    });
  });

  it("calls exportWorkersBallWorkbook when Export Excel is clicked", async () => {
    exportWorkersBallWorkbook.mockResolvedValue(3);

    render(
      <MemoryRouter>
        <WorkersBallAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Ayodeji Eluwande")).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole("button", { name: /Export Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(exportWorkersBallWorkbook).toHaveBeenCalledWith({
        registrations: mockRegistrations,
      });
    });
  });
});
