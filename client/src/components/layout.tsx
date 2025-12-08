import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlusCircle, BarChart3, ClipboardList, Menu, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import generatedImage from '@assets/generated_images/green_gold_bowls_logo_transparent.png';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const navItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/new-game", label: "New Game", icon: PlusCircle },
    { href: "/games", label: "My Games", icon: ClipboardList },
    { href: "/analysis", label: "Analysis", icon: BarChart3 },
    { href: "/account", label: "Account", icon: User },
  ];

  if (user?.isAdmin) {
    navItems.push({ href: "/admin", label: "Admin", icon: Shield });
  }

  const NavContent = () => (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center gap-3 px-2">
        <img src={generatedImage} alt="Bowlo" className="w-12 h-12 drop-shadow-md" />
        <div className="flex flex-col">
          <span className="font-display text-xl font-bold tracking-tight text-primary">Game Day</span>
          <span className="text-xs text-muted-foreground font-medium -mt-0.5">by Bowlo</span>
        </div>
      </div>
      <nav className="flex flex-col gap-2">
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
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <img src={generatedImage} alt="Bowlo" className="w-10 h-10 drop-shadow-md" />
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold text-primary leading-tight">Game Day</span>
            <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">by Bowlo</span>
          </div>
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
