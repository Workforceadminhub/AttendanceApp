import { supabase } from "./supabaseClient";

export const addAttendance = async (attendance) => {
  try {
    const { data, error } = await supabase.from("attendance").insert(attendance);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error adding attendance:", error.message);
    return null;
  }
};
