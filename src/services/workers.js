import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

const table = "attendance2"
// const table = "attendance"

export const fetchWorkers = async (department) => {
  try {
    const { data, error } = await supabase
      .from("worker")
      .select(`*, ${table} ( workerid, attendance )`)
      .eq("department", department);

    if (error) {
      throw error;
    }

    return data.map((item) => ({
      ...item,
      attendance:
        item[table].length > 0 ? item[table][0].attendance : undefined,
    })); // Returns an array of workers in the specified department
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
