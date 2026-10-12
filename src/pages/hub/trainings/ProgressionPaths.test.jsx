import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProgressionPaths from "./ProgressionPaths";
import { normalizePathwaySteps } from "./pathwaySteps";
import { trainingConsoleCopy } from "./trainingConsoleCopy";
import { fetchAllTrainings, fetchProgressionPaths, updateProgressionPath, updateProgressionPathSteps } from "../../../services/hub/trainings";

vi.mock("../../../services/hub/trainings", () => ({
  fetchAllTrainings: vi.fn(), fetchProgressionPaths: vi.fn(),
  createProgressionPath: vi.fn(), deleteProgressionPath: vi.fn(),
  updateProgressionPath: vi.fn(), updateProgressionPathSteps: vi.fn(),
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function renderPath(steps) {
  fetchProgressionPaths.mockResolvedValue({ data: [{ id: "path", name: "blc", steps }] });
  fetchAllTrainings.mockResolvedValue({ data: [{ id: "one", name: "Foundation" }] });
  updateProgressionPath.mockResolvedValue({});
  updateProgressionPathSteps.mockResolvedValue({});
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ProgressionPaths /></QueryClientProvider>);
}

describe("pathway level continuity", () => {
  it("retains unavailable levels on the card and in the editor, and preserves their explicit training references on save", async () => {
    renderPath([{ id: "step-one", training_program_id: "one" }, { id: "step-two", training_program_id: "missing" }]);
    expect(await screen.findByText("2 levels")).toBeInTheDocument();
    expect(screen.getByText("Unavailable training (missing)")).toBeInTheDocument();
    expect(screen.queryByText("No trainings on this pathway yet.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit pathway" }));
    const form = screen.getByRole("button", { name: "Save Pathway" }).closest("form");
    expect(within(form).getByText("Unavailable training (missing)")).toBeInTheDocument();
    expect(within(form).getByText("Foundation")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Pathway" }));
    await waitFor(() => expect(updateProgressionPathSteps).toHaveBeenCalledWith("path", [{ training_program_id: "one" }, { training_program_id: "missing" }]));
  });

  it("does not reinterpret a step id as a training id or write an unresolvable step", async () => {
    renderPath([{ id: "one" }, { id: "another-step" }]);
    expect(await screen.findByText("2 levels")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit pathway" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Pathway" }));
    expect(updateProgressionPath).not.toHaveBeenCalled();
    expect(updateProgressionPathSteps).not.toHaveBeenCalled();
    expect(screen.getAllByText("Unavailable training (reference missing)")).toHaveLength(4);
  });

  it("supports nested training references and legacy chains without stored steps", () => {
    const trainings = [{ id: "one", name: "Foundation", progression_path_id: "path" }];
    expect(normalizePathwaySteps({ id: "path", levels: [{ training: trainings[0] }] }, trainings)[0]).toMatchObject({ trainingId: "one", name: "Foundation" });
    expect(normalizePathwaySteps({ id: "path" }, trainings)[0]).toMatchObject({ trainingId: "one", name: "Foundation" });
  });
});

describe("training console scope", () => {
  it("uses the team admin's RBAC scope and handles legacy team names", () => {
    expect(trainingConsoleCopy({ isTeamAdmin: true, user: { team: "Legacy" } }, { teamNames: ["Programs"] })).toEqual({
      label: "Team Admin Console", description: "Manage training modules, cohorts, and certification metrics for Programs.",
    });
    expect(trainingConsoleCopy({ isTeamAdmin: true, user: { team: { name: "Programs" } } }).description).toContain("Programs");
  });
  it("identifies assigned-department scope for sub-team admins", () => {
    expect(trainingConsoleCopy({ isSubTeamAdmin: true }, { departmentNames: ["Sound", "Media"] })).toMatchObject({ label: "Sub-Team Admin Console", description: expect.stringContaining("Sound, Media") });
  });
  it("distinguishes campus and super admin scopes", () => {
    expect(trainingConsoleCopy({ isChurchAdmin: true }).description).toContain("your campus");
    expect(trainingConsoleCopy({ isSuperAdmin: true }).description).toContain("authorized campuses");
  });
});
