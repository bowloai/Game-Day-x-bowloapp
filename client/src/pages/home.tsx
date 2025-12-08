import { useGames } from "@/lib/hooks";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowRight, MapPin, BarChart3, List } from "lucide-react";

export default function Home() {
  const { data: games, isLoading } = useGames();

  const activeGames = games?.filter(g => g.status === 'IN_PROGRESS') || [];

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary" data-testid="heading-dashboard">PennantPro</h1>
        <p className="text-muted-foreground mt-1">Track. Analyse. Improve.</p>
      </div>

      {/* Active Games Section */}
      {activeGames.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-center">Continue Playing</h2>
          {activeGames.map((game) => (
            <Card key={game.id} className="border-l-4 border-l-primary bg-primary/5" data-testid={`card-active-game-${game.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>vs {game.opponent}</span>
                  <span className="text-sm font-normal px-2 py-1 bg-background rounded-full border">
                    {game.position}
                  </span>
                </CardTitle>
                <CardDescription className="flex gap-4 text-foreground/80">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {game.venue}</span>
                  <span>•</span>
                  <span>{game.type}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/play/${game.id}`}>
                  <Button className="w-full gap-2" data-testid={`button-continue-${game.id}`}>
                    Continue Game <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Menu Tiles */}
      <section className="grid grid-cols-3 gap-4">
        <Link href="/new-game">
          <Card className="aspect-square flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group" data-testid="tile-new-game">
            <CardContent className="flex flex-col items-center justify-center h-full p-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Plus className="w-7 h-7 text-primary" />
              </div>
              <span className="font-semibold text-sm text-center">New Game</span>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/games">
          <Card className="aspect-square flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group" data-testid="tile-my-games">
            <CardContent className="flex flex-col items-center justify-center h-full p-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <List className="w-7 h-7 text-primary" />
              </div>
              <span className="font-semibold text-sm text-center">My Games</span>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/analysis">
          <Card className="aspect-square flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group" data-testid="tile-analysis">
            <CardContent className="flex flex-col items-center justify-center h-full p-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="w-7 h-7 text-primary" />
              </div>
              <span className="font-semibold text-sm text-center">Analysis</span>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
