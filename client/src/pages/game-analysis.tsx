import { useParams, useLocation } from "wouter";
import { useGameFull } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { isEffective, formatResultShort } from "@/lib/bowlResults";
import { useMemo, useState } from "react";

type PhaseStats = {
  name: string;
  ends: number[];
  effectiveCount: number;
  totalBowls: number;
  effectivePercent: number;
};

export default function GameAnalysis() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: game, isLoading } = useGameFull(id);
  const [showEndByEnd, setShowEndByEnd] = useState(false);

  const { sortedEnds, phases, totalScore, overallEffective, overallTotal } = useMemo(() => {
    if (!game?.ends) return { sortedEnds: [], phases: [], totalScore: { for: 0, against: 0 }, overallEffective: 0, overallTotal: 0 };
    
    const sorted = [...game.ends]
      .filter(e => e.isCompleted)
      .sort((a, b) => a.endNumber - b.endNumber);
    
    const totalEnds = sorted.length;
    const thirdSize = Math.ceil(totalEnds / 3);
    
    const startEnds = sorted.slice(0, thirdSize);
    const middleEnds = sorted.slice(thirdSize, thirdSize * 2);
    const endEnds = sorted.slice(thirdSize * 2);
    
    const calcPhase = (ends: typeof sorted, name: string): PhaseStats => {
      const allBowls = ends.flatMap(e => e.bowls || []);
      const effective = allBowls.filter(b => isEffective(b.result)).length;
      const total = allBowls.length;
      return {
        name,
        ends: ends.map(e => e.endNumber),
        effectiveCount: effective,
        totalBowls: total,
        effectivePercent: total > 0 ? Math.round((effective / total) * 100) : 0,
      };
    };
    
    const phases = [
      calcPhase(startEnds, "Start"),
      calcPhase(middleEnds, "Middle"),
      calcPhase(endEnds, "Finish"),
    ].filter(p => p.totalBowls > 0);
    
    const totalFor = sorted.reduce((sum, e) => sum + (e.scoreFor || 0), 0);
    const totalAgainst = sorted.reduce((sum, e) => sum + (e.scoreAgainst || 0), 0);
    
    const allBowls = sorted.flatMap(e => e.bowls || []);
    const overallEffective = allBowls.filter(b => isEffective(b.result)).length;
    const overallTotal = allBowls.length;
    
    return { 
      sortedEnds: sorted, 
      phases, 
      totalScore: { for: totalFor, against: totalAgainst },
      overallEffective,
      overallTotal,
    };
  }, [game]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Game not found.</p>
        <Button onClick={() => setLocation("/games")} className="mt-4">
          Back to Games
        </Button>
      </div>
    );
  }

  const result = totalScore.for > totalScore.against ? "WIN" : totalScore.for < totalScore.against ? "LOSS" : "DRAW";
  const overallPercent = overallTotal > 0 ? Math.round((overallEffective / overallTotal) * 100) : 0;

  // Find best and worst phases
  const bestPhase = phases.length > 0 ? phases.reduce((a, b) => a.effectivePercent > b.effectivePercent ? a : b) : null;
  const worstPhase = phases.length > 0 ? phases.reduce((a, b) => a.effectivePercent < b.effectivePercent ? a : b) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 pt-2">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/games")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-primary" data-testid="heading-game-analysis">Game Analysis</h1>
          <p className="text-muted-foreground text-sm">vs {game.opponent} • {format(new Date(game.createdAt), "MMM d, yyyy")}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono">
            {totalScore.for} - {totalScore.against}
          </div>
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded",
            result === "WIN" ? "bg-green-100 text-green-700" : result === "LOSS" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
          )}>
            {result}
          </span>
        </div>
      </div>

      {/* Overall Effectiveness */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{overallPercent}%</div>
            <p className="text-sm text-muted-foreground mt-1">Overall Effectiveness</p>
            <p className="text-xs text-muted-foreground">{overallEffective} of {overallTotal} bowls</p>
          </div>
        </CardContent>
      </Card>

      {/* Phase Breakdown */}
      {phases.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Game Phases</CardTitle>
            <p className="text-xs text-muted-foreground">How you performed through the game</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {phases.map((phase) => {
                const isBest = bestPhase && phase.name === bestPhase.name && phases.length > 1 && bestPhase.effectivePercent !== worstPhase?.effectivePercent;
                const isWorst = worstPhase && phase.name === worstPhase.name && phases.length > 1 && bestPhase?.effectivePercent !== worstPhase.effectivePercent;
                return (
                  <div 
                    key={phase.name}
                    className={cn(
                      "text-center p-4 rounded-lg border",
                      isBest ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" :
                      isWorst ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800" :
                      "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {isBest && <TrendingUp className="h-3 w-3 text-green-600" />}
                      {isWorst && <TrendingDown className="h-3 w-3 text-red-600" />}
                      {!isBest && !isWorst && <Minus className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-xs font-medium text-muted-foreground">{phase.name}</span>
                    </div>
                    <div className={cn(
                      "text-2xl font-bold",
                      isBest ? "text-green-600" : isWorst ? "text-red-600" : "text-foreground"
                    )}>
                      {phase.effectivePercent}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {phase.effectiveCount}/{phase.totalBowls} bowls
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Ends {phase.ends[0]}-{phase.ends[phase.ends.length - 1]}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Insight text */}
            {bestPhase && worstPhase && bestPhase.effectivePercent !== worstPhase.effectivePercent && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {bestPhase.effectivePercent - worstPhase.effectivePercent >= 20 
                  ? `Your ${bestPhase.name.toLowerCase()} was much stronger than your ${worstPhase.name.toLowerCase()}.`
                  : `Fairly consistent through the game.`
                }
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* End by End Toggle */}
      <Card>
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowEndByEnd(!showEndByEnd)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">End by End</CardTitle>
              <p className="text-xs text-muted-foreground">{sortedEnds.length} ends recorded</p>
            </div>
            <Button variant="ghost" size="sm">
              {showEndByEnd ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        
        {showEndByEnd && (
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center px-2">End</TableHead>
                  <TableHead className="w-14 text-center px-2">Score</TableHead>
                  <TableHead className="w-12 text-center px-2">Eff</TableHead>
                  <TableHead className="px-2">Bowls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEnds.map((end) => {
                  const sortedBowls = (end.bowls || []).sort((a, b) => a.bowlNumber - b.bowlNumber);
                  const effectiveCount = sortedBowls.filter(b => isEffective(b.result)).length;
                  const totalBowls = sortedBowls.length;
                  const effPercent = totalBowls > 0 ? Math.round((effectiveCount / totalBowls) * 100) : 0;
                  return (
                    <TableRow key={end.id} className={cn(end.isDead && "opacity-50")}>
                      <TableCell className="text-center font-medium px-2">
                        {end.endNumber}
                        {end.isDead && <span className="block text-[10px] text-destructive">Dead</span>}
                      </TableCell>
                      <TableCell className="text-center px-2">
                        <div className="flex items-center justify-center gap-0.5 font-mono text-sm">
                          <span className={cn((end.scoreFor || 0) > (end.scoreAgainst || 0) && "text-green-600 font-bold")}>
                            {end.scoreFor || 0}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className={cn((end.scoreAgainst || 0) > (end.scoreFor || 0) && "text-red-600 font-bold")}>
                            {end.scoreAgainst || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-2">
                        <span className={cn(
                          "font-mono text-sm font-medium",
                          effPercent >= 75 ? "text-green-600" :
                          effPercent >= 50 ? "text-green-500" :
                          effPercent >= 25 ? "text-amber-500" :
                          "text-red-500"
                        )}>
                          {effectiveCount}/{totalBowls}
                        </span>
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="flex flex-wrap gap-1">
                          {sortedBowls.length > 0 ? (
                            sortedBowls.map((bowl) => {
                              const bowlIsEffective = isEffective(bowl.result);
                              const isForehand = bowl.hand === "FOREHAND" || bowl.hand === "Forehand";
                              return (
                                <span
                                  key={bowl.id}
                                  className={cn(
                                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium",
                                    bowlIsEffective
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                      : isForehand
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                        : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                                  )}
                                >
                                  <span className="opacity-60">{bowl.bowlNumber}.</span>
                                  <span>{formatResultShort(bowl.result)}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      <div className="flex justify-center gap-3 pt-2">
        <Button variant="outline" onClick={() => setLocation(`/games/${id}/edit`)} data-testid="button-edit-game">
          Edit Game
        </Button>
        <Button onClick={() => setLocation("/games")} data-testid="button-done">
          Done
        </Button>
      </div>
    </div>
  );
}
