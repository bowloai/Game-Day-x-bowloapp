import { useGameStore } from "@/lib/game-store";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowRight, Trophy, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const { games, getActiveGame } = useGameStore();
  const activeGame = getActiveGame();
  const completedGames = games.filter(g => g.status === 'COMPLETED');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back to PennantPro.</p>
        </div>
        <Link href="/new-game">
          <Button size="lg" className="gap-2 shadow-md hover:shadow-lg transition-all">
            <Plus className="w-5 h-5" /> New Game
          </Button>
        </Link>
      </div>

      {/* Active Game Section */}
      {activeGame && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Active Game</h2>
          <Card className="border-l-4 border-l-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>vs {activeGame.opponent}</span>
                <span className="text-sm font-normal px-2 py-1 bg-background rounded-full border">End {activeGame.ends.length + 1}</span>
              </CardTitle>
              <CardDescription className="flex gap-4 text-foreground/80">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {activeGame.venue}</span>
                <span>•</span>
                <span>{activeGame.type}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/play/${activeGame.id}`}>
                <Button className="w-full sm:w-auto gap-2">
                  Continue Game <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Recent Games */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent History</h2>
          <Link href="/analysis">
            <Button variant="ghost" size="sm">View Analysis</Button>
          </Link>
        </div>

        {completedGames.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Trophy className="w-12 h-12 mb-4 opacity-20" />
              <p>No completed games yet.</p>
              <p className="text-sm">Start a new game to begin tracking your stats.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedGames.slice(0, 6).map((game) => (
              <Card key={game.id} className="hover:border-primary/50 transition-colors group">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between">
                    <span className="truncate">vs {game.opponent}</span>
                    <span className="text-xs text-muted-foreground font-normal font-sans">
                      {format(new Date(game.date), "MMM d")}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs uppercase tracking-wider font-semibold text-primary">
                    {game.type}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> {game.venue}
                    </div>
                    <div>{game.ends.length} Ends Played</div>
                  </div>
                  <Link href="/analysis">
                    <Button variant="outline" size="sm" className="w-full group-hover:bg-secondary">
                      View Stats
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
