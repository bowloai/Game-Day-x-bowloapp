import { useGamesFull } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, CircleDot, Lightbulb } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useMemo, useRef, useEffect } from "react";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { GameWithDetails } from "@/lib/api";

function generateHeatmapInsights(allHeatmap: number[][], forehandHeatmap: number[][], backhandHeatmap: number[][], allCount: number, forehandCount: number, backhandCount: number): string[] {
  if (allCount < 10) return ["Play more games to see insights"];
  const insights: string[] = [];

  const z = {
    sn: allHeatmap.slice(0, 3).reduce((s, r) => s + r.slice(0, 3).reduce((a, b) => a + b, 0), 0),
    so: allHeatmap.slice(0, 3).reduce((s, r) => s + r.slice(3, 6).reduce((a, b) => a + b, 0), 0),
    sw: allHeatmap.slice(0, 3).reduce((s, r) => s + r.slice(6, 9).reduce((a, b) => a + b, 0), 0),
    gn: allHeatmap.slice(3, 6).reduce((s, r) => s + r.slice(0, 3).reduce((a, b) => a + b, 0), 0),
    eff: allHeatmap.slice(3, 6).reduce((s, r) => s + r.slice(3, 6).reduce((a, b) => a + b, 0), 0),
    gw: allHeatmap.slice(3, 6).reduce((s, r) => s + r.slice(6, 9).reduce((a, b) => a + b, 0), 0),
    hn: allHeatmap.slice(6, 9).reduce((s, r) => s + r.slice(0, 3).reduce((a, b) => a + b, 0), 0),
    ho: allHeatmap.slice(6, 9).reduce((s, r) => s + r.slice(3, 6).reduce((a, b) => a + b, 0), 0),
    hw: allHeatmap.slice(6, 9).reduce((s, r) => s + r.slice(6, 9).reduce((a, b) => a + b, 0), 0),
  };

  const effPct = Math.round((z.eff / allCount) * 100);
  if (effPct >= 50) insights.push("Great accuracy - most bowls land near the jack");
  else if (effPct >= 30) insights.push("Good accuracy with room to improve");
  else insights.push("Accuracy needs work");

  const miss = [
    { n: 'short and narrow', c: z.sn }, { n: 'short', c: z.so }, { n: 'short and wide', c: z.sw },
    { n: 'narrow', c: z.gn }, { n: 'wide', c: z.gw },
    { n: 'heavy and narrow', c: z.hn }, { n: 'heavy', c: z.ho }, { n: 'heavy and wide', c: z.hw },
  ].filter(m => m.c > 0);
  if (miss.length) {
    const top = miss.reduce((a, b) => a.c > b.c ? a : b);
    const pct = Math.round((top.c / allCount) * 100);
    if (pct >= 15) insights.push(`Misses tend to be ${top.n}`);
  }

  if (forehandCount >= 5 && backhandCount >= 5) {
    const fh = forehandHeatmap.slice(3, 6).reduce((s, r) => s + r.slice(3, 6).reduce((a, b) => a + b, 0), 0);
    const bh = backhandHeatmap.slice(3, 6).reduce((s, r) => s + r.slice(3, 6).reduce((a, b) => a + b, 0), 0);
    const diff = Math.round((fh / forehandCount) * 100) - Math.round((bh / backhandCount) * 100);
    if (diff >= 10) insights.push("Forehand is more accurate");
    else if (diff <= -10) insights.push("Backhand is more accurate");
    else insights.push("Both hands land similarly");
  }

  return insights.slice(0, 3);
}

function applyFilters(games: GameWithDetails[], searchParams: URLSearchParams): GameWithDetails[] {
  const filterCategory = searchParams.get("category") || "game";
  const filterType = searchParams.get("type") || "All";
  const filterSurface = searchParams.get("surface") || "All";
  const filterPosition = searchParams.get("position") || "All";
  const filterVenue = searchParams.get("venue") || "All";
  const filterOpponent = searchParams.get("opponent") || "All";
  const filterFormat = searchParams.get("format") || "All";
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");
  // Parse yyyy-MM-dd format dates (local time, not UTC)
  const parseDateString = (str: string) => {
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const dateRange = fromDate ? { from: parseDateString(fromDate), to: toDate ? parseDateString(toDate) : undefined } : undefined;

  return games.filter(g => g.status === 'COMPLETED').filter(g => {
    if (filterCategory !== "All" && (g as any).category !== filterCategory) return false;
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

type Bowl = {
  id: string;
  result: string;
  hand: string;
  bowlNumber: number;
  gridRow?: number | null;
  gridCol?: number | null;
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

function HeatmapCanvas({ heatmap, maxCount }: { heatmap: number[][], maxCount: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 280;
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
    
    ctx.filter = 'blur(14px)';
    
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
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(cellSize * 3, cellSize * 3, cellSize * 3, cellSize * 3);
    ctx.setLineDash([]);
    
  }, [heatmap, maxCount]);
  
  return (
    <canvas 
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded-lg mx-auto border border-border/50"
    />
  );
}

function HeatmapCard({ 
  heatmap, 
  maxCount, 
  title, 
  icon: Icon,
  accentColor,
  bowlCount
}: { 
  heatmap: number[][], 
  maxCount: number, 
  title: string,
  icon: React.ElementType,
  accentColor: string,
  bowlCount: number
}) {
  return (
    <Card className="shadow-soft overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${accentColor}`} />
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="text-xs text-muted-foreground ml-auto">{bowlCount} bowls</span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <HeatmapCanvas heatmap={heatmap} maxCount={maxCount} />
        
        <div className="mt-4 space-y-2 max-w-[280px] mx-auto">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Short</span>
            <span>Heavy</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{
            background: 'linear-gradient(to right, rgb(0, 100, 200), rgb(0, 200, 150), rgb(100, 200, 50), rgb(255, 200, 0), rgb(255, 120, 0), rgb(255, 40, 40))'
          }} />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
        
        <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>N=Narrow</span>
          <span>&#9711; Jack</span>
          <span>W=Wide</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalysisHeatmap() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { data: gamesWithDetails = [], isLoading } = useGamesFull();

  const { allHeatmap, forehandHeatmap, backhandHeatmap, maxHeatmapCount, allCount, forehandCount, backhandCount, hasFilters } = useMemo(() => {
    const searchParams = new URLSearchParams(search);
    const filteredGames = applyFilters(gamesWithDetails, searchParams);
    const hasFilters = searchParams.toString().length > 0;
    
    const allBowls: Bowl[] = filteredGames.flatMap(g => 
      g.ends?.flatMap(e => e.bowls || []) || []
    );
    
    const forehandBowls = allBowls.filter(b => b.hand?.toLowerCase() === 'forehand');
    const backhandBowls = allBowls.filter(b => b.hand?.toLowerCase() === 'backhand');

    const allHeatmap = calculateHeatmap(allBowls);
    const forehandHeatmap = calculateHeatmap(forehandBowls);
    const backhandHeatmap = calculateHeatmap(backhandBowls);
    
    const maxHeatmapCount = Math.max(
      ...allHeatmap.flat(),
      ...forehandHeatmap.flat(),
      ...backhandHeatmap.flat()
    );

    return {
      allHeatmap,
      forehandHeatmap,
      backhandHeatmap,
      maxHeatmapCount,
      allCount: allBowls.length,
      forehandCount: forehandBowls.length,
      backhandCount: backhandBowls.length,
      hasFilters,
    };
  }, [gamesWithDetails, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 pt-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation(`/analysis${search ? `?${search}` : ''}`)}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Bowl Landing Heatmaps</h1>
          <p className="text-muted-foreground text-sm">
            Where your bowls finish on the green{hasFilters && " (filtered)"}
          </p>
        </div>
      </div>

      {allCount === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">No data available</h2>
            <p className="text-muted-foreground">Play and finish some games to see heatmaps.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Data Insights */}
          <Card className="shadow-soft border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-3 pb-2 px-3">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  {generateHeatmapInsights(allHeatmap, forehandHeatmap, backhandHeatmap, allCount, forehandCount, backhandCount).map((insight, i) => (
                    <p key={i} className="text-xs text-amber-900 dark:text-amber-100 leading-tight">
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desktop grid layout for heatmap cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <HeatmapCard 
              heatmap={allHeatmap} 
              maxCount={maxHeatmapCount} 
              title="All Bowls"
              icon={Target}
              accentColor="text-primary"
              bowlCount={allCount}
            />
            <HeatmapCard 
              heatmap={forehandHeatmap} 
              maxCount={maxHeatmapCount} 
              title="Forehand"
              icon={CircleDot}
              accentColor="text-sky-600 dark:text-sky-400"
              bowlCount={forehandCount}
            />
            <HeatmapCard 
              heatmap={backhandHeatmap} 
              maxCount={maxHeatmapCount} 
              title="Backhand"
              icon={CircleDot}
              accentColor="text-violet-600 dark:text-violet-400"
              bowlCount={backhandCount}
            />
          </div>
        </div>
      )}
    </div>
  );
}
