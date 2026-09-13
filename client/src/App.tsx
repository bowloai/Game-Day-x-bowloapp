import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { lazy, Suspense } from "react";
import Layout from "@/components/layout";
import Landing from "@/pages/landing";
import InstallPrompt from "@/components/install-prompt";

const Home = lazy(() => import("@/pages/home"));
const GameSetup = lazy(() => import("@/pages/game-setup"));
const GameRecording = lazy(() => import("@/pages/game-recording"));
const Games = lazy(() => import("@/pages/games"));
const Analysis = lazy(() => import("@/pages/analysis"));
const AnalysisEffectiveness = lazy(() => import("@/pages/analysis-effectiveness"));
const AnalysisHeatmap = lazy(() => import("@/pages/analysis-heatmap"));
const AnalysisLength = lazy(() => import("@/pages/analysis-length"));
const AnalysisInsights = lazy(() => import("@/pages/analysis-insights"));
const AnalysisStage = lazy(() => import("@/pages/analysis-stage"));
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
          <Route path="/analysis/effectiveness" component={AnalysisEffectiveness} />
          <Route path="/analysis/heatmap" component={AnalysisHeatmap} />
          <Route path="/analysis/length" component={AnalysisLength} />
          <Route path="/analysis/insights" component={AnalysisInsights} />
          <Route path="/analysis/stage" component={AnalysisStage} />
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

function AppInner() {
  const [location] = useLocation();
  useVersionCheck(location);
  return (
    <>
      <Router />
      <Toaster />
      <InstallPrompt />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppInner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
