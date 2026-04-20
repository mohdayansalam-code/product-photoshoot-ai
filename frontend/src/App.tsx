import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import CreatePhotoshootPage from "./pages/CreatePhotoshootPage";
import GenerationsPage from "./pages/GenerationsPage";
import AIToolsPage from "./pages/AIToolsPage";
import AssetsPage from "./pages/AssetsPage";
import BillingPage from "./pages/BillingPage";
import SettingsPage from "./pages/SettingsPage";
import EditorPage from "./pages/EditorPage";
import ProductsLibraryPage from "./pages/ProductsLibraryPage";
import LandingPage from "./pages/LandingPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

import { supabase } from "./lib/supabase";

const AppContent = () => {
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


    return () => {
      window.removeEventListener("api-start", start);
      window.removeEventListener("api-end", end);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <>
      {globalProgress && (
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-primary z-[9999] shadow-md overflow-hidden">
           <div className="w-full h-full bg-white/30 animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      )}
      <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<Navigate to="/" replace />} />

      {/* Protected App Pages */}
      <Route path="/dashboard/*" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/create-photoshoot" element={<CreatePhotoshootPage />} />
              <Route path="/generations" element={<GenerationsPage />} />
              <Route path="/tools" element={<AIToolsPage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/products" element={<ProductsLibraryPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardLayout>
        </ProtectedRoute>
      } />
    </Routes>
    </>
  );
};

import { ErrorBoundary } from "./components/ErrorBoundary";

const isConfigured = Boolean(import.meta.env.VITE_API_BASE_URL || import.meta.env.DEV);

const App = () => {
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Server configuration error</h1>
          <p className="text-gray-500 mb-6">
            The application is missing critical environment variables. Please configure <code className="bg-gray-100 px-2 py-1 rounded text-red-500 text-sm">VITE_API_BASE_URL</code> in your deployment settings.
          </p>
        </div>
      </div>
    );
  }

  return (
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
};

export default App;
