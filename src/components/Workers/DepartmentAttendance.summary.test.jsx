import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DepartmentAttendance from "./DepartmentAttendance";
import { fetchAdminWorkers, fetchAdminWorkersPage } from "../../services/workers";
import { fetchAttendanceSummary } from "../../services/attendance";

vi.mock("../Layout", () => ({ default: ({ children }) => children }));
vi.mock("../../utils/getUserRole", () => ({
  getUserRole: () => ({ isSuperAdmin: true, isChurchAdmin: false, isSubTeamAdmin: false, assignedDepartments: [] }),
  filterTeamFromPermissions: (permissions) => permissions,
}));
vi.mock("../../utils/getUser", () => ({ getUser: () => ({ team: "Super Admin" }) }));
vi.mock("../../utils/getDepartment", () => ({
  getDepartmentByUser: () => ({ team: "Super Admin", department: "Super Admin" }),
}));
vi.mock("../../utils/expandPermissions", () => ({ expandPermissions: () => [] }));
vi.mock("../../utils/switchOffAttendance", () => ({ switchOffAttendance: () => Promise.resolve(false) }));
vi.mock("../../contexts/DepartmentsContext", () => ({ useAdminSelectOptions: () => [] }));
vi.mock("../../services/workers", () => ({
  fetchAdminWorkers: vi.fn(),
  fetchAdminWorkersPage: vi.fn(),
  fetchWorkers: vi.fn(),
  removeWorker: vi.fn(),
}));
vi.mock("../../services/attendance", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchAttendanceSummary: vi.fn(),
}));

const rows = [
  { id: 1, fullname: "Ada Obi", department: "Sound", attendance: "" },
  { id: 2, fullname: "Bola Ade", department: "Sound", attendance: "" },
  { id: 3, fullname: "Chi Eze", department: "Ushering", attendance: "Present" },
];

const card = (label) => screen.getByText(label, { selector: "dt" }).nextElementSibling;

describe("Super Admin attendance summary", () => {
  it("loads the counts in one request and the department breakdown only when asked", async () => {
    fetchAdminWorkersPage.mockResolvedValue({ data: rows, pagination: { total: 205, totalPages: 3 } });
    fetchAdminWorkers.mockResolvedValue(rows);
    fetchAttendanceSummary.mockResolvedValue({ total: 205, present: 150, absent: 53, unmarked: 2 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/attendance/super-admin"]}>
          <DepartmentAttendance />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(card("Present")).toHaveTextContent("150"));
    expect(card("Absent")).toHaveTextContent("53");
    expect(card("Unfilled")).toHaveTextContent("2");
    expect(fetchAdminWorkersPage).toHaveBeenCalledTimes(1);
    expect(fetchAttendanceSummary).toHaveBeenCalledTimes(1);
    expect(fetchAdminWorkers).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Show departments" }));
    expect(await screen.findByText("(2 unfilled workers)")).toBeInTheDocument();
    expect(fetchAdminWorkers).toHaveBeenCalledTimes(1);
  });
});
