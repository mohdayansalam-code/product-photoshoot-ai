import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50 w-full overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 fixed left-0 top-0 h-full bg-white border-r z-50">
          <AppSidebar />
        </aside>

        {/* Main Content */}
        <main className="md:ml-64 w-full flex flex-col h-screen overflow-y-auto">
          <TopNavbar />
          <div className="px-6 md:px-10 py-6 w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
