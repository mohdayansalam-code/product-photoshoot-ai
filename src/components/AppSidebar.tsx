import {
  LayoutDashboard,
  Camera,
  Images,
  Wand2,
  Pencil,
  FolderOpen,
  Coins,
  Settings,
  Sparkles,
  FolderKanban,
  Activity,
  Package,
} from "lucide-react";
import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { CreditIndicator } from "@/components/CreditIndicator";
import { fetchCredits } from "@/lib/api";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Generate Photoshoot", url: "/dashboard/generate", icon: Camera },
  { title: "Generations", url: "/dashboard/generations", icon: Images },
  { title: "AI Image Tools", url: "/dashboard/tools", icon: Wand2 },
  { title: "AI Image Editor", url: "/dashboard/editor", icon: Pencil },
  { title: "Products", url: "/dashboard/products", icon: Package },
  { title: "Projects", url: "/dashboard/projects", icon: FolderKanban },
  { title: "Activity", url: "/dashboard/activity", icon: Activity },
  { title: "Assets Library", url: "/dashboard/assets", icon: FolderOpen },
  { title: "Credits", url: "/dashboard/credits", icon: Coins },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [credits, setCredits] = useState({ credits: 0, maxCredits: 200 });

  useEffect(() => {
    async function loadCredits() {
      try {
        const data = await fetchCredits();
        setCredits(data);
      } catch (err) {
        console.error("Failed to fetch credits", err);
      }
    }
    loadCredits();
  }, []);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <div className="p-4 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-foreground text-lg tracking-tight">PhotoAI</span>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <CreditIndicator credits={credits.credits} maxCredits={credits.maxCredits} collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}
