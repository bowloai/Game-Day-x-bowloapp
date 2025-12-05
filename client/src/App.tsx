import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import GameSetup from "@/pages/game-setup";
import GameRecording from "@/pages/game-recording";
import Analysis from "@/pages/analysis";
import { GameProvider } from "@/lib/game-store";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/new-game" component={GameSetup} />
        <Route path="/play/:id" component={GameRecording} />
        <Route path="/analysis" component={Analysis} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <Router />
          <Toaster />
        </GameProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
