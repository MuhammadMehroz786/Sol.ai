import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import soleLogoWithTagline from "@/assets/sole-logo-orange-brown-v2.png";
import soleLogoBlack from "@/assets/SOLE LOGO - BLACK WO BG.png";
import { 
  LayoutDashboard, 
  Settings, 
  Activity, 
  Menu,
  X,
  User,
  LogOut,
  UserCircle
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Agent Registry", href: "/agents", icon: Settings },
    { name: "API Monitor", href: "/monitor", icon: Activity },
  ];

  return (
    <div className="bg-gradient-to-br from-background via-brand-cream/10 to-accent/5 min-h-screen">
      {/* Header - Fixed position, follows scroll with enhanced styling */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/30 bg-gradient-to-r from-card/95 via-brand-cream/80 to-card/95 backdrop-blur-xl shadow-elegant">
        <div className="flex h-20 items-center justify-between px-8">
          {/* Left section */}
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-xl hover:bg-brand-cream/40 hover:shadow-glow transition-all duration-300 group"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
              ) : (
                <Menu className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
              )}
            </Button>

            <div className="animate-fade-in">
              <h1 className="font-bold text-2xl bg-gradient-to-r from-primary via-brand-dark to-primary bg-clip-text text-transparent tracking-tight">
                Sole Central Station
              </h1>
              <p className="text-base text-muted-foreground font-medium bg-gradient-to-r from-muted-foreground to-brand-dark/70 bg-clip-text text-transparent">
                AI Agent Orchestration Platform
              </p>
            </div>
          </div>

          {/* Center section - SOLE Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <img
              src={soleLogoBlack}
              alt="SOLE Logo"
              className="h-16 w-auto hover:scale-105 transition-transform duration-300 drop-shadow-lg"
            />
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-gradient-to-r from-success/10 to-success/20 text-success border-success/30 rounded-full px-4 py-2 shadow-md hover:shadow-glow transition-all duration-300">
              <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse"></div>
              <span className="font-semibold">System Online</span>
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-brand-cream/40 hover:shadow-glow transition-all duration-300 group">
                  <Avatar className="h-9 w-9 border-2 border-primary/30 shadow-md group-hover:border-primary/50 transition-all duration-300">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-bold">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60 bg-gradient-card border border-border/30 shadow-elegant rounded-2xl p-2 backdrop-blur-sm" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-base font-semibold leading-none text-foreground">Account</p>
                    <p className="text-sm leading-none text-muted-foreground font-medium">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center rounded-xl hover:bg-brand-cream/30 transition-colors duration-200">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span className="font-medium">Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center rounded-xl hover:bg-brand-cream/30 transition-colors duration-200">
                    <Settings className="mr-2 h-4 w-4" />
                    <span className="font-medium">Account Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive rounded-xl hover:bg-destructive/10 transition-colors duration-200">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="font-medium">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar - Fixed position, follows scroll with enhanced styling */}
      <aside
        className={cn(
          "fixed top-20 left-0 h-[calc(100vh-5rem)] bg-gradient-to-b from-card/95 via-brand-cream/60 to-card/90 backdrop-blur-xl border-r border-border/30 shadow-elegant z-30 transition-all duration-500 ease-in-out",
          sidebarOpen ? "w-72" : "w-18"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <nav className="relative p-6 space-y-3">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center space-x-4 px-4 py-3 rounded-2xl text-base font-semibold transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground shadow-elegant transform hover:scale-[1.02] hover:shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-brand-cream/40 hover:to-accent/20 hover:shadow-md hover:transform hover:scale-[1.02]"
                )}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-300",
                  isActive
                    ? "from-primary/20 to-primary/10 opacity-100"
                    : "from-brand-cream/20 to-accent/10 group-hover:opacity-100"
                )} />
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 relative z-10 transition-transform duration-300",
                  isActive ? "drop-shadow-sm" : "group-hover:scale-110"
                )} />
                {sidebarOpen && (
                  <span className="font-semibold relative z-10 transition-all duration-300">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />
      </aside>

      {/* Page Content with enhanced styling */}
      <main
        className={cn(
          "bg-gradient-to-br from-brand-cream/30 via-background to-accent/15 p-8 pt-28 transition-all duration-500 ease-in-out min-h-screen relative",
          sidebarOpen ? "ml-72" : "ml-18"
        )}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-brand-cream/20 via-transparent to-transparent pointer-events-none" />

        {/* Content wrapper with enhanced styling */}
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;