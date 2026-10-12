import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TeamWorkerPlacement from "./TeamWorkerPlacement";
vi.mock("../components/Layout", () => ({ default: ({ children }) => children }));
vi.mock("../utils/getUserRole", () => ({ getUserRole: () => ({ isTeamAdmin: true, user: { team: "Programs" } }), canAccessDepartment: () => true }));
vi.mock("../contexts/DepartmentsContext", () => ({ useDepartmentsContext: () => ({ departments: [
  { name: "Sound", team: "Programs", route: "/sound", isactive: true },
  { name: "Sound", team: "Programs", route: "/sound", isactive: true },
  { name: "Inactive", team: "Programs", route: "/inactive", isactive: false },
  { name: "Pastoral Care", team: "Ministry", route: "/pascares", isactive: true },
] }), useEffectiveRouteList: () => [
  { team: "Programs", department: "Sound", route: "/sound" },
  { team: "Programs", department: "Programs", route: "/admin/programs" },
  { team: "Ministry", department: "Pastoral Care", route: "/pascares" },
] }));
afterEach(cleanup);
describe("Team worker placement", () => {
  it.each([false, true])("chooses a department before opening a form (bulk=%s)", (bulk) => {
    render(<MemoryRouter initialEntries={["/department/admin/programs/add-worker"]}><Routes>
      <Route path="/department/admin/:teamRoute/add-worker" element={<TeamWorkerPlacement bulk={bulk} />} />
      <Route path={`/department/sound/${bulk ? "bulk-add" : "add-worker"}`} element={<p>Department form opened</p>} />
    </Routes></MemoryRouter>);
    const button = screen.getByRole("button", { name: /Continue to/ });
    expect(button).toBeDisabled();
    expect(screen.getAllByRole("option", { name: "Sound", exact: true })).toHaveLength(1);
    expect(screen.queryByRole("option", { name: "Inactive" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Pastoral Care" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "/sound" } });
    fireEvent.click(button);
    expect(screen.getByText("Department form opened")).toBeInTheDocument();
  });
  it("rejects another team's chooser", () => {
    render(<MemoryRouter initialEntries={["/department/admin/ministry/add-worker"]}><Routes>
      <Route path="/department/admin/:teamRoute/add-worker" element={<TeamWorkerPlacement />} />
    </Routes></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("cannot add workers to this team");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
