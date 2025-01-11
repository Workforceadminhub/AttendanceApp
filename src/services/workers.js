import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
export const fetchWorkers = async (department) => {
  try {
    const { data, error } = await supabase
      .from("worker")
      .select("*")
      .eq("department", department);

    if (error) {
      throw error;
    }

    return data; // Returns an array of workers in the specified department
  } catch (error) {
    console.error("Error fetching workers:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export const useFetchWorkers = (department) => {
  console.log({ department });
  return useQuery({
    queryKey: [department],
    queryFn: () => fetchWorkers(department),
  });
};
