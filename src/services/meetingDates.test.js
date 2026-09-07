import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../utils/apiClient", () => ({ default: vi.fn() }));
import apiRequest from "../utils/apiClient";
import { searchMeetingWorkers, createMeetingWorker, updateMeetingWorker, markMeetingWorkerPresent, getMeetingRegistrations } from "./meeting";
beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (_method, path) => path === "/api/meeting/auth/session" ? { api_key: "test-session" } : { data: [] });
});
it.each(["leaders", "workers"])("passes the selected date on every %s meeting API operation", async (type) => {
  const date = "2026-09-19";
  await searchMeetingWorkers("Ada", null, date, type);
  expect(apiRequest).toHaveBeenLastCalledWith("GET", `/api/meeting/${type}/workers/search`, { name: "Ada", date }, expect.any(Object), false);
  await createMeetingWorker({ meeting_date: date, is_confirmed: true }, null, type);
  expect(apiRequest).toHaveBeenLastCalledWith("POST", `/api/meeting/${type}/workers`, expect.objectContaining({ meeting_date: date }), expect.any(Object), false);
  await updateMeetingWorker(1, { meeting_date: date, is_confirmed: true }, null, type);
  expect(apiRequest).toHaveBeenLastCalledWith("PUT", `/api/meeting/${type}/workers/1`, expect.objectContaining({ meeting_date: date }), expect.any(Object), false);
  await markMeetingWorkerPresent(1, { meeting_date: date }, null, type);
  expect(apiRequest).toHaveBeenLastCalledWith("POST", `/api/meeting/${type}/workers/1/present`, { meeting_date: date }, expect.any(Object), false);
  await getMeetingRegistrations(date, "all", type);
  expect(apiRequest).toHaveBeenLastCalledWith("GET", `/api/super/admin/meeting/${type}/registrations`, { meeting_date: date, status: "all" }, undefined, true);
});

it("activates a new default meeting on devices that stored an older one", async () => {
  localStorage.setItem("harvesters_meetings_config", JSON.stringify([
    { id: "leaders-default-1", meetingType: "leaders", date: "2026-08-15", title: "August", isActive: true },
  ]));
  const { getMeetingDate, getAllMeetings } = await import("../utils/meetingConfig");
  expect(getMeetingDate("leaders")).toBe("2026-09-19");
  expect(getAllMeetings("leaders").filter((m) => m.isActive).map((m) => m.date)).toEqual(["2026-09-19"]);
});
