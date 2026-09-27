import { describe, expect, it } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { invalidateAttendanceQueries } from "./attendance";

describe("invalidateAttendanceQueries", () => {
  it("drops cached attendance for other pages and refetches what is on screen", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboardAttendance", "admin", "All"], [{ present: 1 }]);
    queryClient.setQueryData(["sundayAttendance", 2026, ""], []);
    queryClient.setQueryData(["unrelated"], "kept");

    let fetches = 0;
    const observer = new QueryObserver(queryClient, {
      queryKey: ["attendanceHistory", "Sound"],
      queryFn: async () => ++fetches,
    });
    const unsubscribe = observer.subscribe(() => {});
    await queryClient.fetchQuery({ queryKey: ["attendanceHistory", "Sound"] });
    const before = fetches;

    invalidateAttendanceQueries(queryClient);

    expect(queryClient.getQueryData(["dashboardAttendance", "admin", "All"])).toBeUndefined();
    expect(queryClient.getQueryData(["sundayAttendance", 2026, ""])).toBeUndefined();
    expect(queryClient.getQueryData(["unrelated"])).toBe("kept");
    await queryClient.getQueryCache().find({ queryKey: ["attendanceHistory", "Sound"] }).promise;
    expect(fetches).toBeGreaterThan(before);
    unsubscribe();
  });
});
