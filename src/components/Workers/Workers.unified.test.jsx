import { ConfirmProvider } from "../../components/ui/ConfirmDialog";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Workers from "./Workers";
import { listSuperAdminWorkers, fetchAllSuperAdminWorkers } from "../../services/workers";
import { saveAs } from "file-saver";

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

vi.mock("../../services/workers", () => ({
  listSuperAdminWorkers: vi.fn(),
  fetchWorkers: vi.fn(),
  fetchAdminWorkersPage: vi.fn(),
  fetchAdminWorkers: vi.fn(),
  fetchAllSuperAdminWorkers: vi.fn(),
}));

vi.mock("../Header", () => ({ default: () => null }));
vi.mock("../Layout", () => ({ default: ({ children }) => <div>{children}</div> }));

vi.mock("../../utils/getDepartment", () => ({
  getDepartmentByUser: () => ({ department: "Super Admin" }),
}));

vi.mock("../../utils/checkAdminStatus", () => ({
  checkAdminStatus: () => true,
}));

vi.mock("../../services/departments", () => ({
  fetchTeamsAndDepartmentsForFilter: vi.fn().mockResolvedValue({
    teams: ["Programs", "Districts"],
    departmentsByTeam: { Programs: ["Ushering"], Districts: ["Community A"] },
  }),
}));

describe("Workers unified component", () => {
  let queryClient;

  beforeEach(() => {
    sessionStorage.setItem(
      "authUser",
      JSON.stringify({
        email: "workforceadmin@hiccgbagada.com",
        role: "Super Admin",
        team: "Super Admin",
      })
    );
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("renders Status column and Team Mismatch button for Super Admin", async () => {
    listSuperAdminWorkers.mockResolvedValue({
      data: [
        {
          id: 1,
          firstname: "Zara",
          lastname: "Alabi",
          phonenumber: "08012345678",
          department: "Ushering",
          team: "Programs",
          role: "Worker",
          status: "ACTIVE",
        },
        {
          id: 2,
          firstname: "Adam",
          lastname: "Bello",
          phonenumber: "08087654321",
          department: "Sound",
          team: "Programs",
          role: "Worker",
          status: "PENDING_ADD",
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ConfirmProvider><Workers /></ConfirmProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify Team Mismatch button is present for Super Admin
    expect(await screen.findByRole("button", { name: /team mismatch/i })).toBeInTheDocument();

    // Verify Status column header
    expect(screen.getByRole("button", { name: /^status/i })).toBeInTheDocument();

    // Verify status badges render
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("PENDING_ADD")).toBeInTheDocument();

    // Test column sorting by clicking "First Name"
    // Sorting orders the whole directory, so it loads every matching worker
    // (including ones that are not on the current page) before paging.
    fetchAllSuperAdminWorkers.mockResolvedValue([
      { id: 1, firstname: "Zara", lastname: "Test", status: "ACTIVE" },
      { id: 2, firstname: "Adam", lastname: "Test", status: "PENDING_ADD" },
      { id: 3, firstname: "Aaron", lastname: "Elsewhere", status: "ACTIVE" },
    ]);
    fireEvent.click(screen.getByRole("button", { name: /^first name/i }));

    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      // Row 0 is the header row.
      expect(rows[1]).toHaveTextContent("Aaron");
      expect(rows[2]).toHaveTextContent("Adam");
      expect(rows[3]).toHaveTextContent("Zara");
    });
    expect(screen.getByRole("columnheader", { name: /^first name/i })).toHaveAttribute("aria-sort", "ascending");
  });

  it("exports workers with normalized ACTIVE fallback status", async () => {
    listSuperAdminWorkers.mockResolvedValue({
      data: [
        {
          id: 10,
          firstname: "Legacy",
          lastname: "Worker",
          phonenumber: "08011112222",
          department: "Ushering",
          team: "Programs",
          role: "Worker",
          status: null,
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    fetchAllSuperAdminWorkers.mockResolvedValue([
      {
        id: 10,
        firstname: "Legacy",
        lastname: "Worker",
        phonenumber: "08011112222",
        department: "Ushering",
        team: "Programs",
        role: "Worker",
        status: null,
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ConfirmProvider><Workers /></ConfirmProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const exportBtn = await screen.findByRole("button", { name: /^export$/i });
    await waitFor(() => expect(exportBtn).not.toBeDisabled());
    fireEvent.click(exportBtn);

    await waitFor(() => expect(fetchAllSuperAdminWorkers).toHaveBeenCalledWith({
      search: "",
      team: "All",
      department: "All",
      status: undefined,
    }));
    await waitFor(() => expect(saveAs).toHaveBeenCalled());
  });
});
