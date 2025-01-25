import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import getDayAndYear from "../utils/getDate";

const table = "attendance2"
// const table = "attendance"

export const fetchWorkers = async (department) => {
  try {
    const dateForAttendance = getDayAndYear();
    const { data, error } = await supabase
      .from("worker")
      .select(`*, ${table} ( workerid, attendance, attendancedate )`)
      .eq("department", department)
      .eq(`${table}.attendancedate`, dateForAttendance)
  

    if (error) {
      throw error;
    }

    const finalResult = data.map((item) => ({
      ...item,
      name: item?.fullname?.trim(),
      attendance:
        item[table].length > 0 ? item[table][0].attendance : undefined,
    }));

    return finalResult
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
