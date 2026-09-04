import { hubGet } from "./client";

export function fetchMyRBAC() {
  return hubGet("/rbac/me");
}
