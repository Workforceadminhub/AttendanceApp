import { supabase } from "./supabaseClient"

export const fetchHistoryOptions = async () => {
   const {data, error} = await supabase.from("attendance").select("attendancedate")

   if (error) {
      throw error
   }

   const historyOptions = [...new Set(data.map(item => item.attendancedate))].reverse().sort((a,b) => a.localCompare(b))
   console.log(historyOptions)
   return historyOptions
}