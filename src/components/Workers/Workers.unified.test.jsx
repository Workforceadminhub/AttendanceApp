import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Workers from "./Workers";
import { listSuperAdminWorkers } from "../../services/workers";

vi.mock("../../services/workers", () => ({
  listSuperAdminWorkers: vi.fn(),
  fetchWorkers: vi.fn(),
  fetchAdminWorkersPage: vi.fn(),
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
          <Workers />
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
    const firstNameSortBtn = screen.getByRole("button", { name: /^first name/i });
    fireEvent.click(firstNameSortBtn);

    // After clicking first name, "Adam" should come before "Zara" (ascending)
    const rows = screen.getAllByRole("row");
    // Row 0 is the header row, row 1 should have Adam, row 2 should have Zara
    expect(rows[1]).toHaveTextContent("Adam");
    expect(rows[2]).toHaveTextContent("Zara");
  });
});
