import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import { getNextSunday } from "../utils/getDate";
import { routeObject } from "../utils/routeObject";

// const table = "attendance2"
const table = "attendance";

export const fetchWorkers = async (department) => {
  try {
    const dateForAttendance = getNextSunday();
    const { data, error } = await supabase
      .from("worker")
      .select(`*, ${table} ( workerid, attendance, attendancedate )`)
      .eq("department", department)
      .eq(`${table}.attendancedate`, dateForAttendance);

    if (error) {
      throw error;
    }

    const finalResult = data.map((item) => ({
      ...item,
      name: item?.fullname?.trim(),
      attendance:
        item[table].length > 0 ? item[table][0].attendance : undefined,
    }));

    return finalResult;
  } catch (error) {
    console.error("Error fetching workers:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export const fetchAdminWorkers = async (team, activeGroup) => {
  try {
    const departments = routeObject
      .filter((item) => item.team === team)
      .map((item) => item.department);
    const dateForAttendance = getNextSunday();
    let data;
    let error;
    if (activeGroup === "All") {
      const { data: _data, error: _error } = await supabase
        .from("worker")
        .select(`*, ${table} ( workerid, attendance, attendancedate )`)
        .in("department", departments)
        .eq(`${table}.attendancedate`, dateForAttendance);

      data = _data;
      error = _error;
    }

    if (activeGroup !== "All") {
      const { data: _data, error: _error } = await supabase
        .from("worker")
        .select(`*, ${table} ( workerid, attendance, attendancedate )`)
        .eq("department", activeGroup)
        .eq(`${table}.attendancedate`, dateForAttendance);

      data = _data;
      error = _error;
    }

    if (error) {
      throw error;
    }

    const finalResult = data.map((item) => ({
      ...item,
      name: item?.fullname?.trim(),
      attendance:
        item[table].length > 0 ? item[table][0].attendance : undefined,
    }));

    return finalResult;
  } catch (error) {
    console.error("Error fetching workers:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export const useFetchWorkers = (department) => {
  return useQuery({
    queryKey: [department],
    queryFn: () => fetchWorkers(department),
  });
};
