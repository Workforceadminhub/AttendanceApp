import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({
  hubGet: vi.fn(),
  hubPost: vi.fn(),
  hubPatch: vi.fn(),
  hubDelete: vi.fn(),
}));

import { hubGet, hubPost, hubPatch, hubDelete } from "./client";
import {
  normalizeMeeting,
  fetchMeetings,
  fetchActiveMeeting,
  createMeetingRemote,
  setActiveMeetingRemote,
  deleteMeetingRemote,
} from "./meetings";
import { getAllMeetings, getActiveMeeting, resetMeetingsCache } from "../../utils/meetingConfig";
import { meetingPath } from "../../utils/meetingLinks";

beforeEach(() => {
  localStorage.clear();
  resetMeetingsCache();
  vi.clearAllMocks();
});

describe("meetings hub service", () => {
  it("normalizes meeting data from backend snake_case", () => {
    const raw = {
      id: 15,
      meeting_type: "Leaders",
      meeting_date: "2026-10-19",
      title: "Leaders meeting october",
      notes: "October",
      set_active: true,
    };
    const norm = normalizeMeeting(raw);
    expect(norm).toEqual({
      id: 15,
      meetingType: "leaders",
      date: "2026-10-19",
      title: "Leaders meeting october",
      notes: "October",
      isActive: true,
      createdAt: expect.any(String),
    });
  });

  it("normalizes ISO timestamp and space-separated datetime strings safely", () => {
    const isoMeeting = normalizeMeeting({
      id: 16,
      meeting_type: "leaders",
      meeting_date: "2026-10-19T00:00:00.000Z",
    });
    expect(isoMeeting.date).toBe("2026-10-19");

    const spaceMeeting = normalizeMeeting({
      id: 17,
      meeting_type: "workers",
      meeting_date: "2026-10-17 00:00:00",
    });
    expect(spaceMeeting.date).toBe("2026-10-17");
  });

  it("returns null for invalid or unparseable meetings", () => {
    expect(normalizeMeeting(null)).toBeNull();
    expect(normalizeMeeting({})).toBeNull();
    expect(normalizeMeeting({ message: "No active meetings found" })).toBeNull();
    expect(normalizeMeeting({ meeting_type: "invalid_type", meeting_date: "2026-10-19" })).toBeNull();
    expect(normalizeMeeting({ meeting_type: "leaders", meeting_date: "not-a-date" })).toBeNull();
  });

  it("fetches all meetings from GET /api/hub/super/admin/meetings and syncs cache", async () => {
    hubGet.mockResolvedValueOnce({
      data: [
        {
          id: 101,
          meeting_type: "leaders",
          meeting_date: "2026-10-19",
          title: "October Leaders",
          is_active: true,
        },
      ],
    });

    const meetings = await fetchMeetings("leaders");
    expect(hubGet).toHaveBeenCalledWith("/super/admin/meetings", {
      meeting_type: "leaders",
    });
    expect(meetings).toHaveLength(1);
    expect(meetings[0].date).toBe("2026-10-19");
    expect(meetings[0].title).toBe("October Leaders");

    // Cache should also be populated
    const cached = getAllMeetings("leaders");
    expect(cached.some((m) => m.id === 101 && m.date === "2026-10-19")).toBe(true);
  });

  it("fetches active meeting from GET /api/hub/super/admin/meetings/active", async () => {
    hubGet.mockResolvedValueOnce({
      data: {
        id: 202,
        meeting_type: "workers",
        meeting_date: "2026-10-17",
        title: "October Workers",
        is_active: true,
      },
    });

    const active = await fetchActiveMeeting("workers");
    expect(hubGet).toHaveBeenCalledWith("/super/admin/meetings/active", {
      meeting_type: "workers",
    });
    expect(active.date).toBe("2026-10-17");
    expect(active.isActive).toBe(true);
  });

  it("creates a meeting via POST /api/hub/super/admin/meetings", async () => {
    hubPost.mockResolvedValueOnce({
      data: {
        id: 303,
        meeting_type: "Leaders",
        meeting_date: "2026-10-19",
        title: "Leaders meeting october",
        notes: "October",
        set_active: true,
      },
    });

    const created = await createMeetingRemote({
      meetingType: "leaders",
      date: "2026-10-19",
      title: "Leaders meeting october",
      notes: "October",
      setAsActive: true,
    });

    expect(hubPost).toHaveBeenCalledWith("/super/admin/meetings", {
      meeting_type: "Leaders",
      meeting_date: "2026-10-19",
      title: "Leaders meeting october",
      notes: "October",
      set_active: true,
    });
    expect(created.id).toBe(303);
    expect(created.date).toBe("2026-10-19");
  });

  it("retries createMeetingRemote with lowercase meeting_type when capitalized fails", async () => {
    hubPost
      .mockRejectedValueOnce(new Error("meeting_type must be leaders or workers"))
      .mockResolvedValueOnce({
        data: {
          id: 304,
          meeting_type: "leaders",
          meeting_date: "2026-10-19",
          title: "Leaders meeting october",
          notes: "Leaders meeting october",
          set_active: true,
        },
      });

    const created = await createMeetingRemote({
      meetingType: "leaders",
      date: "2026-10-19",
    });

    expect(hubPost).toHaveBeenCalledTimes(2);
    expect(hubPost).toHaveBeenLastCalledWith("/super/admin/meetings", expect.objectContaining({
      meeting_type: "leaders",
      meeting_date: "2026-10-19",
    }));
    expect(created.id).toBe(304);
  });

  it("throws error when createMeetingRemote fails and does not silently fall back to localStorage", async () => {
    hubPost.mockRejectedValue(new Error("Unauthorized"));

    await expect(
      createMeetingRemote({
        meetingType: "leaders",
        date: "2026-10-19",
      })
    ).rejects.toThrow("Unauthorized");
  });

  it("sets active meeting via PATCH /api/hub/super/admin/meetings/{id}/active", async () => {
    hubPatch.mockResolvedValueOnce({ success: true });

    await setActiveMeetingRemote(55);
    expect(hubPatch).toHaveBeenCalledWith("/super/admin/meetings/55/active");
  });

  it("fetches active meetings when backend returns an envelope with both leaders and workers", async () => {
    hubGet.mockResolvedValueOnce({
      data: {
        leaders: {
          id: 401,
          meeting_type: "leaders",
          meeting_date: "2026-10-19T00:00:00.000Z",
          title: "Leaders October",
        },
        workers: {
          id: 402,
          meeting_type: "workers",
          meeting_date: "2026-10-17 00:00:00",
          title: "Workers October",
        },
      },
    });

    await fetchActiveMeeting(); // No meetingType specified, e.g. on Dashboard load
    const activeLeaders = getActiveMeeting("leaders");
    const activeWorkers = getActiveMeeting("workers");

    expect(activeLeaders.date).toBe("2026-10-19");
    expect(activeWorkers.date).toBe("2026-10-17");
  });

  it("meetingPath safely generates paths and never throws an exception", () => {
    // Normal date
    expect(meetingPath("leaders", "2026-10-19", "confirmationReport")).toBe(
      "/report/confirmation-leaders-meeting?meeting_date=2026-10-19"
    );
    // ISO date
    expect(meetingPath("leaders", "2026-10-19T00:00:00.000Z", "confirmationReport")).toBe(
      "/report/confirmation-leaders-meeting?meeting_date=2026-10-19"
    );
    // Invalid or missing date falls back without throwing
    expect(meetingPath("leaders", "", "confirmationReport")).toBe(
      "/report/confirmation-leaders-meeting"
    );
    expect(meetingPath("leaders", null, "attendanceReport")).toBe(
      "/report/leaders-meeting"
    );
    expect(meetingPath(null, "2026-10-19", "confirm")).toBe("/leadersmeeting/confirm");
  });

  it("deletes a meeting via DELETE /api/hub/super/admin/meetings/{id}", async () => {
    hubDelete.mockResolvedValueOnce({ success: true, message: "Meeting deleted." });

    await deleteMeetingRemote(77);
    expect(hubDelete).toHaveBeenCalledWith("/super/admin/meetings/77");
  });

  it("fetches meetings when lowercase query fails and capitalized succeeds", async () => {
    hubGet
      .mockRejectedValueOnce(new Error("Unknown filter"))
      .mockResolvedValueOnce({
        data: [
          {
            id: 501,
            meeting_date: "2026-10-17",
            title: "October Leaders Meeting",
            is_active: true,
          },
        ],
      });

    const meetings = await fetchMeetings("leaders");
    expect(hubGet).toHaveBeenCalledTimes(2);
    expect(meetings).toHaveLength(1);
    expect(meetings[0].date).toBe("2026-10-17");
    expect(meetings[0].meetingType).toBe("leaders");
  });

  it("normalizes meetings where meeting_type is omitted by using fallbackType", () => {
    const raw = {
      id: 601,
      meeting_date: "2026-10-17",
      title: "October Leaders",
      is_active: true,
    };
    const norm = normalizeMeeting(raw, "leaders");
    expect(norm).not.toBeNull();
    expect(norm.meetingType).toBe("leaders");
    expect(norm.date).toBe("2026-10-17");
  });
});
