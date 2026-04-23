"use server"
import { createClient } from "@/utils/supabase/server";

export default async function getUser() {
  const supabase = createClient();
  
  // Get the current authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    console.error("No authenticated user found");
    return null;
  }

  // Query the 'userTable' for the current user's data
  const { data, error } = await supabase
    .from('userTable')
    .select()
    .eq('id', userId);
 
  if (error) {
    console.error("Error fetching user data from Supabase:", error);
    return null;
  }

  if (data && data.length > 0) {
    return data;
  } else {
    console.warn("No user data found for the current user");
    return null;
  }
}

