import { supabase } from "../lib/db.js";

export async function getOrCreateUser(user_id) {
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user_id)
    .single();

  if (user) return user;

  // Create new user with free credits
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      id: user_id,
      credits: 20
    })
    .select()
    .single();

  if (insertError) {
    throw new Error("User creation failed");
  }

  return newUser;
}

export async function deductCredits(user_id, amount) {
  const { data, error } = await supabase.rpc("deduct_credits", {
    p_user_id: user_id,
    p_amount: amount
  });

  if (error) {
    console.error("Deduct error:", error);
    return false;
  }

  return data; // true or false
}
