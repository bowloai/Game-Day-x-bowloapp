import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense, useState, useEffect } from "react";
import Layout from "@/components/layout";
import Landing from "@/pages/landing";
import { SplashScreen } from "@/components/splash-screen";

const Home = lazy(() => import("@/pages/home"));
const GameSetup = lazy(() => import("@/pages/game-setup"));
const GameRecording = lazy(() => import("@/pages/game-recording"));
const Games = lazy(() => import("@/pages/games"));
const Analysis = lazy(() => import("@/pages/analysis"));
const Account = lazy(() => import("@/pages/account"));
const Admin = lazy(() => import("@/pages/admin"));
const GameEdit = lazy(() => import("@/pages/game-edit"));
const Help = lazy(() => import("@/pages/help"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/new-game" component={GameSetup} />
          <Route path="/play/:id" component={GameRecording} />
          <Route path="/games" component={Games} />
          <Route path="/analysis" component={Analysis} />
          <Route path="/account" component={Account} />
          <Route path="/admin" component={Admin} />
          <Route path="/games/:id/edit" component={GameEdit} />
          <Route path="/help" component={Help} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on initial load, not on hot reloads
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    return !hasSeenSplash;
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
