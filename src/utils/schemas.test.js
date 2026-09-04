import { describe, expect, it } from "vitest";
import {
  AWAKENING_ATTENDANCE_DAYS,
  AWAKENING_SERVICE_TEAMS,
  awakeningRegistrationSchema,
  isValidAwakeningPhone,
  workerSchema,
} from "./schemas";
import { getAwakeningDepartmentOptions } from "./awakeningRegistration";

const attendeeFormValues = {
  first_name: "Ada",
  last_name: "Okafor",
  phone: "+2348012345678",
  email: "ada@example.com",
  campus: "Gbagada",
  registration_type: "attendee",
  belongs_to_cell: "no",
  cell_designation: "",
  foundation_course_status: "yes",
  attendance_day: ["thursday_10th"],
  worker_team: "",
  department: "",
  worker_designation: "",
  preferred_service_team: "",
  serving_day: [],
  join_prayer_team: "",
  lead_prayer_team: "",
};

describe("awakeningRegistrationSchema", () => {
  it("accepts an attendee while ignoring empty conditional fields", () => {
    expect(awakeningRegistrationSchema.safeParse(attendeeFormValues).success).toBe(true);
  });

  it("uses the exact conference-day values accepted by the API", () => {
    expect(AWAKENING_ATTENDANCE_DAYS.map(({ value }) => value)).toEqual([
      "wednesday_9th_september",
      "thursday_10th",
      "friday_11th",
      "sunday_13th_september",
      "all_days",
    ]);
  });

  it("offers only backend-accepted Awakening service teams", () => {
    expect(AWAKENING_SERVICE_TEAMS).toEqual(
      expect.arrayContaining(["Photography", "Streaming", "Videography", "Venue Set up", "NextGen"])
    );
    expect(AWAKENING_SERVICE_TEAMS).toContain("NextGen");
    expect(AWAKENING_SERVICE_TEAMS).not.toContain("Media");
    expect(AWAKENING_SERVICE_TEAMS).not.toContain("Venue Management");
  });

  it("accepts NextGen and normalizes Next Gen as preferred service team", () => {
    const workerBase = {
      first_name: "Tolu",
      last_name: "Alabi",
      phone: "08012345678",
      email: "tolu@example.com",
      campus: "Gbagada",
      registration_type: "worker",
      belongs_to_cell: "no",
      foundation_course_status: "yes",
      attendance_day: ["all_days"],
      worker_team: "Next Gen",
      department: "Kidszone",
      worker_designation: "Worker",
      preferred_service_team: "NextGen",
      serving_day: ["all_days"],
      join_prayer_team: "no",
      lead_prayer_team: "no",
    };
    const parsedNextGen = awakeningRegistrationSchema.safeParse(workerBase);
    expect(parsedNextGen.success).toBe(true);
    expect(parsedNextGen.data.preferred_service_team).toBe("NextGen");

    const parsedWithSpace = awakeningRegistrationSchema.safeParse({
      ...workerBase,
      preferred_service_team: "Next Gen",
    });
    expect(parsedWithSpace.success).toBe(true);
    expect(parsedWithSpace.data.preferred_service_team).toBe("NextGen");
  });

  it("groups every specialist department variant for Awakening", () => {
    expect(
      getAwakeningDepartmentOptions([
        { department: "Media-Photo (Capturing)" },
        { department: "Media-Video" },
        { department: "Venue Management - Zeina team" },
        { department: "Venue Management - Tosin Agbetuyi team" },
        { department: "Greeters - Team Jireh" },
        { department: "Greeters - Team Yahweh" },
        { department: "Ushering - Bimpe" },
        { department: "Ushering - Tosin" },
        { department: "Administration - Kidszone" },
        { department: "Administration - Stirhouse" },
        { department: "Learning and Development - Kidszone" },
        { department: "Learning and Development - Stirhouse" },
        { department: "Programming and Environment - Kidszone" },
        { department: "Programming and Environment - Stirhouse" },
        { department: "Reach and Partnership - Kidszone" },
        { department: "Reach and Partnership - Stirhouse" },
        { department: "Diamond ET" },
        { department: "Emerald ET" },
        { department: "Pearl ET" },
        { department: "Sapphire ET" },
      ])
    ).toEqual([
      "Exalted Tribe",
      "Greeters",
      "Kidszone",
      "Media",
      "Stirhouse",
      "Ushering",
      "Venue Management",
    ]);
  });

  it("accepts local and +234 phone formats", () => {
    expect(isValidAwakeningPhone("08012345678")).toBe(true);
    expect(isValidAwakeningPhone("+2348012345678")).toBe(true);
  });

  it("does not change the local-only worker phone contract", () => {
    const worker = {
      firstname: "Ada",
      lastname: "Okafor",
      email: "ada@example.com",
      phonenumber: "+2348012345678",
      gender: "Female",
      workerrole: "Worker",
      birthdate: "1990-01-01",
    };
    expect(workerSchema.safeParse(worker).success).toBe(false);
  });
});
