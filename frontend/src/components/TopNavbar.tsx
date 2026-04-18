import { Search, Bell, ChevronDown, User, Coins, Settings, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";

export function TopNavbar() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [initials, setInitials] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setInitials("TU");
  }, []);

  const handleLogout = () => {
    navigate("/landing");
  };

  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card gap-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="mr-1" />
        <div className={`relative transition-all duration-200 ${searchFocused ? "w-72" : "w-56"}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 h-9 bg-secondary/50 border-transparent focus:border-border focus:bg-card transition-colors"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-secondary transition-colors">
              <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-foreground">{initials}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/dashboard/credits")} className="flex items-center gap-2 cursor-pointer">
                <Coins className="h-4 w-4" /> Credits
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive">
              <LogOut className="h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
