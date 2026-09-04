import { describe, expect, it } from "vitest";
import { validateAuthenticatedWorker } from "./workerFormValidation";

const validWorker = {
  firstname: "Ada",
  lastname: "Okafor",
  email: "ada@example.com",
  phonenumber: "08012345678",
  team: "Programs",
  department: "Sound",
  workerrole: "Worker",
  birthdate: "12th January",
  maritalstatus: "Single",
  agerange: "26-30",
  gender: "Female",
  employment: "Employed",
  occupation: "Engineer",
  address: "1 Church Street",
  district_sub_team: "",
};

describe("validateAuthenticatedWorker", () => {
  it("accepts a complete non-district worker", () => {
    expect(validateAuthenticatedWorker(validWorker)).toEqual({});
  });

  it("returns persistent field-specific errors for malformed contact details", () => {
    expect(
      validateAuthenticatedWorker({ ...validWorker, email: "ada@", phonenumber: "08012" })
    ).toMatchObject({
      email: "Enter a valid email address, such as name@example.com.",
      phonenumber: "Phone number must contain exactly 11 digits.",
    });
  });

  it("requires a district/sub-team for either district team spelling", () => {
    for (const team of ["District", "Districts"]) {
      expect(validateAuthenticatedWorker({ ...validWorker, team })).toMatchObject({
        district_sub_team: "Select a district or sub-team.",
      });
    }
  });

  it("supports HOD forms whose placement comes from the route", () => {
    const worker = { ...validWorker, team: "", department: "" };
    expect(
      validateAuthenticatedWorker(worker, { includePlacement: false, requireOccupation: true })
    ).toEqual({});
  });
});
