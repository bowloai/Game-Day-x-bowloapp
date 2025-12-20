import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import Layout from "@/components/layout";
import Landing from "@/pages/landing";

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
      <div className="space-y-4 w-full max-w-md px-4">
        <div className="h-8 bg-primary/10 rounded-lg animate-pulse w-3/4 mx-auto" />
        <div className="h-4 bg-primary/5 rounded animate-pulse w-1/2 mx-auto" />
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="aspect-square bg-primary/10 rounded-xl animate-pulse" />
          <div className="aspect-square bg-primary/10 rounded-xl animate-pulse" style={{ animationDelay: '75ms' }} />
          <div className="aspect-square bg-primary/10 rounded-xl animate-pulse" style={{ animationDelay: '150ms' }} />
        </div>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-sm px-4">
          <div className="h-10 bg-primary/10 rounded-xl animate-pulse w-2/3 mx-auto" />
          <div className="h-4 bg-primary/5 rounded animate-pulse w-1/3 mx-auto" />
          <div className="h-32 bg-primary/5 rounded-xl animate-pulse mt-8" />
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
        <div key={location} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
        </div>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
