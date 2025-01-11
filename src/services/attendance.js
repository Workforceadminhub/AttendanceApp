import getDayAndYear from "../utils/getDate";
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
