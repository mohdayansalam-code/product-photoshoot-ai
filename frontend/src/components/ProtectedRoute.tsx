import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      // FIRST: get session (important for OAuth return)
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        setUser(sessionData.session.user);
        setLoading(false);
        return;
      }

      // FALLBACK: getUser
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    init();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
