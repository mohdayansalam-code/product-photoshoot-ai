import { createClient } from "@supabase/supabase-js";
import { ApiError } from "./apiError";

export async function requireAuthenticatedUser(authHeader: string | null) {
  // Using demo user since authentication is currently bypassed
  const user = { id: "demo-user", email: "demo@example.com" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
      throw new ApiError(500, "Supabase credentials are not configured");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  return { user, supabaseAdmin };
}
