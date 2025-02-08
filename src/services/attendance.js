import { ADMIN_ENUMS } from "../utils/adminEnums";
import {getNextSunday} from "../utils/getDate";
import getDefaultSummary from "../utils/getDefaultSummary";
import { specialDepartments } from "../utils/routeObject";
import { supabase } from "./supabaseClient";

const table = "attendance";
// const table = "attendance2";
const joinOps = "attendance.eq.Present,attendance.eq.Online";
export const addAttendance = async (attendance) => {
  const dateForAttendance = getNextSunday();
  try {
    console.log(attendance)
    await supabase
      .from(table)
      .delete()
      .in(
        "workerid",
        attendance.map((item) => item.workerid)
      )
      .eq("attendancedate", dateForAttendance);

    const { data, error } = await supabase.from(table).insert(attendance);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error adding attendance:", error.message);
    return null;
  }
};

function getDepartmentSummary(data) {
  const departmentSummary = {};

  data.forEach((record) => {
    const department = record.department;
    if (departmentSummary[department]) {
      departmentSummary[department]++;
    } else {
      departmentSummary[department] = 1;
    }
  });

  return departmentSummary;
}

function getDepartmentTotals(data) {
  const departmentTotals = {};

  data.forEach((record) => {
    const department = record.department;
    if (departmentTotals[department]) {
      departmentTotals[department]++;
    } else {
      departmentTotals[department] = 1;
    }
  });

  return departmentTotals;
}

function updateDefaultSummary(defaultSummary, totals, presentSummary) {
  return defaultSummary.map((summary) => {
    const strength = totals[summary.department] || 0;
    const present = presentSummary[summary.department] || 0;
    return {
      ...summary,
      total: strength,
      present,
      absent: strength - present,
      percentage:
        strength > 0 ? `${((present / strength) * 100).toFixed(2)}%` : "0%",
    };
  });
}

export const fetchAdminAttendance = async (activeGroup, isChurchAdmin) => {
  const dateForAttendance = getNextSunday();
  const authUser = sessionStorage.getItem("authUser");
  if (!authUser) {
    throw new Error("User not authenticated");
  }
  const parsedUser = JSON.parse(authUser);
  const team = parsedUser.team || "";

  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("attendancedate", dateForAttendance)
      .or(joinOps);

    if (error) {
      throw error;
    }

    const { data: worker, error: workerError } = await supabase
      .from("worker")
      .select("*");

    const { data: routes, error: routesError } = await supabase
      .from("admin")
      .select("*");

    if (routesError) {
      throw routesError;
    }
    if (workerError) {
      throw workerError;
    }

    let uniqueRoutes;
    if (activeGroup === "All") {
      uniqueRoutes = routes
        .filter(
          (item, index, self) =>
            index ===
            self.findIndex((obj) => obj.department === item.department)
        )
        .filter((item) => !specialDepartments?.includes(item.department));
    }

    if (activeGroup !== "All" && isChurchAdmin) {
      uniqueRoutes = routes
        .filter(
          (item, index, self) =>
            index ===
            self.findIndex((obj) => obj.department === item.department)
        )
        .filter((item) => !specialDepartments?.includes(item.department))
        .filter((item) => item.team === activeGroup);
    }

    if (activeGroup !== "All" && !isChurchAdmin) {
      uniqueRoutes = routes
        .filter(
          (item, index, self) =>
            index ===
            self.findIndex((obj) => obj.department === item.department)
        )
        .filter((item) => !specialDepartments?.includes(item.department))
        .filter((item) => item.department === activeGroup);
    }

    const departmentTotals = getDepartmentTotals(worker);
    const presentSummary = getDepartmentSummary(data);
    const defaultSummary = getDefaultSummary(uniqueRoutes);
    const updatedSummary = updateDefaultSummary(
      defaultSummary,
      departmentTotals,
      presentSummary
    );

    if (team?.toLowerCase() === ADMIN_ENUMS.ADMIN_TEAM.toLowerCase())
      return updatedSummary.sort((a, b) =>
        a.department.localeCompare(b.department)
      );

    const filteredSummary = updatedSummary
      .filter((item) => item.team === team)
      .sort((a, b) => a.department.localeCompare(b.department));

    return filteredSummary;
  } catch (error) {
    console.error("Error fetching attendance:", error.message);
    return null;
  }
};

export const fetchAttendance = async () => {
  const dateForAttendance = getNextSunday();
  const authUser = sessionStorage.getItem("authUser");
  if (!authUser) {
    throw new Error("User not authenticated");
  }
  const parsedUser = JSON.parse(authUser);
  const team = parsedUser.team || "";

  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("attendancedate", dateForAttendance)
      .or(joinOps);

    if (error) {
      throw error;
    }

    const { data: worker, error: workerError } = await supabase
      .from("worker")
      .select("*");

    const { data: routes, error: routesError } = await supabase
      .from("admin")
      .select("*");

    if (routesError) {
      throw routesError;
    }
    if (workerError) {
      throw workerError;
    }

    const uniqueRoutes = routes
      .filter(
        (item, index, self) =>
          index === self.findIndex((obj) => obj.department === item.department)
      )
      .filter((item) => !specialDepartments?.includes(item.department));

    const departmentTotals = getDepartmentTotals(worker);
    const presentSummary = getDepartmentSummary(data);
    const defaultSummary = getDefaultSummary(uniqueRoutes);
    const updatedSummary = updateDefaultSummary(
      defaultSummary,
      departmentTotals,
      presentSummary
    );

    if (team?.toLowerCase() === ADMIN_ENUMS.ADMIN_TEAM.toLowerCase())
      return updatedSummary.sort((a, b) =>
        a.department.localeCompare(b.department)
      );
    const filteredSummary = updatedSummary
      .filter((item) => item.team === team)
      .sort((a, b) => a.department.localeCompare(b.department));

    return filteredSummary;
  } catch (error) {
    console.error("Error fetching attendance:", error.message);
    return null;
  }
};

export function calculateTotals(data) {
  const totals = data?.reduce(
    (acc, item) => {
      acc.present += item.present;
      acc.absent += item.absent;
      acc.total += item.total;
      return acc;
    },
    { present: 0, absent: 0, total: 0 }
  );

  // Calculate the overall percentage
  const overallPercentage =
    totals?.total === 0
      ? "0.00%"
      : ((totals?.present / totals?.total) * 100).toFixed(2) + "%";

  return [
    { name: "Total strength", stat: totals?.total },
    { name: "Total present", stat: totals?.present },
    { name: "Total absent", stat: totals?.absent },
    { name: "Total percentage", stat: overallPercentage },
  ];
}
