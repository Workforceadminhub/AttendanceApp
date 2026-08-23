import { describe, expect, it } from "vitest";
import {
  AWAKENING_ATTENDANCE_DAYS,
  awakeningRegistrationSchema,
  isValidAwakeningPhone,
  workerSchema,
} from "./schemas";

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
