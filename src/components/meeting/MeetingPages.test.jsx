import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../Header", () => ({ default: () => <header data-testid="header" /> }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../../services/meeting", () => ({
  searchMeetingWorkers: vi.fn().mockResolvedValue([]),
  createMeetingWorker: vi.fn().mockResolvedValue({}),
  updateMeetingWorker: vi.fn().mockResolvedValue({}),
  markMeetingWorkerPresent: vi.fn().mockResolvedValue({}),
  getMeetingRegistrations: vi.fn().mockResolvedValue({
    data: [
      { id: 1, name: "Ada Obi", team: "Programs", department: "Ushering", is_confirmed: true, is_present: true },
      { id: 2, name: "Bola Ade", team: "Districts", department: "Community A", district_sub_team: "Pastor Isaac Cluster", is_confirmed: false, notes: "Travelling" },
      { id: 3, name: "Chi Eze", team: "NLP", department: "NLP", is_confirmed: null },
    ],
  }),
}));
vi.mock("../../services/departments", () => ({
  fetchTeamsAndDepartmentsForFilter: vi.fn().mockResolvedValue({ teams: [], departmentsByTeam: {} }),
  fetchDepartments: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../utils/getUserRole", () => ({
  getUserRole: () => ({ isSuperAdmin: true, isChurchAdmin: false, isTeamAdmin: false }),
}));
vi.mock("../../utils/getUser", () => ({ getUser: () => ({ team: "" }) }));

import LeadersMeetingConfirm from "../../pages/LeadersMeetingConfirm";
import WorkersMeetingConfirm from "../../pages/WorkersMeetingConfirm";
import LeadersMeetingPresent from "../../pages/LeadersMeetingPresent";
import WorkersMeetingPresent from "../../pages/WorkersMeetingPresent";
import LeadersMeetingReport from "../../pages/LeadersMeetingReport";
import WorkersMeetingReport from "../../pages/WorkersMeetingReport";
import LeadersMeetingPresentReport from "../../pages/LeadersMeetingPresentReport";
import WorkersMeetingPresentReport from "../../pages/WorkersMeetingPresentReport";
import { getMeetingRegistrations } from "../../services/meeting";

const renderPage = (Page) => render(<MemoryRouter><Page /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("public confirm / present pages", () => {
  it.each([
    ["LeadersMeetingConfirm", LeadersMeetingConfirm, /Leaders Meeting -/, "Confirm Your Attendance"],
    ["WorkersMeetingConfirm", WorkersMeetingConfirm, /Workers Meeting -/, "Confirm Your Attendance"],
    ["LeadersMeetingPresent", LeadersMeetingPresent, /Leaders Meeting Attendance -/, "Mark Your Attendance"],
    ["WorkersMeetingPresent", WorkersMeetingPresent, /Workers Meeting Attendance -/, "Mark Your Attendance"],
  ])("%s renders the search step", (_name, Page, title, heading) => {
    renderPage(Page);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(heading);
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Your Full Name/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Find Me/ })).toBeDisabled();
  });
});

describe("admin report pages", () => {
  it.each([
    ["LeadersMeetingReport", LeadersMeetingReport, "leaders", /Leaders Meeting Confirmation Report/, "% Confirmed"],
    ["WorkersMeetingReport", WorkersMeetingReport, "workers", /Workers Meeting Confirmation Report/, "% Confirmed"],
    ["LeadersMeetingPresentReport", LeadersMeetingPresentReport, "leaders", /Leaders Meeting Attendance Report/, "% of Present"],
    ["WorkersMeetingPresentReport", WorkersMeetingPresentReport, "workers", /Workers Meeting Attendance Report/, "% of Present"],
  ])("%s loads registrations for its meeting type", async (_name, Page, type, eyebrow, pctHeader) => {
    renderPage(Page);
    expect(screen.getByText(eyebrow)).toBeInTheDocument();
    await waitFor(() => expect(getMeetingRegistrations).toHaveBeenCalledWith(expect.any(String), "all", type));
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
    expect(screen.getByRole("columnheader", { name: pctHeader })).toBeInTheDocument();
    // Summary cells are keyboard reachable.
    const teamCell = screen.getByRole("button", { name: "Programs" });
    expect(teamCell).toHaveAttribute("tabindex", "0");
  });

  it("confirmation report drops registrations that never responded", async () => {
    renderPage(LeadersMeetingReport);
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    expect(screen.getByText(/2 of 2 registrations/)).toBeInTheDocument();
    expect(screen.getByLabelText("Directorate")).toBeInTheDocument();
  });

  it("attendance report keeps every registration", async () => {
    renderPage(WorkersMeetingPresentReport);
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    expect(screen.getByText(/3 of 3 registrations/)).toBeInTheDocument();
    expect(screen.getAllByText("Absent").length).toBeGreaterThan(0);
  });
});
