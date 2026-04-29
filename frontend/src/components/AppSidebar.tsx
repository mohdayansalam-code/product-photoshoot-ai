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
  Package,
} from "lucide-react";
import { toast } from "sonner";
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

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Generate Photoshoot", url: "/dashboard/create-photoshoot", icon: Camera },
  { title: "Generations", url: "/dashboard/generations", icon: Images },
  { title: "AI Image Tools", url: "/dashboard/tools", icon: Wand2 },
  { title: "AI Image Editor", url: "/dashboard/editor", icon: Pencil },
  { title: "Products", url: "/dashboard/products", icon: Package },
  { title: "Assets Library", url: "/dashboard/assets", icon: FolderOpen },
  { title: "Credits", url: "/dashboard/credits", icon: Coins },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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
                        end={item.url === "/dashboard" || item.url === "/"}
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
    </Sidebar>
  );
}
