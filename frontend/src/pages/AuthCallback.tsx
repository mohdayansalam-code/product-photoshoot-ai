import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    const handle = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/";
      }
    };

    handle();
  }, []);

  return <div>Loading...</div>;
}
