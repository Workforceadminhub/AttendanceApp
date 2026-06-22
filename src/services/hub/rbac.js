import { hubGet } from "./client";

export function fetchMyRBAC() {
  return hubGet("/rbac/me");
}

export function fetchRoles() {
  return hubGet("/roles");
}
