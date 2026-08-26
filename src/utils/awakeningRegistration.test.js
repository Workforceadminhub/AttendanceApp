import { describe, expect, it } from "vitest";
import {
  buildAwakeningRegistrationPayload,
  formatAwakeningDays,
  getAwakeningServiceTeamQueryValues,
  normalizeAwakeningDepartment,
  normalizeAwakeningDays,
  normalizeAwakeningServiceTeam,
} from "./awakeningRegistration";

describe("Awakening registration helpers", () => {
  it("normalizes scalar and array legacy day values", () => {
    expect(normalizeAwakeningDays("wednesday_9_sept")).toEqual([
      "wednesday_9th_september",
    ]);
    expect(
      normalizeAwakeningDays([
        "thursday_10_sept",
        "FRIDAY_11TH_SEPTEMBER",
        "unknown_day",
      ])
    ).toEqual(["thursday_10th", "friday_11th"]);
  });

  it("formats multiple current and legacy days for tables and exports", () => {
    expect(formatAwakeningDays(["friday_11_sept", "sunday_13th_september"]))
      .toBe("Fri 11 September, Sun 13 September");
  });

  it("normalizes historical department and service-team labels for display", () => {
    expect(normalizeAwakeningDepartment("Media-Video")).toBe("Media");
    expect(normalizeAwakeningDepartment("Pearl ET")).toBe("Exalted Tribe");
    expect(normalizeAwakeningDepartment("Ushering - Tosin")).toBe("Ushering");
    expect(normalizeAwakeningServiceTeam("Photography")).toBe("Media");
    expect(normalizeAwakeningServiceTeam("Venue Set up")).toBe("Venue Management");
  });

  it("includes historical values when filtering a normalized service team", () => {
    expect(getAwakeningServiceTeamQueryValues("Media")).toEqual([
      "Media", "Photography", "Streaming", "Videography",
    ]);
    expect(getAwakeningServiceTeamQueryValues("Venue Management")).toEqual([
      "Venue Management", "Venue Set up",
    ]);
  });

  it("forces prayer flags to no when retained worker state becomes an attendee", () => {
    expect(
      buildAwakeningRegistrationPayload({
        registration_type: "attendee",
        join_prayer_team: "yes",
        lead_prayer_team: "yes",
      })
    ).toMatchObject({
      registration_type: "attendee",
      join_prayer_team: "no",
      lead_prayer_team: "no",
    });
  });

  it("preserves worker prayer flags and multiple serving days", () => {
    expect(
      buildAwakeningRegistrationPayload({
        registration_type: "worker",
        join_prayer_team: "yes",
        lead_prayer_team: "no",
        serving_day: ["friday_11th", "sunday_13th_september"],
      })
    ).toMatchObject({
      join_prayer_team: "yes",
      lead_prayer_team: "no",
      serving_day: ["friday_11th", "sunday_13th_september"],
    });
  });
});
