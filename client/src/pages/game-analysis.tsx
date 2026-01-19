import { useParams, useLocation } from "wouter";
import { useGameFull } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Target, Activity, Hand } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { isEffective, formatResultShort, isShort, isHeavy, hasGoodWeight, isNarrow, isWide, isOnLine } from "@/lib/bowlResults";
import { useMemo, useState, useRef, useEffect } from "react";

type Bowl = {
  id: string;
  result: string;
  hand: string;
  bowlNumber: number;
  gridRow?: number | null;
  gridCol?: number | null;
};

type PhaseStats = {
  name: string;
  ends: number[];
  effectiveCount: number;
  totalBowls: number;
  effectivePercent: number;
  bowls: Bowl[];
  heatmap: number[][];
};

function mapResultToGrid(result: string): { row: number, col: number } {
  const r = result.toLowerCase();
  let row = 4;
  if (r.startsWith('short') || r === 'short') row = 1;
  else if (r.startsWith('heavy') || r === 'heavy') row = 7;
  let col = 4;
  if (r.includes('narrow')) col = 1;
  else if (r.includes('wide')) col = 7;
  return { row, col };
}

function calculateHeatmap(bowls: Bowl[]): number[][] {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  bowls.forEach(bowl => {
    let row: number, col: number;
    if (bowl.gridRow !== null && bowl.gridRow !== undefined && 
        bowl.gridCol !== null && bowl.gridCol !== undefined) {
      row = bowl.gridRow;
      col = bowl.gridCol;
    } else {
      const mapped = mapResultToGrid(bowl.result);
      row = mapped.row;
      col = mapped.col;
    }
    if (row >= 0 && row < 9 && col >= 0 && col < 9) {
      grid[row][col]++;
    }
  });
  return grid;
}

function getThermalColor(intensity: number): { r: number, g: number, b: number } {
  if (intensity <= 0.2) {
    const t = intensity / 0.2;
    return { r: 0, g: Math.round(100 + t * 155), b: Math.round(200 - t * 50) };
  } else if (intensity <= 0.4) {
    const t = (intensity - 0.2) / 0.2;
    return { r: 0, g: Math.round(255 - t * 55), b: Math.round(150 - t * 100) };
  } else if (intensity <= 0.6) {
    const t = (intensity - 0.4) / 0.2;
    return { r: Math.round(t * 255), g: 200, b: Math.round(50 - t * 50) };
  } else if (intensity <= 0.8) {
    const t = (intensity - 0.6) / 0.2;
    return { r: 255, g: Math.round(200 - t * 80), b: 0 };
  } else {
    const t = (intensity - 0.8) / 0.2;
    return { r: 255, g: Math.round(120 - t * 80), b: Math.round(t * 40) };
  }
}

function HeatmapCanvas({ heatmap, maxCount, size = 280 }: { heatmap: number[][], maxCount: number, size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellSize = size / 9;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.fillStyle = 'rgb(248, 250, 245)';
    ctx.fillRect(0, 0, size, size);
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(size, i * cellSize);
      ctx.stroke();
    }
    
    ctx.filter = size >= 200 ? 'blur(14px)' : 'blur(10px)';
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const count = heatmap[row][col];
        if (count === 0) continue;
        
        const intensity = Math.min(count / Math.max(maxCount, 1), 1);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        const radius = cellSize * (1.0 + intensity * 0.8);
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const color = getThermalColor(intensity);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.6 + intensity * 0.3})`);
        gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.25 + intensity * 0.15})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.filter = 'none';
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = size >= 200 ? 2 : 1.5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size >= 200 ? 8 : 4, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const zoneStart = (3 / 9) * size;
    const zoneSize = (3 / 9) * size;
    ctx.strokeRect(zoneStart, zoneStart, zoneSize, zoneSize);
  }, [heatmap, maxCount, size, cellSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded-lg"
    />
  );
}

function calculateStats(bowls: Bowl[]) {
  const total = bowls.length;
  if (total === 0) {
    return {
      total: 0,
      effective: 0,
      effectivePercent: 0,
      firstBowlEffective: 0,
      firstBowlTotal: 0,
      firstBowlPercent: 0,
      short: 0,
      shortPercent: 0,
      heavy: 0,
      heavyPercent: 0,
      goodWeight: 0,
      goodWeightPercent: 0,
      narrow: 0,
      narrowPercent: 0,
      wide: 0,
      widePercent: 0,
      goodLine: 0,
      goodLinePercent: 0,
    };
  }

  const effective = bowls.filter(b => isEffective(b.result)).length;
  const firstBowls = bowls.filter(b => b.bowlNumber === 1);
  const firstBowlEffective = firstBowls.filter(b => isEffective(b.result)).length;
  const short = bowls.filter(b => isShort(b.result)).length;
  const heavy = bowls.filter(b => isHeavy(b.result)).length;
  const goodWeight = bowls.filter(b => hasGoodWeight(b.result)).length;
  const narrow = bowls.filter(b => isNarrow(b.result)).length;
  const wide = bowls.filter(b => isWide(b.result)).length;
  const goodLine = bowls.filter(b => isOnLine(b.result)).length;

  return {
    total,
    effective,
    effectivePercent: Math.round((effective / total) * 100),
    firstBowlEffective,
    firstBowlTotal: firstBowls.length,
    firstBowlPercent: firstBowls.length > 0 ? Math.round((firstBowlEffective / firstBowls.length) * 100) : 0,
    short,
    shortPercent: Math.round((short / total) * 100),
    heavy,
    heavyPercent: Math.round((heavy / total) * 100),
    goodWeight,
    goodWeightPercent: Math.round((goodWeight / total) * 100),
    narrow,
    narrowPercent: Math.round((narrow / total) * 100),
    wide,
    widePercent: Math.round((wide / total) * 100),
    goodLine,
    goodLinePercent: Math.round((goodLine / total) * 100),
  };
}

export default function GameAnalysis() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: game, isLoading } = useGameFull(id);
  const [showEndByEnd, setShowEndByEnd] = useState(false);

  const { 
    sortedEnds, 
    phases, 
    totalScore, 
    allBowls,
    allStats,
    forehandStats,
    backhandStats,
    gameHeatmap,
    maxHeatmapCount 
  } = useMemo(() => {
    if (!game?.ends) return { 
      sortedEnds: [], 
      phases: [], 
      totalScore: { for: 0, against: 0 }, 
      allBowls: [],
      allStats: calculateStats([]),
      forehandStats: calculateStats([]),
      backhandStats: calculateStats([]),
      gameHeatmap: Array.from({ length: 9 }, () => Array(9).fill(0)),
      maxHeatmapCount: 1 
    };
    
    const sorted = [...game.ends]
      .filter(e => e.isCompleted)
      .sort((a, b) => a.endNumber - b.endNumber);
    
    const allBowls = sorted.flatMap(e => e.bowls || []) as Bowl[];
    const forehandBowls = allBowls.filter(b => b.hand === "FOREHAND" || b.hand === "Forehand");
    const backhandBowls = allBowls.filter(b => b.hand === "BACKHAND" || b.hand === "Backhand");
    
    const allStats = calculateStats(allBowls);
    const forehandStats = calculateStats(forehandBowls);
    const backhandStats = calculateStats(backhandBowls);
    const gameHeatmap = calculateHeatmap(allBowls);
    
    const totalEnds = sorted.length;
    const thirdSize = Math.ceil(totalEnds / 3);
    
    const startEnds = sorted.slice(0, thirdSize);
    const middleEnds = sorted.slice(thirdSize, thirdSize * 2);
    const endEnds = sorted.slice(thirdSize * 2);
    
    const calcPhase = (ends: typeof sorted, name: string): PhaseStats => {
      const phaseBowls = ends.flatMap(e => e.bowls || []) as Bowl[];
      const effective = phaseBowls.filter(b => isEffective(b.result)).length;
      const total = phaseBowls.length;
      const heatmap = calculateHeatmap(phaseBowls);
      return {
        name,
        ends: ends.map(e => e.endNumber),
        effectiveCount: effective,
        totalBowls: total,
        effectivePercent: total > 0 ? Math.round((effective / total) * 100) : 0,
        bowls: phaseBowls,
        heatmap,
      };
    };
    
    const phases = [
      calcPhase(startEnds, "Start"),
      calcPhase(middleEnds, "Middle"),
      calcPhase(endEnds, "Finish"),
    ].filter(p => p.totalBowls > 0);
    
    let maxCount = 1;
    gameHeatmap.forEach(row => {
      row.forEach(count => {
        if (count > maxCount) maxCount = count;
      });
    });
    
    const totalFor = sorted.reduce((sum, e) => sum + (e.scoreFor || 0), 0);
    const totalAgainst = sorted.reduce((sum, e) => sum + (e.scoreAgainst || 0), 0);
    
    return { 
      sortedEnds: sorted, 
      phases, 
      totalScore: { for: totalFor, against: totalAgainst },
      allBowls,
      allStats,
      forehandStats,
      backhandStats,
      gameHeatmap,
      maxHeatmapCount: maxCount,
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
  const bestPhase = phases.length > 0 ? phases.reduce((a, b) => a.effectivePercent > b.effectivePercent ? a : b) : null;
  const worstPhase = phases.length > 0 ? phases.reduce((a, b) => a.effectivePercent < b.effectivePercent ? a : b) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
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

      {/* Overall Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Overall Performance</CardTitle>
              <p className="text-xs text-muted-foreground">{allStats.total} bowls</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-3 bg-primary/5 rounded-xl border border-primary/10">
            <span className="text-4xl font-bold text-primary">{allStats.effectivePercent}%</span>
            <p className="text-sm text-muted-foreground mt-1">Bowl Effectiveness</p>
            <p className="text-xs text-muted-foreground">{allStats.effective} of {allStats.total} effective</p>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">First Bowl</p>
              <p className="text-xs text-muted-foreground">{allStats.firstBowlEffective} of {allStats.firstBowlTotal}</p>
            </div>
            <span className="text-xl font-bold">{allStats.firstBowlPercent}%</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Weight</p>
              <div className="flex justify-center gap-2 text-xs">
                <span className="text-blue-600">{allStats.shortPercent}% short</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-orange-600">{allStats.heavyPercent}% heavy</span>
              </div>
              <p className="text-sm font-medium mt-1 text-green-600">{allStats.goodWeightPercent}% good</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Line</p>
              <div className="flex justify-center gap-2 text-xs">
                <span className="text-purple-600">{allStats.narrowPercent}% narrow</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-amber-600">{allStats.widePercent}% wide</span>
              </div>
              <p className="text-sm font-medium mt-1 text-green-600">{allStats.goodLinePercent}% on line</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hand Comparison */}
      {forehandStats.total > 0 && backhandStats.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Hand className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base">By Hand</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 font-medium mb-1">Forehand</p>
                <span className="text-2xl font-bold text-blue-600">{forehandStats.effectivePercent}%</span>
                <p className="text-xs text-muted-foreground mt-1">{forehandStats.effective}/{forehandStats.total} bowls</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-600 font-medium mb-1">Backhand</p>
                <span className="text-2xl font-bold text-purple-600">{backhandStats.effectivePercent}%</span>
                <p className="text-xs text-muted-foreground mt-1">{backhandStats.effective}/{backhandStats.total} bowls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap */}
      {allBowls.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base">Bowl Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex justify-center">
              <HeatmapCanvas heatmap={gameHeatmap} maxCount={maxHeatmapCount} size={280} />
            </div>
            <div className="mt-4 space-y-2 max-w-[280px] mx-auto">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Short</span>
                <span>Heavy</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{
                background: 'linear-gradient(to right, rgb(0, 100, 200), rgb(0, 200, 150), rgb(100, 200, 50), rgb(255, 200, 0), rgb(255, 120, 0), rgb(255, 40, 40))'
              }} />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Narrow</span>
                <span>Wide</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase Breakdown with Mini Heatmaps */}
      {phases.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Game Phases</CardTitle>
            <p className="text-xs text-muted-foreground">How you performed through the game</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {phases.map((phase) => {
                const isBest = bestPhase && phase.name === bestPhase.name && phases.length > 1 && bestPhase.effectivePercent !== worstPhase?.effectivePercent;
                const isWorst = worstPhase && phase.name === worstPhase.name && phases.length > 1 && bestPhase?.effectivePercent !== worstPhase.effectivePercent;
                return (
                  <div 
                    key={phase.name}
                    className={cn(
                      "text-center p-3 rounded-lg border",
                      isBest ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" :
                      isWorst ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800" :
                      "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {isBest && <TrendingUp className="h-3 w-3 text-green-600" />}
                      {isWorst && <TrendingDown className="h-3 w-3 text-red-600" />}
                      {!isBest && !isWorst && <Minus className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-xs font-medium text-muted-foreground">{phase.name}</span>
                    </div>
                    
                    <div className="flex justify-center mb-2">
                      <HeatmapCanvas heatmap={phase.heatmap} maxCount={maxHeatmapCount} size={90} />
                    </div>
                    
                    <div className={cn(
                      "text-xl font-bold",
                      isBest ? "text-green-600" : isWorst ? "text-red-600" : "text-foreground"
                    )}>
                      {phase.effectivePercent}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {phase.effectiveCount}/{phase.totalBowls} • Ends {phase.ends[0]}-{phase.ends[phase.ends.length - 1]}
                    </div>
                  </div>
                );
              })}
            </div>
            
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

      {/* End by End */}
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
