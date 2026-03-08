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
} from "lucide-react";
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

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Generate Photoshoot", url: "/generate", icon: Camera },
  { title: "Generations", url: "/generations", icon: Images },
  { title: "AI Image Tools", url: "/tools", icon: Wand2 },
  { title: "AI Image Editor", url: "/editor", icon: Pencil },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Activity", url: "/activity", icon: Activity },
  { title: "Assets Library", url: "/assets", icon: FolderOpen },
  { title: "Credits", url: "/credits", icon: Coins },
  { title: "Settings", url: "/settings", icon: Settings },
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
        <CreditIndicator credits={180} maxCredits={200} collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}
