import { supabase } from "./supabaseClient";

const loginService = async (code) => {
  const { data, error } = await supabase
    .from("admin")
    .select("*")
    .eq("code", code)
    .single();


  if (error) {
    throw error;
  }

  return data;
};

export default loginService;
