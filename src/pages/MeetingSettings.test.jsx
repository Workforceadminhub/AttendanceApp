import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MeetingSettings from "./MeetingSettings";
import useMeetingDate from "../components/meeting/useMeetingDate";
import { createMeeting, getAllMeetings, resetMeetingsCache } from "../utils/meetingConfig";
vi.mock("../components/Header", () => ({ default: () => null }));
vi.mock("../utils/getUserRole", () => ({ getUserRole: () => ({ isSuperAdmin: true }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../services/hub/client", () => ({
  hubGet: vi.fn().mockRejectedValue(new Error("Network unmocked")),
  hubPost: vi.fn().mockImplementation(async (url, data) => ({
    data: {
      id: 123,
      meeting_type: data.meeting_type,
      meeting_date: data.meeting_date,
      title: data.title,
      notes: data.notes,
      is_active: data.set_active,
    },
  })),
  hubPatch: vi.fn().mockResolvedValue({ success: true }),
  hubDelete: vi.fn().mockResolvedValue({ success: true }),
}));
beforeEach(() => {
  localStorage.clear();
  resetMeetingsCache();
});
afterEach(cleanup);
it("counts saved meetings and copies a plain confirmation link", async () => {
  createMeeting({ date: "2026-09-19", title: "September Leaders" });
  const writeText = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<MemoryRouter><MeetingSettings /></MemoryRouter>);
  expect(await screen.findByText("Leaders (2 total)")).toBeInTheDocument();
  expect(getAllMeetings("leaders").filter(m => m.isActive)).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Copy link for September Leaders" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/leadersmeeting/confirm`));
});
it("provides a selectable link when clipboard access fails", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error()) } });
  render(<MemoryRouter><MeetingSettings /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Copy link for September 2026 Leaders/ }));
  expect(await screen.findByLabelText("Select and copy this meeting link")).toHaveValue(`${window.location.origin}/leadersmeeting/confirm`);
});
function DateProbe() {
  const { meetingDate } = useMeetingDate("workers");
  return <output>{meetingDate}</output>;
}
it("keeps a shared meeting date on a fresh browser and after active meeting changes", () => {
  render(<MemoryRouter initialEntries={["/workersmeeting/confirm?meeting_date=2026-09-19"]}><DateProbe /></MemoryRouter>);
  expect(screen.getByText("2026-09-19")).toBeInTheDocument();
  createMeeting({ meetingType: "workers", date: "2026-10-17" });
  fireEvent.focus(window);
  expect(screen.getByText("2026-09-19")).toBeInTheDocument();
});
it("ignores an impossible date in a link", async () => {
  render(<MemoryRouter initialEntries={["/?meeting_date=2026-02-30"]}><DateProbe /></MemoryRouter>);
  expect(await screen.findByText("2026-09-19")).toBeInTheDocument();
});


it("creates plain attendance links and dated report links", async () => {
  const writeText = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<MemoryRouter><MeetingSettings /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/Meeting Date/), { target: { value: "2026-09-19" } });
  fireEvent.change(screen.getByLabelText(/Meeting Title/), { target: { value: "September" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Meeting" }));
  const copyBtn = await screen.findByRole("button", { name: "Copy attendance link for September" });
  fireEvent.click(copyBtn);
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/leaders-meeting`));
  expect(screen.getAllByRole("link", { name: "Confirmation Report" }).some(link => link.getAttribute("href") === "/report/confirmation-leaders-meeting?meeting_date=2026-09-19")).toBe(true);
  expect(screen.getAllByRole("link", { name: "Attendance Report" }).some(link => link.getAttribute("href") === "/report/leaders-meeting?meeting_date=2026-09-19")).toBe(true);
});

it("permanently deletes an active meeting and activates the remaining meeting", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  // Create an older meeting so we have 2 workers meetings (like the user scenario)
  createMeeting({ meetingType: "workers", date: "2026-08-15", title: "August 2026 Workers Meeting", setAsActive: false });
  
  render(<MemoryRouter><MeetingSettings /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /Workers \(2 total\)/ }));

  expect(await screen.findByText("September 2026 Workers Meeting")).toBeInTheDocument();
  expect(screen.getByText("August 2026 Workers Meeting")).toBeInTheDocument();

  // Find delete button on the September meeting card
  const septCard = screen.getByText("September 2026 Workers Meeting").closest("div.rounded-xl");
  const deleteBtn = within(septCard).getByRole("button", { name: "Delete" });
  fireEvent.click(deleteBtn);

  // September should be gone, August should remain and now be Active
  await waitFor(() => {
    expect(screen.queryByText("September 2026 Workers Meeting")).not.toBeInTheDocument();
  });
  expect(await screen.findByText("August 2026 Workers Meeting")).toBeInTheDocument();
  expect(await screen.findByText("Workers (1 total)")).toBeInTheDocument();

  // Check that querying meetings again does not resurrect September 2026 Workers Meeting
  const remaining = getAllMeetings("workers");
  expect(remaining).toHaveLength(1);
  expect(remaining[0].title).toBe("August 2026 Workers Meeting");
  expect(remaining[0].isActive).toBe(true);
});

it("empties the list when the last meeting is deleted and does not resurrect default meetings", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<MemoryRouter><MeetingSettings /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /Workers \(1 total\)/ }));

  expect(await screen.findByText("September 2026 Workers Meeting")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  await waitFor(() => {
    expect(screen.queryByText("September 2026 Workers Meeting")).not.toBeInTheDocument();
  });
  expect(await screen.findByText("Workers (0 total)")).toBeInTheDocument();
  expect(await screen.findByText(/No Workers meetings found/)).toBeInTheDocument();
  expect(getAllMeetings("workers")).toHaveLength(0);
});

