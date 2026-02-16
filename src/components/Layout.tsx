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
  UserCircle,
  Wand2
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [islandExpanded, setIslandExpanded] = useState(false);
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
    { name: "Social Alchemist", href: "/social-alchemist", icon: Wand2 },
    { name: "Agent Hub", href: "/agents", icon: Settings },
  ];

  return (
    <div className="bg-gradient-to-br from-[hsl(47,59%,99%)] via-white to-[hsl(47,59%,98%)] min-h-screen relative overflow-hidden">
      {/* Global ambient glow effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none z-0" />
      <div className="fixed top-0 right-0 w-[1000px] h-[1000px] bg-gradient-to-bl from-primary/8 via-transparent to-transparent rounded-full blur-3xl pointer-events-none opacity-30 z-0" />
      <div className="fixed bottom-0 left-0 w-[900px] h-[900px] bg-gradient-to-tr from-accent/6 via-transparent to-transparent rounded-full blur-3xl pointer-events-none opacity-25 z-0" />
      {/* Luxurious Floating Island Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-4 group/header">
        <div className="relative max-w-[96%] mx-auto">
          {/* Outer luxurious glow - multiple layers for richness */}
          <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/40 via-accent/30 to-primary/40 blur-3xl opacity-30 group-hover/header:opacity-50 transition-all duration-700" />
          <div className="absolute inset-0 -m-2 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 blur-2xl opacity-40 group-hover/header:opacity-60 transition-all duration-500" />

          {/* Premium island container */}
          <div className="relative bg-white/98 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_32px_rgba(208,126,59,0.25),0_16px_64px_rgba(208,126,59,0.15),0_0_0_1px_rgba(208,126,59,0.1)] border-2 border-primary/20 overflow-hidden group-hover/header:shadow-[0_12px_48px_rgba(208,126,59,0.35),0_24px_80px_rgba(208,126,59,0.2)] transition-all duration-500">

            {/* Rich gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 via-transparent to-primary/8" />

            {/* Animated shimmer sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity duration-700 animate-shimmer" style={{backgroundSize: '200% 100%'}} />

            {/* Top accent border - luxurious gradient line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary via-accent to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 blur-sm" />

            {/* Bottom elegant separator */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {/* Premium content container */}
            <div className="relative flex h-20 items-center justify-between px-8">
              {/* Left - Luxurious Logo First */}
              <div className="flex items-center space-x-6 z-10 group/logo-section">
                {/* Premium Logo with Rich Effects */}
                <div className="relative group/logo">
                  {/* Luxurious outer glow */}
                  <div className="absolute inset-0 -m-3 rounded-full bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 blur-2xl opacity-50 group-hover/logo:opacity-80 transition-all duration-500" />

                  {/* Elegant gradient ring */}
                  <div className="absolute inset-0 -m-1 rounded-full bg-gradient-to-br from-primary/40 via-accent/30 to-primary/40 p-[2px] shadow-[0_4px_16px_rgba(208,126,59,0.25)]">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-white via-[hsl(47,59%,99%)] to-white" />
                  </div>

                  {/* Logo container */}
                  <div className="relative bg-white rounded-full p-3 shadow-[0_4px_20px_rgba(208,126,59,0.2)] group-hover/logo:shadow-[0_8px_32px_rgba(208,126,59,0.3)] transition-all duration-500">
                    <img
                      src={soleLogoBlack}
                      alt="SOLE Logo"
                      className="h-14 w-auto hover:scale-105 transition-all duration-500 drop-shadow-xl filter brightness-100 contrast-110"
                    />
                  </div>

                  {/* Refined corner accents */}
                  <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 bg-primary rounded-full opacity-0 group-hover/logo:opacity-80 transition-all duration-500" />
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent rounded-full opacity-0 group-hover/logo:opacity-80 transition-all duration-500" style={{transitionDelay: '0.1s'}} />
                </div>

                {/* Elegant vertical divider */}
                <div className="h-12 w-[2px] bg-gradient-to-b from-transparent via-primary/30 to-transparent" />

                {/* Refined Title Section */}
                <div className="animate-fade-in group/title">
                  <h1 className="font-black text-2xl bg-gradient-to-r from-[hsl(21,58%,45%)] via-[hsl(15,48%,25%)] to-[hsl(21,58%,45%)] bg-clip-text text-transparent tracking-tight drop-shadow-[0_2px_8px_rgba(208,126,59,0.25)] animate-gradient-shift leading-tight" style={{backgroundSize: '200% 100%'}}>
                    Sole Central Station
                  </h1>
                  <p className="text-xs text-[hsl(15,48%,35%)] font-bold mt-0.5 tracking-widest uppercase">
                    AI Orchestration Platform
                  </p>
                </div>
              </div>

              {/* Right - Luxurious Avatar Section */}
              <div className="flex items-center z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-12 w-12 rounded-full transition-all duration-300 group/avatar p-0 hover:scale-105">
                      {/* Luxurious animated gradient ring */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-accent to-primary p-[2px] animate-gradient-shift shadow-[0_4px_16px_rgba(208,126,59,0.25)]" style={{backgroundSize: '200% 200%'}}>
                        <div className="w-full h-full rounded-full bg-white" />
                      </div>

                      {/* Rich glow effect */}
                      <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl opacity-30 group-hover/avatar:opacity-70 transition-opacity duration-500" />

                      {/* Elegant pulse ring */}
                      <div className="absolute inset-0 rounded-full border border-primary/20 opacity-0 group-hover/avatar:opacity-100 group-hover/avatar:scale-125 transition-all duration-500" />

                      {/* Avatar */}
                      <Avatar className="relative h-10 w-10 border-2 border-white shadow-[0_4px_16px_rgba(208,126,59,0.25)] group-hover/avatar:shadow-[0_6px_24px_rgba(208,126,59,0.35)] transition-all duration-300">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-br from-primary via-[hsl(26,47%,70%)] to-primary text-primary-foreground text-base font-black">
                          {user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 bg-white border-2 border-primary/30 shadow-[0_20px_60px_rgba(208,126,59,0.35),0_0_0_1px_rgba(208,126,59,0.1)] rounded-3xl p-4 animate-slide-in-right" align="end" forceMount>
                {/* Strong gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-primary/8 rounded-3xl pointer-events-none" />

                {/* Animated border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-50 animate-gradient-shift" style={{backgroundSize: '200% 100%'}} />

                <DropdownMenuLabel className="font-normal relative">
                  <div className="flex flex-col space-y-2 p-3 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl">
                    <p className="text-lg font-black leading-none bg-gradient-to-r from-primary to-[hsl(15,48%,25%)] bg-clip-text text-transparent">Account</p>
                    <p className="text-sm leading-none text-[hsl(15,48%,30%)] font-bold">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-primary/50 to-transparent h-[3px] my-3 rounded-full" />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center rounded-2xl hover:bg-gradient-to-r hover:from-primary/15 hover:to-accent/15 hover:shadow-[0_4px_12px_rgba(208,126,59,0.2)] transition-all duration-300 p-4 group/item cursor-pointer border-2 border-transparent hover:border-primary/20">
                    <div className="mr-3 p-2 rounded-xl bg-primary/10 group-hover/item:bg-primary/20 transition-colors duration-300">
                      <UserCircle className="h-5 w-5 text-primary group-hover/item:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="font-bold text-[hsl(15,48%,25%)]">Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center rounded-2xl hover:bg-gradient-to-r hover:from-primary/15 hover:to-accent/15 hover:shadow-[0_4px_12px_rgba(208,126,59,0.2)] transition-all duration-300 p-4 group/item cursor-pointer border-2 border-transparent hover:border-primary/20 mt-2">
                    <div className="mr-3 p-2 rounded-xl bg-primary/10 group-hover/item:bg-primary/20 transition-colors duration-300">
                      <Settings className="h-5 w-5 text-primary group-hover/item:scale-110 group-hover/item:rotate-180 transition-all duration-500" />
                    </div>
                    <span className="font-bold text-[hsl(15,48%,25%)]">Account Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-primary/50 to-transparent h-[3px] my-3 rounded-full" />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive rounded-2xl hover:bg-destructive/15 hover:shadow-[0_4px_12px_rgba(185,28,28,0.2)] transition-all duration-300 p-4 group/item cursor-pointer border-2 border-transparent hover:border-destructive/30">
                  <div className="mr-3 p-2 rounded-xl bg-destructive/10 group-hover/item:bg-destructive/20 transition-colors duration-300">
                    <LogOut className="h-5 w-5 group-hover/item:scale-110 group-hover/item:-translate-x-1 transition-all duration-300" />
                  </div>
                  <span className="font-bold">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Luxurious corner accents */}
            <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-primary/40 rounded-tl-lg opacity-50 group-hover/header:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-primary/40 rounded-tr-lg opacity-50 group-hover/header:opacity-100 transition-opacity duration-500" />
            <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-accent/40 rounded-bl-lg opacity-50 group-hover/header:opacity-100 transition-opacity duration-500" />
            <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-accent/40 rounded-br-lg opacity-50 group-hover/header:opacity-100 transition-opacity duration-500" />
          </div>
        </div>
      </header>

      {/* Floating Island Navigation Panel */}
      <nav
        className={cn(
          "fixed left-6 top-32 z-40 transition-all duration-500 ease-out group/island",
          islandExpanded ? "w-64" : "w-20"
        )}
        onMouseEnter={() => setIslandExpanded(true)}
        onMouseLeave={() => setIslandExpanded(false)}
      >
        {/* Island Container with Ultra Premium Glass Effect */}
        <div className="relative">
          {/* Multi-layer luxurious glow - dimmed */}
          <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/25 via-accent/20 to-primary/25 blur-3xl opacity-20 group-hover/island:opacity-40 transition-all duration-700 animate-pulse-glow" />
          <div className="absolute inset-0 -m-2 bg-gradient-to-r from-primary/15 via-transparent to-primary/15 blur-2xl opacity-25 group-hover/island:opacity-45 transition-all duration-500" />

          {/* Main island background */}
          <div className="relative bg-white/98 backdrop-blur-2xl rounded-[2rem] shadow-[0_4px_20px_rgba(208,126,59,0.15),0_8px_40px_rgba(208,126,59,0.1),0_0_0_1px_rgba(208,126,59,0.1)] border-2 border-primary/20 overflow-hidden group-hover/island:shadow-[0_6px_28px_rgba(208,126,59,0.2),0_12px_50px_rgba(208,126,59,0.15)] transition-all duration-500">
            {/* Rich gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/6 via-transparent to-primary/10 pointer-events-none" />

            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent opacity-0 group-hover/island:opacity-100 transition-opacity duration-700 animate-shimmer" style={{backgroundSize: '100% 200%'}} />

            {/* Top accent line - enhanced */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary via-accent to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 blur-sm" />

            {/* Navigation items */}
            <div className="relative p-4 space-y-3">
              {navigation.map((item, index) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center rounded-2xl text-base font-bold transition-all duration-300 group/item relative overflow-hidden",
                      islandExpanded ? "space-x-4 px-4 py-4" : "justify-center px-3 py-4",
                      isActive
                        ? "bg-gradient-to-r from-primary via-[hsl(26,47%,70%)] to-primary text-white shadow-[0_8px_24px_rgba(208,126,59,0.4)]"
                        : "text-[hsl(15,48%,25%)] hover:bg-gradient-to-r hover:from-primary/15 hover:to-accent/15 hover:shadow-[0_4px_16px_rgba(208,126,59,0.2)]"
                    )}
                    style={{
                      transitionDelay: islandExpanded ? `${index * 50}ms` : '0ms'
                    }}
                  >
                    {/* Active indicator multi-layer glow */}
                    {isActive && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 blur-2xl -z-10 animate-pulse-glow" />
                        <div className="absolute inset-0 bg-primary/20 blur-xl -z-10" />
                      </>
                    )}

                    {/* Hover gradient background - enhanced */}
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-r from-primary/15 via-accent/15 to-primary/15 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300",
                      isActive && "opacity-100 from-primary/20 via-accent/20 to-primary/20"
                    )} />

                    {/* Icon container with glow */}
                    <div className={cn(
                      "relative z-10 p-2.5 rounded-xl transition-all duration-300 shadow-sm",
                      isActive
                        ? "bg-white/25 shadow-[0_4px_12px_rgba(255,255,255,0.3)]"
                        : "bg-primary/12 group-hover/item:bg-primary/20 group-hover/item:shadow-[0_4px_12px_rgba(208,126,59,0.2)]"
                    )}>
                      <item.icon className={cn(
                        "h-6 w-6 transition-all duration-300",
                        isActive
                          ? "text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)]"
                          : "text-primary group-hover/item:scale-110 group-hover/item:drop-shadow-[0_2px_4px_rgba(208,126,59,0.3)]"
                      )} />
                    </div>

                    {/* Text label with slide animation */}
                    {islandExpanded && (
                      <span className={cn(
                        "relative z-10 whitespace-nowrap transition-all duration-300 animate-fade-in",
                        isActive ? "text-white drop-shadow-sm" : "text-[hsl(15,48%,25%)]"
                      )}>
                        {item.name}
                      </span>
                    )}

                    {/* Active page indicator dot */}
                    {isActive && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Bottom decorative gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />

            {/* Corner accents */}
            <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full opacity-50 group-hover/island:opacity-100 transition-opacity duration-500" />
            <div className="absolute bottom-2 right-2 w-2 h-2 bg-accent rounded-full opacity-50 group-hover/island:opacity-100 transition-opacity duration-500" />
          </div>
        </div>
      </nav>

      {/* Page Content with Ultra Luxurious Styling */}
      <main
        className="bg-gradient-to-br from-[hsl(47,59%,98%)] via-white to-[hsl(47,59%,99%)] p-8 pt-32 pl-28 transition-all duration-500 ease-in-out min-h-screen relative overflow-hidden"
      >
        {/* Multi-layer Ambient Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent via-transparent to-accent/8 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-brand-cream/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-tl from-primary/10 via-accent/5 to-transparent rounded-full blur-3xl pointer-events-none opacity-40" />
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-accent/8 to-transparent rounded-full blur-3xl pointer-events-none opacity-30" />

        {/* Floating particles effect */}
        <div className="absolute top-20 left-1/4 w-2 h-2 bg-primary/20 rounded-full blur-sm animate-float-in opacity-60" style={{animationDelay: '0s', animationDuration: '8s'}} />
        <div className="absolute top-40 right-1/3 w-3 h-3 bg-accent/15 rounded-full blur-sm animate-float-in opacity-50" style={{animationDelay: '2s', animationDuration: '10s'}} />
        <div className="absolute bottom-32 left-1/3 w-2 h-2 bg-primary/25 rounded-full blur-sm animate-float-in opacity-60" style={{animationDelay: '4s', animationDuration: '9s'}} />

        {/* Content wrapper with enhanced styling */}
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;