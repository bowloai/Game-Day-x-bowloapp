import { useGamesFull } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Timer, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useMemo, useRef, useEffect, useState } from "react";
import { isEffective, hasGoodWeight, isShort, isHeavy, isOnLine, isNarrow, isWide, formatResultShort, getResultColorClass } from "@/lib/bowlResults";
import { startOfDay, endOfDay, isWithinInterval, format } from "date-fns";
import type { GameWithDetails } from "@/lib/api";

type Bowl = {
  id: string;
  result: string;
  hand: string;
  bowlNumber: number;
  gridRow?: number | null;
  gridCol?: number | null;
};

type BowlWithMeta = Bowl & { 
  stage: 'start' | 'middle' | 'finish';
  endId: string;
  endNumber: number;
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
  const colors = [
    { r: 0, g: 100, b: 200 },
    { r: 0, g: 200, b: 150 },
    { r: 100, g: 200, b: 50 },
    { r: 255, g: 200, b: 0 },
    { r: 255, g: 120, b: 0 },
    { r: 255, g: 40, b: 40 },
  ];
  const idx = intensity * (colors.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.min(lower + 1, colors.length - 1);
  const t = idx - lower;
  return {
    r: Math.round(colors[lower].r + t * (colors[upper].r - colors[lower].r)),
    g: Math.round(colors[lower].g + t * (colors[upper].g - colors[lower].g)),
    b: Math.round(colors[lower].b + t * (colors[upper].b - colors[lower].b)),
  };
}

function HeatmapCanvas({ heatmap, maxCount, size = 140 }: { heatmap: number[][], maxCount: number, size?: number }) {
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
    ctx.filter = 'blur(10px)';
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const count = heatmap[row][col];
        if (count === 0) continue;
        const intensity = Math.min(count / Math.max(maxCount, 1), 1);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        const radius = cellSize * (0.8 + intensity * 0.6);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const color = getThermalColor(intensity);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.5 + intensity * 0.3})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      }
    }
    ctx.filter = 'none';
    const jackX = 4 * cellSize + cellSize / 2;
    const jackY = 4 * cellSize + cellSize / 2;
    ctx.beginPath();
    ctx.arc(jackX, jackY, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
  }, [heatmap, maxCount, size, cellSize]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width: size, height: size, borderRadius: '8px' }}
    />
  );
}

function applyFilters(games: GameWithDetails[], searchParams: URLSearchParams): GameWithDetails[] {
  const filterType = searchParams.get("type") || "All";
  const filterSurface = searchParams.get("surface") || "All";
  const filterPosition = searchParams.get("position") || "All";
  const filterVenue = searchParams.get("venue") || "All";
  const filterOpponent = searchParams.get("opponent") || "All";
  const filterFormat = searchParams.get("format") || "All";
  const gameId = searchParams.get("gameId");
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");
  const parseDateString = (str: string) => {
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const dateRange = fromDate ? { from: parseDateString(fromDate), to: toDate ? parseDateString(toDate) : undefined } : undefined;

  return games.filter(g => g.status === 'COMPLETED').filter(g => {
    if (gameId && g.id !== gameId) return false;
    if (filterType !== "All" && g.type !== filterType) return false;
    if (filterSurface !== "All" && g.surface !== filterSurface) return false;
    if (filterPosition !== "All" && g.position !== filterPosition) return false;
    if (filterVenue !== "All" && g.venue !== filterVenue) return false;
    if (filterOpponent !== "All" && g.opponent !== filterOpponent) return false;
    if (filterFormat !== "All" && (g.gameFormat || 'fours') !== filterFormat) return false;
    if (dateRange?.from) {
      const gameDate = new Date(g.createdAt);
      const start = startOfDay(dateRange.from);
      const end = endOfDay(dateRange.to || dateRange.from);
      if (!isWithinInterval(gameDate, { start, end })) return false;
    }
    return true;
  });
}

function calculateStats(bowls: Bowl[]) {
  const total = bowls.length;
  if (total === 0) return { total: 0, effectivePercent: 0, shortPercent: 0, heavyPercent: 0, goodWeightPercent: 0, narrowPercent: 0, widePercent: 0, goodLinePercent: 0 };
  const effective = bowls.filter(b => isEffective(b.result)).length;
  const short = bowls.filter(b => isShort(b.result)).length;
  const heavy = bowls.filter(b => isHeavy(b.result)).length;
  const goodWeight = bowls.filter(b => hasGoodWeight(b.result)).length;
  const narrow = bowls.filter(b => isNarrow(b.result)).length;
  const wide = bowls.filter(b => isWide(b.result)).length;
  const goodLine = bowls.filter(b => isOnLine(b.result)).length;
  return {
    total,
    effectivePercent: Math.round((effective / total) * 100),
    shortPercent: Math.round((short / total) * 100),
    heavyPercent: Math.round((heavy / total) * 100),
    goodWeightPercent: Math.round((goodWeight / total) * 100),
    narrowPercent: Math.round((narrow / total) * 100),
    widePercent: Math.round((wide / total) * 100),
    goodLinePercent: Math.round((goodLine / total) * 100),
  };
}

export default function AnalysisStage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { data: gamesWithDetails = [], isLoading } = useGamesFull();
  const [expandedEnds, setExpandedEnds] = useState<Set<string>>(new Set());

  const { stageData, isSingleGame, singleGame, endsByNumber, hasFilters } = useMemo(() => {
    const searchParams = new URLSearchParams(search);
    const filteredGames = applyFilters(gamesWithDetails, searchParams);
    const hasFilters = searchParams.toString().length > 0;
    const isSingleGame = filteredGames.length === 1;
    const singleGame = isSingleGame ? filteredGames[0] : null;
    
    const classifyStage = (bowlNumber: number, bowlsPerEnd: number): 'start' | 'middle' | 'finish' => {
      const third = bowlsPerEnd / 3;
      if (bowlNumber <= Math.ceil(third)) return 'start';
      if (bowlNumber <= Math.ceil(third * 2)) return 'middle';
      return 'finish';
    };

    const allBowlsWithMeta: BowlWithMeta[] = filteredGames.flatMap(g => {
      const bowlsPerEnd = g.bowlsPerEnd || 2;
      return g.ends?.flatMap(e => 
        (e.bowls || []).map(b => ({ 
          ...b, 
          stage: classifyStage(b.bowlNumber, bowlsPerEnd),
          endId: e.id,
          endNumber: e.endNumber,
        }))
      ) || [];
    });

    const getStageData = (stage: 'start' | 'middle' | 'finish') => {
      const stageBowls = allBowlsWithMeta.filter(b => b.stage === stage);
      const forehand = stageBowls.filter(b => b.hand?.toLowerCase() === 'forehand');
      const backhand = stageBowls.filter(b => b.hand?.toLowerCase() === 'backhand');
      return {
        all: { stats: calculateStats(stageBowls), heatmap: calculateHeatmap(stageBowls), bowls: stageBowls },
        forehand: { stats: calculateStats(forehand), heatmap: calculateHeatmap(forehand), bowls: forehand },
        backhand: { stats: calculateStats(backhand), heatmap: calculateHeatmap(backhand), bowls: backhand },
      };
    };

    const stageData = {
      start: getStageData('start'),
      middle: getStageData('middle'),
      finish: getStageData('finish'),
    };

    // Group bowls by end for single game view
    const endsByNumber: Map<number, { id: string; bowls: BowlWithMeta[] }> = new Map();
    if (isSingleGame && singleGame) {
      singleGame.ends?.forEach(e => {
        const bowls = allBowlsWithMeta.filter(b => b.endId === e.id);
        endsByNumber.set(e.endNumber, { id: e.id, bowls });
      });
    }

    return { stageData, isSingleGame, singleGame, endsByNumber, hasFilters };
  }, [gamesWithDetails, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxCount = Math.max(
    ...Object.values(stageData).flatMap(s => [
      ...s.all.heatmap.flat(),
      ...s.forehand.heatmap.flat(),
      ...s.backhand.heatmap.flat(),
    ])
  );

  const toggleEnd = (endId: string) => {
    setExpandedEnds(prev => {
      const next = new Set(prev);
      if (next.has(endId)) next.delete(endId);
      else next.add(endId);
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 pt-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation('/analysis')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Performance by End Stage</h1>
          <p className="text-muted-foreground text-sm">
            {isSingleGame ? `vs ${singleGame?.opponent}` : 'All games'}{hasFilters && " (filtered)"}
          </p>
        </div>
      </div>

      {/* Stage breakdown cards */}
      {(['start', 'middle', 'finish'] as const).map((stage) => {
        const data = stageData[stage];
        const label = stage === 'start' ? 'Start of End' : stage === 'middle' ? 'Middle of End' : 'Finish of End';
        const desc = stage === 'start' ? 'First bowls' : stage === 'middle' ? 'Middle bowls' : 'Final bowls';
        
        return (
          <Card key={stage} className="shadow-soft" data-testid={`card-stage-${stage}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Timer className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{label}</CardTitle>
                  <p className="text-xs text-muted-foreground">{desc} ({data.all.stats.total} bowls)</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Effectiveness Hero */}
              <div className="text-center py-3 bg-primary/5 rounded-xl border border-primary/10">
                <span className="text-3xl font-bold text-primary">
                  {data.all.stats.effectivePercent}%
                </span>
                <p className="text-sm text-muted-foreground mt-1">Effectiveness</p>
              </div>

              {/* Heatmaps: All / Forehand / Backhand */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">All</p>
                  <div className="flex justify-center">
                    <HeatmapCanvas heatmap={data.all.heatmap} maxCount={maxCount} size={100} />
                  </div>
                  <p className="text-xs mt-1">{data.all.stats.total} bowls</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Forehand</p>
                  <div className="flex justify-center">
                    <HeatmapCanvas heatmap={data.forehand.heatmap} maxCount={maxCount} size={100} />
                  </div>
                  <p className="text-xs mt-1">{data.forehand.stats.total} bowls</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Backhand</p>
                  <div className="flex justify-center">
                    <HeatmapCanvas heatmap={data.backhand.heatmap} maxCount={maxCount} size={100} />
                  </div>
                  <p className="text-xs mt-1">{data.backhand.stats.total} bowls</p>
                </div>
              </div>

              {/* Weight/Line breakdown */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-rose-50 dark:bg-rose-950/30 rounded p-2">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{data.all.stats.shortPercent}%</span>
                    <p className="text-muted-foreground">Short</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                    <span className="font-semibold text-green-600 dark:text-green-400">{data.all.stats.goodWeightPercent}%</span>
                    <p className="text-muted-foreground">Good</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/30 rounded p-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">{data.all.stats.heavyPercent}%</span>
                    <p className="text-muted-foreground">Heavy</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{data.all.stats.narrowPercent}%</span>
                    <p className="text-muted-foreground">Narrow</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                    <span className="font-semibold text-green-600 dark:text-green-400">{data.all.stats.goodLinePercent}%</span>
                    <p className="text-muted-foreground">On Line</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/30 rounded p-2">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{data.all.stats.widePercent}%</span>
                    <p className="text-muted-foreground">Wide</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Single Game: Per-End Expandable View */}
      {isSingleGame && endsByNumber.size > 0 && (
        <Card className="shadow-soft" data-testid="card-ends-breakdown">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Results by End</CardTitle>
            <p className="text-xs text-muted-foreground">Tap an end to see individual bowls</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(endsByNumber.entries()).sort((a, b) => a[0] - b[0]).map(([endNum, { id, bowls }]) => {
              const isExpanded = expandedEnds.has(id);
              const endStats = calculateStats(bowls);
              return (
                <Collapsible key={id} open={isExpanded} onOpenChange={() => toggleEnd(id)}>
                  <CollapsibleTrigger className="w-full" data-testid={`trigger-end-${endNum}`}>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">End {endNum}</span>
                        <span className="text-sm text-muted-foreground">({bowls.length} bowls)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${endStats.effectivePercent >= 50 ? 'text-primary' : ''}`}>
                          {endStats.effectivePercent}%
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-2 pb-1 px-3 space-y-1">
                      {bowls.sort((a, b) => a.bowlNumber - b.bowlNumber).map((bowl) => (
                        <div key={bowl.id} className="flex items-center justify-between text-sm py-1 border-b border-muted/30 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-center text-muted-foreground">#{bowl.bowlNumber}</span>
                            <span className="capitalize text-xs bg-muted/50 px-2 py-0.5 rounded">
                              {bowl.hand?.toLowerCase() === 'forehand' ? 'FH' : 'BH'}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">{bowl.stage}</span>
                          </div>
                          <span className={`font-medium ${getResultColorClass(bowl.result)}`}>
                            {formatResultShort(bowl.result)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
