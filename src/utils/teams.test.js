import { afterEach, describe, expect, it } from "vitest";
import { setDynamicDepartments } from "./routeObject";
import {
  filterDepartmentsForDistrictSubTeam,
  getCommunityCluster,
  isPastorBiolaCommunity,
  isPastorIsaacCommunity,
} from "./teams";

afterEach(() => setDynamicDepartments(null));

describe("community clusters", () => {
  it("uses the built-in lists for communities without a cluster from the API", () => {
    expect(getCommunityCluster("Trailblazer Community")).toBe("Pastor Isaac Cluster");
    expect(getCommunityCluster("Bethel Community")).toBe("Pastor Biola Cluster");
    expect(getCommunityCluster("Brand New Community")).toBe("");
  });

  it("puts a new community in the cluster the API gives it", () => {
    setDynamicDepartments([
      { name: "Brand New Community", team: "Districts", route: "/brand-new", cluster: "Pastor Isaac Cluster" },
      { name: "Trailblazer Community", team: "Districts", route: "/trailblazer" },
    ]);

    expect(isPastorIsaacCommunity("Brand New Community")).toBe(true);
    expect(isPastorBiolaCommunity("Brand New Community")).toBe(false);

    const names = ["Brand New Community", "Trailblazer Community"];
    expect(filterDepartmentsForDistrictSubTeam(names, "Districts", "Pastor Isaac Cluster")).toEqual([
      "Brand New Community",
      "Trailblazer Community",
    ]);
    expect(filterDepartmentsForDistrictSubTeam(names, "Districts", "Pastor Biola Cluster")).toEqual([]);
    expect(filterDepartmentsForDistrictSubTeam(names, "Districts", "")).toEqual([
      "Brand New Community",
      "Trailblazer Community",
    ]);
  });

  it("lets the API cluster override the built-in list", () => {
    setDynamicDepartments([{ name: "Bethel Community", team: "Districts", cluster: "pastor isaac" }]);

    expect(getCommunityCluster("Bethel Community")).toBe("Pastor Isaac Cluster");
  });

  it("forgets API clusters when the department list is cleared", () => {
    setDynamicDepartments([{ name: "Brand New Community", team: "Districts", cluster: "Pastor Biola Cluster" }]);
    setDynamicDepartments(null);

    expect(getCommunityCluster("Brand New Community")).toBe("");
  });
});
