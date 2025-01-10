import { supabase } from "./supabaseClient";

const loginService = async (code) => {
  const { data, error } = await supabase
    .from("admin")
    .select("*")
    .eq("code", code)
    .single();

  console.log(data);

  if (error) {
    throw error;
  }

  return data;
};

export default loginService;
