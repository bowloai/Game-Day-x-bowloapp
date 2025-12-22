import { useGames, useGamesFull } from "@/lib/hooks";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowRight, MapPin, BarChart3, List, Target, TrendingUp, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6 animate-in fade-in duration-500 -mx-4 -mt-4">
      {/* Bold Gradient Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-emerald-600 text-white px-6 py-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          {user?.profileImageUrl ? (
            <img 
              src={user.profileImageUrl} 
              alt={firstName}
              className="w-14 h-14 rounded-full border-2 border-white/30 shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
              {firstName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white/70 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold" data-testid="heading-dashboard">{firstName}</h1>
          </div>
        </div>

        {/* Hero Stat Card */}
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">Effectiveness Rate</p>
              <p className="text-4xl font-bold">{effectiveRate}%</p>
              <p className="text-white/60 text-xs mt-1">{effectiveBowls.length} of {allBowls.length} bowls</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Target className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <StatCard 
          icon={<Zap className="w-5 h-5" />}
          label="Total Bowls"
          value={allBowls.length.toLocaleString()}
          color="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatCard 
          icon={<Trophy className="w-5 h-5" />}
          label="Win Rate"
          value={`${winRate}%`}
          color="bg-gradient-to-br from-amber-500 to-orange-500"
        />
        <StatCard 
          icon={<BarChart3 className="w-5 h-5" />}
          label="Games Played"
          value={completedGames.length.toString()}
          color="bg-gradient-to-br from-cyan-500 to-blue-500"
        />
        <StatCard 
          icon={<TrendingUp className="w-5 h-5" />}
          label="Total Wins"
          value={totalWins.toString()}
          color="bg-gradient-to-br from-emerald-500 to-green-600"
        />
      </div>

      {/* Active Games Section */}
      {activeGames.length > 0 && (
        <section className="px-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Continue Playing
          </h2>
          {activeGames.map((game) => (
            <Card 
              key={game.id} 
              className="overflow-hidden border-0 shadow-md bg-gradient-to-r from-primary/5 to-primary/10" 
              data-testid={`card-active-game-${game.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-lg">vs {game.opponent}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {game.venue}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                    {game.position}
                  </span>
                </div>
                <Link href={`/play/${game.id}`}>
                  <Button className="w-full gap-2 rounded-xl h-11" data-testid={`button-continue-${game.id}`}>
                    Continue Game <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Quick Actions */}
      <section className="px-4 space-y-3">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/new-game">
            <ActionTile 
              icon={<Plus className="w-6 h-6" />}
              label="New Game"
              color="bg-gradient-to-br from-primary to-emerald-600"
              testId="tile-new-game"
            />
          </Link>
          <Link href="/games">
            <ActionTile 
              icon={<List className="w-6 h-6" />}
              label="My Games"
              color="bg-gradient-to-br from-slate-600 to-slate-800"
              testId="tile-my-games"
            />
          </Link>
          <Link href="/analysis">
            <ActionTile 
              icon={<BarChart3 className="w-6 h-6" />}
              label="Analysis"
              color="bg-gradient-to-br from-violet-500 to-purple-600"
              testId="tile-analysis"
            />
          </Link>
        </div>
      </section>

      <div className="h-4" />
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  color: string;
}) {
  return (
    <div className={cn(
      "rounded-2xl p-4 text-white shadow-lg",
      color
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-white/70 text-sm">{label}</p>
    </div>
  );
}

function ActionTile({ 
  icon, 
  label, 
  color,
  testId
}: { 
  icon: React.ReactNode; 
  label: string; 
  color: string;
  testId: string;
}) {
  return (
    <Card 
      className="border-0 shadow-md overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
      data-testid={testId}
    >
      <CardContent className="p-0">
        <div className={cn("aspect-square flex flex-col items-center justify-center text-white", color)}>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
            {icon}
          </div>
          <span className="font-medium text-sm text-center px-1">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}
