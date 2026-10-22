import { beforeEach, describe, expect, it, vi } from "vitest";
import apiRequest from "../utils/apiClient";
import { addDepartment, updateDepartment } from "./departments";
import { addNewWorker } from "./workers";
import { departmentsApi, workersApi } from "../utils/api";

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

    it("departmentsApi.create and departmentsApi.update accept optional cluster", async () => {
      await departmentsApi.create({
        name: "Community X",
        team: "Districts",
        route: "/cx",
        isactive: true,
        cluster: "Pastor Biola Cluster",
      });
      expect(apiRequest).toHaveBeenLastCalledWith(
        "POST",
        "/api/departments",
        expect.objectContaining({ cluster: "Pastor Biola Cluster" })
      );

      await departmentsApi.create({
        name: "Community Y",
        team: "Districts",
        route: "/cy",
        isactive: true,
      });
      expect(apiRequest.mock.calls[1][2]).not.toHaveProperty("cluster");

      await departmentsApi.update({
        id: 5,
        name: "Community X",
        team: "Districts",
        route: "/cx",
        isactive: true,
        cluster: "Pastor Isaac Cluster",
      });
      expect(apiRequest).toHaveBeenLastCalledWith(
        "PUT",
        "/api/departments",
        expect.objectContaining({ id: 5, cluster: "Pastor Isaac Cluster" })
      );
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

    it("workersApi.create includes cluster when provided and omits when not", async () => {
      // With cluster
      await workersApi.create({
        firstname: "John",
        lastname: "Doe",
        department: "Faith Community",
        cluster: "Pastor Biola Cluster",
      });
      expect(apiRequest).toHaveBeenLastCalledWith(
        "POST",
        "/api/super/admin/workers",
        expect.objectContaining({ cluster: "Pastor Biola Cluster" })
      );

      // Without cluster (omits it to inherit from department)
      await workersApi.create({
        firstname: "Jane",
        lastname: "Doe",
        department: "Faith Community",
      });
      const payloadWithoutCluster = apiRequest.mock.calls[1][1];
      expect(payloadWithoutCluster).not.toHaveProperty("cluster");
      expect(payloadWithoutCluster).not.toHaveProperty("district_sub_team");
    });

    it("workersApi.update sends cluster when provided and removes when cleared/empty", async () => {
      await workersApi.update({
        id: 10,
        cluster: "Pastor Isaac Cluster",
      });
      expect(apiRequest).toHaveBeenLastCalledWith(
        "PUT",
        "/api/super/admin/workers",
        expect.objectContaining({ id: 10, cluster: "Pastor Isaac Cluster" })
      );

      await workersApi.update({
        id: 10,
        cluster: "",
      });
      const clearedPayload = apiRequest.mock.calls[1][1];
      expect(clearedPayload).not.toHaveProperty("cluster");
      expect(clearedPayload).not.toHaveProperty("district_sub_team");
    });
  });
});
