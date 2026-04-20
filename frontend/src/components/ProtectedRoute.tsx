import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // wait for auth
  if (user === undefined) return <div>Loading...</div>;

  // not logged in
  if (!user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
