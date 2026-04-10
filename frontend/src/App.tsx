import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Index from "./pages/Index";
import GeneratePage from "./pages/GeneratePage";
import GenerationsPage from "./pages/GenerationsPage";
import CreditsPage from "./pages/CreditsPage";
import AIToolsPage from "./pages/AIToolsPage";
import AssetsPage from "./pages/AssetsPage";
import BillingPage from "./pages/BillingPage";
import SettingsPage from "./pages/SettingsPage";
import EditorPage from "./pages/EditorPage";
import ProductsLibraryPage from "./pages/ProductsLibraryPage";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [globalProgress, setGlobalProgress] = useState(false);

  useEffect(() => {
    let requests = 0;
    const start = () => { requests++; setGlobalProgress(true); };
    const end = () => { requests = Math.max(0, requests - 1); if (requests === 0) setGlobalProgress(false); };
    
    window.addEventListener("api-start", start);
    window.addEventListener("api-end", end);
    
    const onOffline = () => {
      import("sonner").then(m => m.toast.error("Connection lost", { description: "Network is offline" }));
    };
    window.addEventListener("offline", onOffline);

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      if (event === "SIGNED_IN" && session) {
        window.location.href = "/dashboard";
      }
    });

    return () => {
      window.removeEventListener("api-start", start);
      window.removeEventListener("api-end", end);
      window.removeEventListener("offline", onOffline);
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const activeSession = session;

  return (
    <>
      {globalProgress && (
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-primary z-[9999] shadow-md overflow-hidden">
           <div className="w-full h-full bg-white/30 animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      )}
      <Routes>
      {/* Public Pages */}
      <Route path="/" element={activeSession ? <Navigate to="/dashboard" replace /> : <Navigate to="/landing" replace />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/auth" element={activeSession ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/login" element={activeSession ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<Navigate to="/" replace />} />

      {/* Protected App Pages */}
      <Route path="/dashboard/*" element={
        activeSession ? (
          <ProtectedRoute>
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/generate" element={<GeneratePage />} />
                <Route path="/generations" element={<GenerationsPage />} />
                <Route path="/tools" element={<AIToolsPage />} />
                <Route path="/editor" element={<EditorPage />} />
                <Route path="/products" element={<ProductsLibraryPage />} />
                <Route path="/assets" element={<AssetsPage />} />
                <Route path="/credits" element={<CreditsPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
    </>
  );
};

import { ErrorBoundary } from "./components/ErrorBoundary";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
           <AppContent />
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
