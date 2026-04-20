import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    const handleAuth = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/";
      }
    };

    handleAuth();
  }, []);

  return <div className="min-h-screen flex items-center justify-center">Signing you in...</div>;
}
