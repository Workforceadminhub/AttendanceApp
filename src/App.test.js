import { describe, expect, it } from "vitest";
import { workerSchema } from "./utils/schemas";

describe("workerSchema", () => {
  const validWorker = {
    firstname: "Jane",
    lastname: "Doe",
    email: "jane@example.com",
    phonenumber: "08031234567",
    gender: "Female",
    workerrole: "Leader",
    birthdate: "1990-01-01",
  };

  it("accepts a valid worker payload", () => {
    expect(workerSchema.parse(validWorker)).toMatchObject(validWorker);
  });

  it("rejects a phone number that is not 11 digits", () => {
    expect(workerSchema.safeParse({ ...validWorker, phonenumber: "123" }).success).toBe(false);
  });
});
