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
import { getAllMeetings, getActiveMeeting } from "../../utils/meetingConfig";

beforeEach(() => {
  localStorage.clear();
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

  it("sets active meeting via PATCH /api/hub/super/admin/meetings/{id}/active", async () => {
    hubPatch.mockResolvedValueOnce({ success: true });

    await setActiveMeetingRemote(55);
    expect(hubPatch).toHaveBeenCalledWith("/super/admin/meetings/55/active");
  });

  it("deletes a meeting via DELETE /api/hub/super/admin/meetings/{id}", async () => {
    hubDelete.mockResolvedValueOnce({ success: true, message: "Meeting deleted." });

    await deleteMeetingRemote(77);
    expect(hubDelete).toHaveBeenCalledWith("/super/admin/meetings/77");
  });
});
