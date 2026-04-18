'use server'

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function submitPhotos(_formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    console.error("No authenticated user found");
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("userTable")
    .update({
      submissionDate: new Date().toISOString(),
      workStatus: "ongoing",
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user data in Supabase:", error);
    throw new Error("Failed to update user data");
  }

  redirect("/wait");
}
