import { useGames, useGamesFull } from "@/lib/hooks";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowRight, MapPin, BarChart3, List, Target } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const { data: games, isLoading } = useGames();
  const { data: gamesFull } = useGamesFull();

  const activeGames = games?.filter(g => g.status === 'IN_PROGRESS') || [];
  const completedGames = games?.filter(g => g.status === 'COMPLETED') || [];

  const allBowls = gamesFull?.flatMap(g => g.ends?.flatMap(e => e.bowls || []) || []) || [];
  const effectiveBowls = allBowls.filter(b => 
    b.result === 'GOOD' || b.result === 'Effective' || 
    (b.gridRow !== null && b.gridRow !== undefined && b.gridRow >= 3 && b.gridRow <= 5 && 
     b.gridCol !== null && b.gridCol !== undefined && b.gridCol >= 3 && b.gridCol <= 5)
  );
  const effectiveRate = allBowls.length > 0 ? Math.round((effectiveBowls.length / allBowls.length) * 100) : 0;

  const totalWins = completedGames.filter(g => {
    const game = gamesFull?.find(gf => gf.id === g.id);
    if (!game?.ends) return false;
    const scoreFor = game.ends.reduce((sum, e) => sum + (e.scoreFor || 0), 0);
    const scoreAgainst = game.ends.reduce((sum, e) => sum + (e.scoreAgainst || 0), 0);
    return scoreFor > scoreAgainst;
  }).length;

  const winRate = completedGames.length > 0 ? Math.round((totalWins / completedGames.length) * 100) : 0;

  const firstName = user?.firstName || 'Player';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Simple Header */}
      <div className="flex items-center gap-3 pt-2">
        {user?.profileImageUrl ? (
          <img 
            src={user.profileImageUrl} 
            alt={firstName}
            className="w-12 h-12 rounded-full border-2 border-primary/20"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
            {firstName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-muted-foreground text-sm">Welcome back,</p>
          <h1 className="text-xl font-semibold" data-testid="heading-dashboard">{firstName}</h1>
        </div>
      </div>

      {/* Main Stat Card */}
      <Card className="border shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Effectiveness Rate</p>
              <p className="text-4xl font-bold text-primary">{effectiveRate}%</p>
              <p className="text-muted-foreground text-xs mt-1">{effectiveBowls.length} of {allBowls.length} bowls</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-7 h-7 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Simple design */}
      <div className="grid grid-cols-4 gap-2">
        <SimpleStatCard label="Bowls" value={allBowls.length.toLocaleString()} />
        <SimpleStatCard label="Win %" value={`${winRate}%`} />
        <SimpleStatCard label="Games" value={completedGames.length.toString()} />
        <SimpleStatCard label="Wins" value={totalWins.toString()} />
      </div>

      {/* Active Games Section */}
      {activeGames.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            In Progress
          </h2>
          {activeGames.map((game) => (
            <Card 
              key={game.id} 
              className="border shadow-soft" 
              data-testid={`card-active-game-${game.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">vs {game.opponent}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {game.venue}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-muted text-muted-foreground rounded">
                    {game.position}
                  </span>
                </div>
                <Link href={`/play/${game.id}`}>
                  <Button className="w-full gap-2" data-testid={`button-continue-${game.id}`}>
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Quick Actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/new-game">
            <Card className="border shadow-soft hover:shadow-md transition-shadow cursor-pointer" data-testid="tile-new-game">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium">New Game</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/games">
            <Card className="border shadow-soft hover:shadow-md transition-shadow cursor-pointer" data-testid="tile-my-games">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <List className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">My Games</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/analysis">
            <Card className="border shadow-soft hover:shadow-md transition-shadow cursor-pointer" data-testid="tile-analysis">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">Analysis</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <div className="h-4" />
    </div>
  );
}

function SimpleStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 bg-muted/30 rounded-lg">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
