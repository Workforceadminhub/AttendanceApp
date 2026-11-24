import { beforeEach, describe, expect, it, vi } from "vitest";
import apiRequest from "../utils/apiClient";
import { addDepartment, updateDepartment } from "./departments";
import { addNewWorker } from "./workers";

vi.mock("../utils/apiClient", () => ({
  default: vi.fn(),
  apiRequest: vi.fn(),
}));

describe("Department and Worker cluster handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({ data: {} });
  });

  describe("Department - POST and PUT accept optional cluster in payload", () => {
    it("sends cluster on addDepartment when provided", async () => {
      await addDepartment({
        name: "Faith Community",
        team: "Districts",
        route: "/faith",
        isactive: true,
        cluster: "Pastor Biola Cluster",
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "POST",
        "/api/departments",
        expect.objectContaining({
          name: "Faith Community",
          cluster: "Pastor Biola Cluster",
        })
      );
    });

    it("omits cluster on addDepartment when not provided", async () => {
      await addDepartment({
        name: "Media",
        team: "Programs",
        route: "/media",
        isactive: true,
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "POST",
        "/api/departments",
        expect.not.objectContaining({ cluster: expect.anything() })
      );
      expect(apiRequest.mock.calls[0][2]).not.toHaveProperty("cluster");
    });

    it("sends cluster on updateDepartment when provided", async () => {
      await updateDepartment({
        id: 12,
        name: "Faith Community",
        team: "Districts",
        route: "/faith",
        isactive: true,
        cluster: "Pastor Isaac Cluster",
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "PUT",
        "/api/departments",
        expect.objectContaining({
          id: 12,
          cluster: "Pastor Isaac Cluster",
        })
      );
    });

    it("omits cluster on updateDepartment when not provided", async () => {
      await updateDepartment({
        id: 14,
        name: "Sound",
        team: "Programs",
        route: "/sound",
        isactive: true,
      });

      expect(apiRequest.mock.calls[0][2]).not.toHaveProperty("cluster");
    });

  });

  describe("Worker - sends cluster if provided, omits it so worker inherits from matching department", () => {
    it("stores explicit cluster if sent via addNewWorker", async () => {
      await addNewWorker({
        firstname: "Tola",
        lastname: "Ade",
        email: "tola@example.com",
        department: "Trailblazer Community",
        team: "Districts",
        cluster: "Pastor Isaac Cluster",
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "POST",
        "/api/workers/add",
        expect.objectContaining({
          cluster: "Pastor Isaac Cluster",
          district_sub_team: "Pastor Isaac Cluster",
        }),
        undefined,
        false
      );
    });

    it("omits cluster key if not provided in addNewWorker so backend inherits it", async () => {
      await addNewWorker({
        firstname: "Tola",
        lastname: "Ade",
        email: "tola@example.com",
        department: "Trailblazer Community",
        team: "Districts",
      });

      const sentPayload = apiRequest.mock.calls[0][2];
      expect(sentPayload).not.toHaveProperty("cluster");
      expect(sentPayload).not.toHaveProperty("district_sub_team");
    });


  });
});
