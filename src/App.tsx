import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route element={<DashboardLayout><Index /></DashboardLayout>} path="/" />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
