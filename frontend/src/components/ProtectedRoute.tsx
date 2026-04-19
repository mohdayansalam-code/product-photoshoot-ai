import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user as any);
      setLoading(false);
    };

    getUser();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/" />;

  return <>{children}</>;
}
