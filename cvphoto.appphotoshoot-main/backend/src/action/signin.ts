'use server'

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AuthError } from "@supabase/supabase-js";
import getUser from "./getUser";

const handleRedirectBasedOnWorkStatus = (user: any): never => {
  if (!user.paymentStatus || user.paymentStatus === "NULL") {
    return redirect("/forms");
  }

  const workStatus = (user.workStatus || "").toLowerCase();
  switch (workStatus) {
    case "":
    case "null":
      return redirect("/upload/intro");
    case "ongoing":
      return redirect("/wait");
    case "completed":
    case "complete":
      return redirect("/dashboard");
    default:
      return redirect("/forms");
  }
};

export async function signIn(formData: FormData): Promise<never> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    let errorMessage = "Could not authenticate user";

    if (error instanceof AuthError) {
      switch (error.code) {
        case "invalid_login_credentials":
          errorMessage = "Invalid email or password. Please try again.";
          break;
        case "invalid_email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "too_many_requests":
          errorMessage = "Too many login attempts. Please try again later.";
          break;
        default:
          errorMessage = error.message;
      }
    } else {
      errorMessage = `Unexpected error: ${error}`;
    }

    return redirect(`/login?message=${encodeURIComponent(errorMessage)}`);
  } else {
    const userData: any = await getUser();
    const user = userData?.[0];

    if (user) {
      return handleRedirectBasedOnWorkStatus(user);
    }
    return redirect("/forms");
  }
}
