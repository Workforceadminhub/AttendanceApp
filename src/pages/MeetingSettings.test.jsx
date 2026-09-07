import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MeetingSettings from "./MeetingSettings";
import useMeetingDate from "../components/meeting/useMeetingDate";
import { createMeeting, getAllMeetings } from "../utils/meetingConfig";
vi.mock("../components/Header", () => ({ default: () => null }));
vi.mock("../utils/getUserRole", () => ({ getUserRole: () => ({ isSuperAdmin: true }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
beforeEach(() => localStorage.clear());
afterEach(cleanup);
it("counts saved meetings and copies a dated confirmation link", async () => {
  createMeeting({ date: "2026-09-19", title: "September Leaders" });
  const writeText = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<MemoryRouter><MeetingSettings /></MemoryRouter>);
  expect(await screen.findByText("Leaders (2 total)")).toBeInTheDocument();
  expect(getAllMeetings("leaders").filter(m => m.isActive)).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Copy link for September Leaders" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/leadersmeeting/confirm?meeting_date=2026-09-19`));
});
it("provides a selectable link when clipboard access fails", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error()) } });
  render(<MemoryRouter><MeetingSettings /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Copy link for August 2026 Leaders/ }));
  expect(await screen.findByLabelText("Select and copy this meeting link")).toHaveValue(`${window.location.origin}/leadersmeeting/confirm?meeting_date=2026-08-15`);
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
  expect(await screen.findByText("2026-08-15")).toBeInTheDocument();
});


it("creates dated links for confirmation, attendance, and both reports", async () => {
  const writeText = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<MemoryRouter><MeetingSettings /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/Meeting Date/), { target: { value: "2026-09-19" } });
  fireEvent.change(screen.getByLabelText(/Meeting Title/), { target: { value: "September" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Meeting" }));
  fireEvent.click(screen.getByRole("button", { name: "Copy attendance link for September" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/leaders-meeting?meeting_date=2026-09-19`));
  expect(screen.getAllByRole("link", { name: "Confirmation Report" }).some(link => link.getAttribute("href") === "/report/confirmation-leaders-meeting?meeting_date=2026-09-19")).toBe(true);
  expect(screen.getAllByRole("link", { name: "Attendance Report" }).some(link => link.getAttribute("href") === "/report/leaders-meeting?meeting_date=2026-09-19")).toBe(true);
});
