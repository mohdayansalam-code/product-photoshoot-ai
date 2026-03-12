import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/lib/authStore";
import { useEffect } from "react";
import Index from "./pages/Index";
import GeneratePage from "./pages/GeneratePage";
import GenerationsPage from "./pages/GenerationsPage";
import CreditsPage from "./pages/CreditsPage";
import AIToolsPage from "./pages/AIToolsPage";
import AssetsPage from "./pages/AssetsPage";
import BillingPage from "./pages/BillingPage";
import SettingsPage from "./pages/SettingsPage";
import EditorPage from "./pages/EditorPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProductsLibraryPage from "./pages/ProductsLibraryPage";
import ActivityPage from "./pages/ActivityPage";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import DevServerCheck from "./components/DevServerCheck";

const queryClient = new QueryClient();

const AppContent = () => {
  const { session, initialized, initialize } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/landing" replace />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/auth" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected App Pages */}
      <Route path="/dashboard/*" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/generate" element={<GeneratePage />} />
              <Route path="/generations" element={<GenerationsPage />} />
              <Route path="/tools" element={<AIToolsPage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/products" element={<ProductsLibraryPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/credits" element={<CreditsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DevServerCheck />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
