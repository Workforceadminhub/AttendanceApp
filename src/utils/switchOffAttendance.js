import { supabase } from "../services/supabaseClient";

export const switchOffAttendance = async () => {
  // Logic to switch off attendance
  const { data } = await supabase.from("expirytable").select().eq("id", 1);
  const attendanceIsClosed = data && data.length > 0 ? data[0].isClosed : false;
  return attendanceIsClosed;
};
