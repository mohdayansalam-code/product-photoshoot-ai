import { AuthImage } from "@/components/auth/AuthImage";
import { AuthCard } from "@/components/auth/AuthCard";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      console.log("SESSION:", data);
      if (data?.session) {
        window.location.href = "/dashboard";
      }
    };
    checkSession();
  }, []);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthImage />
      <AuthCard />
    </div>
  );
}
