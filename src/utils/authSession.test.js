import { describe, expect, it } from "vitest";
import { getLinkedWorkerId, pickSessionUser } from "./authSession";

describe("worker profile session data", () => {
  it("preserves an explicit worker profile identifier from sign-in", () => {
    const user = pickSessionUser({ id: "auth-7", worker_profile_id: "worker-42" });
    expect(user).toMatchObject({ id: "auth-7", worker_profile_id: "worker-42" });
    expect(getLinkedWorkerId(user)).toBe("worker-42");
  });

  it("does not mistake the generic account ID for a worker profile", () => {
    expect(getLinkedWorkerId({ id: "auth-7" })).toBeNull();
  });

  it("supports the existing workerId response shape", () => {
    expect(getLinkedWorkerId({ workerId: 42 })).toBe(42);
  });
});
