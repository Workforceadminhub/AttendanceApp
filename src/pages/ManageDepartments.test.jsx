import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ManageDepartments from "./ManageDepartments";
import { addDepartment, fetchDepartments, updateDepartment } from "../services/departments";
import { setDynamicDepartments } from "../utils/routeObject";

vi.mock("../components/Layout", () => ({ default: ({ children }) => children }));
vi.mock("../utils/getUserRole", () => ({
  getUserRole: () => ({ isSuperAdmin: true, user: { id: 1 } }),
}));
vi.mock("../contexts/DepartmentsContext", () => ({
  useDepartmentsContext: () => ({ refetch: vi.fn() }),
  useInvalidateDepartments: () => vi.fn(),
}));
vi.mock("../services/hub/teams", () => ({
  fetchHubTeams: vi.fn().mockResolvedValue([
    { value: "Districts", label: "Districts" },
    { value: "Programs", label: "Programs" },
  ]),
}));
vi.mock("../services/departments", () => ({
  fetchDepartments: vi.fn(),
  addDepartment: vi.fn().mockResolvedValue({}),
  updateDepartment: vi.fn().mockResolvedValue({}),
  toggleDepartmentStatus: vi.fn(),
  deleteDepartment: vi.fn(),
}));

const departments = [
  { id: 1, name: "Trailblazer Community", team: "Districts", route: "/trailblazer", isactive: true },
  { id: 2, name: "Unsorted Community", team: "Districts", route: "/unsorted", isactive: true },
  { id: 3, name: "Sound", team: "Programs", route: "/sound", isactive: true },
];

function pick(inputId, optionText) {
  fireEvent.keyDown(document.getElementById(inputId), { key: "ArrowDown" });
  fireEvent.click(screen.getByText(optionText, { selector: "[class*='option']" }));
}

async function openPage() {
  render(
    <MemoryRouter>
      <ManageDepartments />
    </MemoryRouter>
  );
  fireEvent.click(await screen.findByText("Districts"));
}

describe("Manage departments cluster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDynamicDepartments(departments);
    fetchDepartments.mockResolvedValue(departments);
  });
  afterEach(() => { cleanup(); setDynamicDepartments(null); });

  it("shows each community's cluster and flags ones without", async () => {
    await openPage();

    expect(screen.getByText("Pastor Isaac Cluster")).toBeTruthy();
    expect(screen.getByText("No cluster set")).toBeTruthy();
  });

  it("accepts an optional cluster for a new community and sends it when provided", async () => {
    await openPage();
    fireEvent.click(screen.getByText("Add department"));
    fireEvent.change(screen.getByLabelText("Department Name *"), { target: { value: "Grace Community" } });

    expect(screen.queryByText("Cluster (Optional)")).toBeNull();
    pick("team", "Districts");
    expect(screen.getByText("Cluster (Optional)")).toBeTruthy();

    // Permitted to submit without cluster (cluster is optional)
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(addDepartment).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Grace Community", team: "Districts" })
      )
    );
    expect(addDepartment.mock.calls[0][0]).not.toHaveProperty("cluster");

    // Can also select a cluster and have it sent
    addDepartment.mockClear();
    fireEvent.click(screen.getByText("Add department"));
    fireEvent.change(screen.getByLabelText("Department Name *"), { target: { value: "Faith Community" } });
    pick("team", "Districts");
    pick("cluster", "Pastor Biola Cluster");
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(addDepartment).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Faith Community", team: "Districts", cluster: "Pastor Biola Cluster" })
      )
    );
  });

  it("prefills the current cluster when editing a community", async () => {
    await openPage();
    fireEvent.click(screen.getAllByTitle("Edit")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(updateDepartment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, cluster: "Pastor Isaac Cluster" })
      )
    );
  });
});
