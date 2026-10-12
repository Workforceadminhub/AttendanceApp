import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DepartmentWorkers from "./DepartmentWorkers";
import { fetchWorkers } from "../services/workers";
import { getUser } from "../utils/getUser";
import { setDynamicDepartments } from "../utils/routeObject";

vi.mock("../components/Layout", () => ({ default: ({ children }) => children }));
vi.mock("../utils/getUser", () => ({ getUser: vi.fn() }));
vi.mock("../services/workers", () => ({ fetchWorkers: vi.fn(), removeWorker: vi.fn() }));

const rows = [
  { id: 1, firstname: "Ada", lastname: "Sound", department: "Sound", team: "Programs" },
  { id: 2, firstname: "Bola", lastname: "Protocol", department: "Protocol", team: "Programs" },
  { id: 3, firstname: "Chi", lastname: "Media", department: "Media-Video", team: "Programs" },
  { id: 4, firstname: "Dee", lastname: "Care", department: "Pastoral Care", team: "Ministry" },
];

function openWorkers(route, state) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: route.startsWith("/") ? route.split("?")[0] : `/department/${route}/workers`, search: route.includes("?") ? "?" + route.split("?")[1] : "", state }]}>
        <Routes>
          <Route path="/department/:departmentRoute/workers" element={<DepartmentWorkers />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Department workers scope", () => {
  afterEach(() => { cleanup(); setDynamicDepartments(null); });
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockReturnValue({ role: "admin", team: "Programs", department: "Programs", permissions: ["Programs"] });
    // Include another team and department to verify the page enforces scope
    // even if the endpoint returns a broader roster.
    fetchWorkers.mockResolvedValue(rows);
  });

  it("shows every department in the team and supports narrowing and restoring the list", async () => {
    openWorkers("programs");
    expect(await screen.findByRole("heading", { name: "Workers (3)" }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText("Ada Sound")).toBeInTheDocument();
    expect(screen.getByText("Bola Protocol")).toBeInTheDocument();
    expect(screen.getByText("Chi Media")).toBeInTheDocument();
    expect(screen.queryByText("Dee Care")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export to Excel" })).toBeEnabled();

    const filters = screen.getAllByRole("combobox");
    fireEvent.change(filters[0], { target: { value: "Sound" } });
    expect(screen.getByRole("heading", { name: "Workers (1)" })).toBeInTheDocument();
    expect(screen.queryByText("Bola Protocol")).not.toBeInTheDocument();
    fireEvent.change(filters[0], { target: { value: "All" } });
    expect(screen.getByRole("heading", { name: "Workers (3)" })).toBeInTheDocument();
  });

  it("restores the selected department from the URL and carries it to edit", async () => {
    openWorkers("/department/programs/workers?department=Sound", { refresh: true });
    expect(await screen.findByRole("heading", { name: "Workers (1)" })).toBeInTheDocument();
    const edit = screen.getByRole("link", { name: "Edit" });
    const url = new URL(edit.getAttribute("href"), "https://example.com");
    expect(url.searchParams.get("returnTo")).toBe("/department/programs/workers?department=Sound");
  });

  it("keeps old and new worker names in the same renamed department filter", async () => {
    setDynamicDepartments([{ name: "Ushering - Champions", route: "/usheringtosin", team: "Programs" }]);
    fetchWorkers.mockResolvedValue([
      { ...rows[0], department: "Ushering - Tosin" },
      { ...rows[1], department: "Ushering - Champions" },
      rows[2], rows[3],
    ]);
    openWorkers("/department/programs/workers?department=Ushering%20-%20Tosin");
    expect(await screen.findByRole("heading", { name: "Workers (2)" })).toBeInTheDocument();
    for (const filter of screen.getAllByRole("combobox")) expect(filter).toHaveValue("Ushering - Champions");
    expect(screen.getByText("Ada Sound")).toBeInTheDocument();
    expect(screen.getByText("Bola Protocol")).toBeInTheDocument();
    expect(screen.queryByText("Chi Media")).not.toBeInTheDocument();
    expect(screen.queryByText("Dee Care")).not.toBeInTheDocument();
  });

  it("uses the signed-in team for other team admins", async () => {
    getUser.mockReturnValue({ permissionLevel: "TEAM_ADMIN", team: "Ministry", department: "Ministry" });
    openWorkers("ministry");
    expect(await screen.findByRole("heading", { name: "Workers (1)" })).toBeInTheDocument();
    expect(screen.getByText("Dee Care")).toBeInTheDocument();
    expect(screen.queryByText("Ada Sound")).not.toBeInTheDocument();
  });

  it.each([
    { role: "admin", team: "Programs", department: "Programs" },
    { permissionLevel: "HOD", team: "Programs", department: "Sound" },
    { permissionLevel: "SUB_TEAM_ADMIN", team: "Programs", department: "Sound", assignedDepartments: ["Sound", "Protocol"] },
  ])("keeps department deep links scoped for $role $permissionLevel", async (user) => {
    getUser.mockReturnValue(user);
    openWorkers("sound");
    expect(await screen.findByRole("heading", { name: "Workers (1)" })).toBeInTheDocument();
    expect(screen.getByText("Ada Sound")).toBeInTheDocument();
    expect(screen.queryByText("Bola Protocol")).not.toBeInTheDocument();
    expect(screen.queryByText("Chi Media")).not.toBeInTheDocument();
    expect(fetchWorkers).toHaveBeenCalledWith("Sound", undefined, []);
  });
});
