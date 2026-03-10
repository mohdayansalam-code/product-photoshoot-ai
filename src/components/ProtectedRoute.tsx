import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/authStore";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { session, initialized, initialize } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!initialized) {
            initialize();
        }
    }, [initialized, initialize]);

    useEffect(() => {
        if (initialized && !session) {
            navigate("/auth", { replace: true });
        }
    }, [initialized, session, navigate]);

    if (!initialized || (initialized && !session)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return <>{children}</>;
}
