import { useGames } from "@/lib/hooks";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowRight, Trophy, MapPin, BarChart3, List, Lightbulb } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { useMemo } from "react";

export default function Home() {
  const { data: games, isLoading } = useGames();
  
  // Fetch all game details for stats
  const { data: gamesWithDetails } = useQuery({
    queryKey: ["/api/games/details"],
    queryFn: async () => {
      const allGames = await api.getGames();
      const completedGames = allGames.filter(g => g.status === 'COMPLETED');
      const details = await Promise.all(
        completedGames.map(g => api.getGameFull(g.id))
      );
      return details;
    },
  });

  const activeGames = games?.filter(g => g.status === 'IN_PROGRESS') || [];
  
  // Calculate stats for the motivational message
  const stats = useMemo(() => {
    if (!gamesWithDetails || gamesWithDetails.length === 0) return null;
    
    const allBowls = gamesWithDetails.flatMap(g => 
      g.ends?.flatMap(e => e.bowls || []) || []
    );
    
    if (allBowls.length === 0) return null;
    
    const effective = allBowls.filter(b => b.result === 'Effective').length;
    const effectivePercent = Math.round((effective / allBowls.length) * 100);
    
    const heavy = allBowls.filter(b => b.result.includes('Heavy')).length;
    const short = allBowls.filter(b => b.result.includes('Short')).length;
    const narrow = allBowls.filter(b => b.result.includes('Narrow')).length;
    const wide = allBowls.filter(b => b.result.includes('Wide')).length;
    
    const forehandBowls = allBowls.filter(b => b.hand === 'Forehand');
    const backhandBowls = allBowls.filter(b => b.hand === 'Backhand');
    const fhEffective = forehandBowls.filter(b => b.result === 'Effective').length;
    const bhEffective = backhandBowls.filter(b => b.result === 'Effective').length;
    const fhPercent = forehandBowls.length > 0 ? Math.round((fhEffective / forehandBowls.length) * 100) : 0;
    const bhPercent = backhandBowls.length > 0 ? Math.round((bhEffective / backhandBowls.length) * 100) : 0;
    
    // Find the main issue
    const issues = [
      { type: 'heavy', count: heavy, percent: Math.round((heavy / allBowls.length) * 100) },
      { type: 'short', count: short, percent: Math.round((short / allBowls.length) * 100) },
      { type: 'narrow', count: narrow, percent: Math.round((narrow / allBowls.length) * 100) },
      { type: 'wide', count: wide, percent: Math.round((wide / allBowls.length) * 100) },
    ].sort((a, b) => b.percent - a.percent);
    
    return {
      effectivePercent,
      mainIssue: issues[0],
      fhPercent,
      bhPercent,
      totalGames: gamesWithDetails.length,
      totalBowls: allBowls.length,
    };
  }, [gamesWithDetails]);
  
  // Generate motivational message based on stats
  const getMessage = () => {
    if (!stats) {
      return {
        message: "Every champion was once a beginner. Start recording your games to unlock personalised insights!",
        focus: "Focus on your pre-shot routine and staying relaxed on the mat."
      };
    }
    
    const messages = [];
    const focuses = [];
    
    // Effective percentage messages
    if (stats.effectivePercent >= 60) {
      messages.push(`Fantastic form! You're delivering ${stats.effectivePercent}% effective bowls across ${stats.totalGames} games.`);
      messages.push(`You're in the zone! ${stats.effectivePercent}% effectiveness shows real consistency.`);
    } else if (stats.effectivePercent >= 40) {
      messages.push(`Solid progress! ${stats.effectivePercent}% effectiveness - you're building good habits.`);
      messages.push(`Keep it up! Every game you're getting closer to that next level.`);
    } else {
      messages.push(`Lawn bowls is a journey of continuous improvement. You've recorded ${stats.totalBowls} bowls - that's real commitment!`);
      messages.push(`The greats weren't great because they started that way. Keep practising!`);
    }
    
    // Focus suggestions based on main issue
    if (stats.mainIssue.percent > 20) {
      switch (stats.mainIssue.type) {
        case 'heavy':
          focuses.push("Try focusing on a softer step and smoother delivery to control your weight.");
          focuses.push("Visualise the bowl slowing down as it approaches the jack.");
          break;
        case 'short':
          focuses.push("Commit to your line and follow through with confidence on your delivery.");
          focuses.push("Focus on a positive step towards your target.");
          break;
        case 'narrow':
          focuses.push("Trust your grass and give the bowl room to work.");
          focuses.push("Pick a target further out on the green and commit to it.");
          break;
        case 'wide':
          focuses.push("Focus on your aim point and keep your delivery smooth.");
          focuses.push("Check your grip - a consistent hold helps with line control.");
          break;
      }
    } else {
      focuses.push("Your consistency is great! Focus on reading the green conditions early.");
      focuses.push("Stay present - focus on one bowl at a time.");
    }
    
    // Hand comparison
    if (Math.abs(stats.fhPercent - stats.bhPercent) > 15) {
      if (stats.fhPercent > stats.bhPercent) {
        focuses.push(`Your forehand (${stats.fhPercent}%) is stronger than backhand (${stats.bhPercent}%) - consider practising backhand more.`);
      } else {
        focuses.push(`Your backhand (${stats.bhPercent}%) is stronger than forehand (${stats.fhPercent}%) - consider practising forehand more.`);
      }
    }
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const randomFocus = focuses[Math.floor(Math.random() * focuses.length)];
    
    return { message: randomMessage, focus: randomFocus };
  };
  
  const { message, focus } = getMessage();

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

      {/* Motivational Message */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="py-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">Next time:</span> {focus}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
