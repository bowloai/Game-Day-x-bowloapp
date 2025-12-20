import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlusCircle, BarChart3, ClipboardList, Menu, User, Shield, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import generatedImage from '@assets/generated_images/a_minimalist,_geometric_lawn_bowls_jack_and_bowl_logo_icon_in_green_and_gold.png';

const BUILD_ID = "2024.12.20.1";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const navItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/new-game", label: "New Game", icon: PlusCircle },
    { href: "/games", label: "My Games", icon: ClipboardList },
    { href: "/analysis", label: "Analysis", icon: BarChart3 },
    { href: "/help", label: "Help", icon: HelpCircle },
    { href: "/account", label: "Account", icon: User },
  ];

  // Add Admin link for admin users
  if (user?.isAdmin) {
    navItems.push({ href: "/admin", label: "Admin", icon: Shield });
  }

  const NavContent = () => (
    <div className="flex flex-col gap-6 py-4 h-full">
      <div className="flex items-center gap-3 px-2">
        <img src={generatedImage} alt="Game Day" className="w-8 h-8" />
        <span className="font-display text-xl font-bold tracking-tight text-primary">Game Day</span>
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div 
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                location === item.href 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              onClick={() => setIsOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </div>
          </Link>
        ))}
      </nav>
      <div className="mt-auto px-2 pt-4 border-t">
        <span className="text-xs text-muted-foreground">Build: {BUILD_ID}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b bg-background px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <img src={generatedImage} alt="Game Day" className="w-8 h-8" />
          <span className="font-display text-lg font-bold text-primary">Game Day x bowlo.ai</span>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[350px]">
            <NavContent />
          </SheetContent>
        </Sheet>
      </header>
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-card px-4 py-6 sticky top-0">
          <NavContent />
          <div className="mt-auto">
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-10 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
