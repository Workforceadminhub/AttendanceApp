import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setDynamicDepartments } from "../utils/routeObject";
import { fetchDepartments } from "./departments";
import { fetchWorkers } from "./workers";
import { resolveWorkerForEditing } from "./workerEditAccess";

vi.mock("./departments", () => ({ fetchDepartments: vi.fn() }));
vi.mock("./workers", () => ({ fetchWorkers: vi.fn() }));
const profile = { id: 7, department: "Old API Name", team: "API Team", firstname: "Worker" };
const current = { id: 7, department: "Entirely New API Name", team: "API Team" };
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.setItem("authUser", JSON.stringify({role:"admin",team:"API Team"}));
  fetchDepartments.mockImplementation(async () => {
    setDynamicDepartments([{name:current.department,route:"/opaque-api-route",team:current.team}]);
    return [];
  });
  fetchWorkers.mockResolvedValue([current]);
});
afterEach(() => { sessionStorage.clear(); setDynamicDepartments(null); });

it("reconciles arbitrary stale names by worker ID in the API roster", async () => {
  expect(await resolveWorkerForEditing(profile)).toEqual({...profile,department:current.department});
  expect(fetchWorkers).toHaveBeenCalledWith("API Team");
});

it.each([
  {permissionLevel:"HOD",department:current.department},
  {permissionLevel:"HOD",department:profile.department,route:"/opaque-api-route"},
  {permissionLevel:"SUB_TEAM_ADMIN",assignedDepartments:["/opaque-api-route"]},
])("resolves the current API placement within $permissionLevel scope", async user => {
  sessionStorage.setItem("authUser",JSON.stringify(user));
  expect(await resolveWorkerForEditing(profile)).toEqual({...profile,department:current.department});
  expect(fetchWorkers).toHaveBeenCalledWith(current.department);
});

it("rejects a matching name with a different worker ID", async () => {
  fetchWorkers.mockResolvedValue([{...current,id:8}]);
  expect(await resolveWorkerForEditing(profile)).toBeNull();
});

it("rejects a broader roster response outside the authorized team", async () => {
  fetchWorkers.mockResolvedValue([{...current,team:"Other API Team"}]);
  expect(await resolveWorkerForEditing(profile)).toBeNull();
});

it("rejects a broader response from another department for an HOD", async () => {
  sessionStorage.setItem("authUser", JSON.stringify({permissionLevel:"HOD",department:current.department}));
  fetchDepartments.mockImplementation(async () => {
    setDynamicDepartments([
      {name:current.department,route:"/opaque-api-route",team:current.team},
      {name:"Other API Department",route:"/other-api-route",team:current.team},
    ]);
    return [];
  });
  fetchWorkers.mockResolvedValue([{...current,department:"Other API Department"}]);
  expect(await resolveWorkerForEditing(profile)).toBeNull();
});

it("rejects an unrecognized roster department instead of inventing a mapping", async () => {
  fetchWorkers.mockResolvedValue([{...current,department:"Unmapped API Name"}]);
  expect(await resolveWorkerForEditing(profile)).toBeNull();
});

it("does not fetch the roster when details already use an authorized API name", async () => {
  expect(await resolveWorkerForEditing(current)).toEqual(current);
  expect(fetchWorkers).not.toHaveBeenCalled();
});
