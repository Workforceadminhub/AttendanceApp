import { hubGet, hubPost, hubPut } from "./client";

export function fetchOrgTree() {
  return hubGet("/scope/tree");
}

export function fetchOrgUnits() {
  return hubGet("/scope/org-units");
}

export function createOrgUnit(name, unitType, parentId) {
  const body = { name, unit_type: unitType };
  if (parentId) body.parent_id = parentId;
  return hubPost("/scope/org-units", body);
}

export function assignAdminScope(adminId, orgUnitIds) {
  return hubPut(`/scope/admins/${adminId}`, { org_unit_ids: orgUnitIds });
}
