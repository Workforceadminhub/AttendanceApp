import getDayAndYear from "../utils/getDate";
import getDefaultSummary from "../utils/getDefaultSummary";
import { routeObject } from "../utils/routeObject";
import { supabase } from "./supabaseClient";

export const addAttendance = async (attendance) => {
  const dateForAttendance = getDayAndYear();
  try {
    await supabase
      .from("attendance")
      .delete()
      .in(
        "workerid",
        attendance.map((item) => item.workerid)
      )
      .eq("attendancedate", dateForAttendance);

    const { data, error } = await supabase
      .from("attendance")
      .insert(attendance);

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

function updateDefaultSummary(defaultSummary, totals) {
  return defaultSummary.map((summary) => {
    const total = totals[summary.department] || 0;
    return {
      ...summary,
      total: total,
      percentage:
        total > 0 ? `${((summary.present / total) * 100).toFixed(2)}%` : "0%",
    };
  });
}

export const fetchAttendance = async () => {
  const dateForAttendance = getDayAndYear();
  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("attendancedate", dateForAttendance);

    const { data: worker, error: workerError } = await supabase
      .from("worker")
      .select("");
    const departmentTotals = getDepartmentTotals(worker);
    const defaultSummary = getDefaultSummary(routeObject);
    const updatedSummary = updateDefaultSummary(
      defaultSummary,
      departmentTotals
    );

    if (error) {
      throw error;
    }

    return updatedSummary;
  } catch (error) {
    console.error("Error fetching attendance:", error.message);
    return null;
  }
};
