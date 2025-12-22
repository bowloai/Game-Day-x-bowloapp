import { useGamesFull } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import type { GameWithDetails } from "@/lib/api";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { ChevronDown, ChevronUp, Filter, Target, CircleDot, X, FileText, Star, Brain, Gauge, StickyNote, Calendar as CalendarIcon } from "lucide-react";
import { isEffective, hasGoodWeight, isShort, isHeavy, isOnLine, isNarrow, isWide } from "@/lib/bowlResults";

type Bowl = {
  id: string;
  result: string;
  hand: string;
  bowlNumber: number;
  gridRow?: number | null;
  gridCol?: number | null;
};

function mapResultToGrid(result: string): { row: number, col: number } {
  // Map result strings to center of corresponding 9x9 zone
  // New format: weight_line (e.g., short_narrow, effective_online)
  // Legacy format: Weight & Line (e.g., Short & Narrow)
  const r = result.toLowerCase();
  
  // Determine row based on weight
  let row = 4; // default: effective weight (center)
  if (r.startsWith('short') || r === 'short') row = 1;
  else if (r.startsWith('heavy') || r === 'heavy') row = 7;
  
  // Determine col based on line
  let col = 4; // default: online (center)
  if (r.includes('narrow')) col = 1;
  else if (r.includes('wide')) col = 7;
  
  return { row, col };
}

function calculateHeatmap(bowls: Bowl[]): number[][] {
  // Create 9x9 grid initialized with zeros
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  
  bowls.forEach(bowl => {
    let row: number, col: number;
    
    // Use gridRow/gridCol if available (new data), otherwise map from result (old data)
    if (bowl.gridRow !== null && bowl.gridRow !== undefined && 
        bowl.gridCol !== null && bowl.gridCol !== undefined) {
      row = bowl.gridRow;
      col = bowl.gridCol;
    } else {
      const mapped = mapResultToGrid(bowl.result);
      row = mapped.row;
      col = mapped.col;
    }
    
    // Ensure within bounds
    if (row >= 0 && row < 9 && col >= 0 && col < 9) {
      grid[row][col]++;
    }
  });
  
  return grid;
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
    
    // Set up for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear with light background (soft cream/green tint)
    ctx.fillStyle = 'rgb(248, 250, 245)';
    ctx.fillRect(0, 0, size, size);
    
    // Draw subtle grid lines
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
    
    // Apply blur filter for smooth blending
    ctx.filter = 'blur(14px)';
    
    // Draw radial gradients for each cell with data
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const count = heatmap[row][col];
        if (count === 0) continue;
        
        const intensity = Math.min(count / Math.max(maxCount, 1), 1);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        const radius = cellSize * (1.0 + intensity * 0.8);
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        
        // Thermal color based on intensity - softer on light background
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
    
    // Reset filter for overlays
    ctx.filter = 'none';
    
    // Draw jack marker (center) - darker for light background
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw effective zone border
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

function getThermalColor(intensity: number): { r: number, g: number, b: number } {
  // Thermal gradient: blue -> cyan -> green -> yellow -> orange -> red
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

function HeatmapGrid({ heatmap, maxCount, title }: { heatmap: number[][], maxCount: number, title: string }) {
  return (
    <Card className="shadow-soft overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <HeatmapCanvas heatmap={heatmap} maxCount={maxCount} />
        
        {/* Legend */}
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

  // Use shared utility functions for consistent result checking
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

function StatBlock({ title, icon: Icon, stats, accentColor }: { 
  title: string; 
  icon: React.ElementType;
  stats: ReturnType<typeof calculateStats>;
  accentColor?: string;
}) {
  const accent = accentColor || "text-primary";
  
  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className={`h-4 w-4 ${accent}`} />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{stats.total} bowls</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Bowl Effectiveness - Hero stat */}
        <div className="text-center py-3 bg-primary/5 rounded-xl border border-primary/10">
          <span className={`text-4xl font-bold ${accent}`} data-testid={`text-effectiveness-${title.toLowerCase().replace(' ', '-')}`}>
            {stats.effectivePercent}%
          </span>
          <p className="text-sm text-muted-foreground mt-1">Bowl Effectiveness</p>
          <p className="text-xs text-muted-foreground">
            {stats.effective} of {stats.total} effective
          </p>
        </div>

        {/* First Bowl Effectiveness */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <p className="text-sm font-medium">First Bowl</p>
            <p className="text-xs text-muted-foreground">Effectiveness</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-primary" data-testid={`text-first-effectiveness-${title.toLowerCase().replace(' ', '-')}`}>
              {stats.firstBowlPercent}%
            </span>
            <p className="text-xs text-muted-foreground">
              {stats.firstBowlEffective}/{stats.firstBowlTotal}
            </p>
          </div>
        </div>

        {/* Weight Control */}
        <div className="space-y-2 pt-2 border-t">
          <span className="text-sm font-medium">Weight Control</span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/40 rounded-lg p-2">
              <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats.shortPercent}%</div>
              <div className="text-xs text-muted-foreground">Short</div>
            </div>
            <div className="bg-primary/10 rounded-lg p-2">
              <div className="text-lg font-bold text-primary">{stats.goodWeightPercent}%</div>
              <div className="text-xs text-muted-foreground">Good</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <div className="text-lg font-bold text-slate-600 dark:text-slate-400">{stats.heavyPercent}%</div>
              <div className="text-xs text-muted-foreground">Heavy</div>
            </div>
          </div>
        </div>

        {/* Line Control */}
        <div className="space-y-2 pt-2 border-t">
          <span className="text-sm font-medium">Line Control</span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/40 rounded-lg p-2">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.narrowPercent}%</div>
              <div className="text-xs text-muted-foreground">Narrow</div>
            </div>
            <div className="bg-primary/10 rounded-lg p-2">
              <div className="text-lg font-bold text-primary">{stats.goodLinePercent}%</div>
              <div className="text-xs text-muted-foreground">Good</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <div className="text-lg font-bold text-sky-600 dark:text-sky-400">{stats.widePercent}%</div>
              <div className="text-xs text-muted-foreground">Wide</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Analysis() {
  const { data: allGames, isLoading } = useGamesFull();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  
  // Filter to only completed games
  const gamesWithDetails = useMemo(() => {
    if (!allGames) return [];
    return allGames.filter(g => g.status === 'COMPLETED');
  }, [allGames]);
  
  // Get game ID from URL params
  const urlParams = new URLSearchParams(searchString);
  const gameIdFromUrl = urlParams.get('game');
  
  // Filters and Game Report
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gameReportOpen, setGameReportOpen] = useState(true);
  const [filterType, setFilterType] = useState<string>("All");
  const [filterSurface, setFilterSurface] = useState<string>("All");
  const [filterPosition, setFilterPosition] = useState<string>("All");
  const [filterVenue, setFilterVenue] = useState<string>("All");
  const [filterOpponent, setFilterOpponent] = useState<string>("All");
  const [filterFormat, setFilterFormat] = useState<string>("All");
  
  // Date range filter
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  
  const datePresets = [
    { label: "All time", value: null },
    { label: "Last 7 days", value: { from: subDays(new Date(), 7), to: new Date() } },
    { label: "Last 30 days", value: { from: subDays(new Date(), 30), to: new Date() } },
    { label: "This month", value: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { label: "Last month", value: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
    { label: "This year", value: { from: startOfYear(new Date()), to: new Date() } },
  ];

  const applyPreset = (preset: typeof datePresets[0]) => {
    if (preset.value === null) {
      setDateRange(undefined);
    } else {
      setDateRange(preset.value);
    }
    setDateSheetOpen(false);
  };
  
  const clearDateFilter = () => {
    setDateRange(undefined);
  };

  // Get unique values for filters
  const uniqueVenues = useMemo(() => {
    if (!gamesWithDetails) return [];
    return Array.from(new Set(gamesWithDetails.map(g => g.venue))).sort();
  }, [gamesWithDetails]);

  const uniqueOpponents = useMemo(() => {
    if (!gamesWithDetails) return [];
    return Array.from(new Set(gamesWithDetails.map(g => g.opponent))).sort();
  }, [gamesWithDetails]);

  const { allStats, forehandStats, backhandStats, totalGames, allHeatmap, forehandHeatmap, backhandHeatmap, maxHeatmapCount } = useMemo(() => {
    if (!gamesWithDetails || gamesWithDetails.length === 0) {
      return { allStats: null, forehandStats: null, backhandStats: null, totalGames: 0, allHeatmap: null, forehandHeatmap: null, backhandHeatmap: null, maxHeatmapCount: 0 };
    }
    
    let filteredGames = [...gamesWithDetails];
    
    // Apply filters
    if (gameIdFromUrl) {
      filteredGames = filteredGames.filter(g => g.id === gameIdFromUrl);
    }
    if (filterType !== "All") {
      filteredGames = filteredGames.filter(g => g.type === filterType);
    }
    if (filterSurface !== "All") {
      filteredGames = filteredGames.filter(g => g.surface === filterSurface);
    }
    if (filterPosition !== "All") {
      filteredGames = filteredGames.filter(g => g.position === filterPosition);
    }
    if (filterVenue !== "All") {
      filteredGames = filteredGames.filter(g => g.venue === filterVenue);
    }
    if (filterOpponent !== "All") {
      filteredGames = filteredGames.filter(g => g.opponent === filterOpponent);
    }
    if (filterFormat !== "All") {
      filteredGames = filteredGames.filter(g => (g.gameFormat || 'fours') === filterFormat);
    }
    
    // Apply date range filter
    if (dateRange?.from) {
      filteredGames = filteredGames.filter(game => {
        const gameDate = new Date(game.createdAt);
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return isWithinInterval(gameDate, { start: from, end: to });
      });
    }

    if (filteredGames.length === 0) {
      return { allStats: null, forehandStats: null, backhandStats: null, totalGames: 0, allHeatmap: null, forehandHeatmap: null, backhandHeatmap: null, maxHeatmapCount: 0 };
    }

    // Get all bowls from filtered games
    const allBowls: Bowl[] = filteredGames.flatMap(g => 
      g.ends?.flatMap(e => e.bowls || []) || []
    );

    // Use case-insensitive matching to handle any data inconsistencies
    const forehandBowls = allBowls.filter(b => b.hand?.toLowerCase() === 'forehand');
    const backhandBowls = allBowls.filter(b => b.hand?.toLowerCase() === 'backhand');
    
    // Debug: Log bowls with unexpected hand values
    const unknownHandBowls = allBowls.filter(b => 
      b.hand?.toLowerCase() !== 'forehand' && b.hand?.toLowerCase() !== 'backhand'
    );
    if (unknownHandBowls.length > 0) {
      console.warn('Bowls with unexpected hand values:', unknownHandBowls.map(b => ({ id: b.id, hand: b.hand })));
    }

    // Calculate heatmaps
    const allHeatmap = calculateHeatmap(allBowls);
    const forehandHeatmap = calculateHeatmap(forehandBowls);
    const backhandHeatmap = calculateHeatmap(backhandBowls);
    
    // Find max count across all heatmaps for consistent coloring
    const maxHeatmapCount = Math.max(
      ...allHeatmap.flat(),
      ...forehandHeatmap.flat(),
      ...backhandHeatmap.flat()
    );

    return {
      allStats: calculateStats(allBowls),
      forehandStats: calculateStats(forehandBowls),
      backhandStats: calculateStats(backhandBowls),
      totalGames: filteredGames.length,
      allHeatmap,
      forehandHeatmap,
      backhandHeatmap,
      maxHeatmapCount,
    };
  }, [gamesWithDetails, gameIdFromUrl, filterType, filterSurface, filterPosition, filterVenue, filterOpponent, filterFormat, dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allStats) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-muted-foreground">No data available yet</h2>
        <p>Play and finish some games to see analysis.</p>
      </div>
    );
  }

  const hasActiveFilters = filterType !== "All" || filterSurface !== "All" || 
    filterPosition !== "All" || filterVenue !== "All" || filterOpponent !== "All" || filterFormat !== "All" || !!dateRange;
  
  // Get the selected game details for display
  const selectedGame = gameIdFromUrl ? gamesWithDetails.find(g => g.id === gameIdFromUrl) : null;
  
  const clearGameFilter = () => {
    setLocation('/analysis');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl font-semibold">Performance Analysis</h1>
        <p className="text-muted-foreground text-sm">
          {totalGames} game{totalGames !== 1 ? 's' : ''} analyzed · {allStats?.total || 0} total bowls
        </p>
      </div>
      
      <div className="space-y-6">

      {/* Single Game Banner */}
      {selectedGame && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Viewing analysis for:</span>
                <span className="ml-2 font-semibold">vs {selectedGame.opponent}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  ({format(new Date(selectedGame.createdAt), "MMM d, yyyy")} at {selectedGame.venue})
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearGameFilter}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-clear-game-filter"
              >
                <X className="h-4 w-4 mr-1" />
                View All Games
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Report - only shown for individual game analysis */}
      {selectedGame && (selectedGame.greenSpeed || selectedGame.greenComparable || 
        selectedGame.mentalFeeling || selectedGame.performanceRating || selectedGame.notes) && (
        <Collapsible open={gameReportOpen} onOpenChange={setGameReportOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Game Report</CardTitle>
                  </div>
                  {gameReportOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedGame.greenSpeed && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Gauge className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Green Speed</p>
                        <p className="font-semibold">{selectedGame.greenSpeed} seconds</p>
                      </div>
                    </div>
                  )}
                  {selectedGame.greenComparable && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Target className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Green Comparable To</p>
                        <p className="font-semibold">{selectedGame.greenComparable}</p>
                      </div>
                    </div>
                  )}
                  {selectedGame.mentalFeeling && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Brain className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Mental State</p>
                        <p className="font-semibold">{selectedGame.mentalFeeling}</p>
                      </div>
                    </div>
                  )}
                  {selectedGame.performanceRating && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Star className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Performance Rating</p>
                        <p className="font-semibold text-xl">{selectedGame.performanceRating}/10</p>
                      </div>
                    </div>
                  )}
                  {selectedGame.notes && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg md:col-span-2 lg:col-span-3">
                      <StickyNote className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedGame.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
      
      {/* Collapsible Filters - only show when viewing all games */}
      {!gameIdFromUrl && (
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Filters</CardTitle>
                  {hasActiveFilters && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                {filtersOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                <Sheet open={dateSheetOpen} onOpenChange={setDateSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start text-left font-normal h-10"
                      data-testid="button-date-filter"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        "All time"
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
                    <SheetHeader className="pb-4">
                      <SheetTitle className="text-center">Filter by Date</SheetTitle>
                    </SheetHeader>
                    
                    {/* Quick Presets */}
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      {datePresets.map((preset) => (
                        <Button
                          key={preset.label}
                          variant={
                            (preset.value === null && !dateRange) ||
                            (preset.value && dateRange?.from?.getTime() === preset.value.from.getTime())
                              ? "default"
                              : "outline"
                          }
                          className="h-12 text-sm"
                          onClick={() => applyPreset(preset)}
                          data-testid={`preset-${preset.label.toLowerCase().replace(/\s/g, '-')}`}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Custom date range inputs */}
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-4 text-center">Or select a custom date range</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="analysis-from-date" className="text-sm font-medium">From</Label>
                          <input
                            id="analysis-from-date"
                            type="date"
                            className="w-full h-12 px-3 rounded-lg border border-input bg-background text-base"
                            value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const newFrom = e.target.value ? parseISO(e.target.value) : undefined;
                              setDateRange(prev => ({
                                from: newFrom,
                                to: prev?.to
                              }));
                            }}
                            data-testid="input-analysis-date-from"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="analysis-to-date" className="text-sm font-medium">To</Label>
                          <input
                            id="analysis-to-date"
                            type="date"
                            className="w-full h-12 px-3 rounded-lg border border-input bg-background text-base"
                            value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const newTo = e.target.value ? parseISO(e.target.value) : undefined;
                              setDateRange(prev => ({
                                from: prev?.from,
                                to: newTo
                              }));
                            }}
                            data-testid="input-analysis-date-to"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 mt-6 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-12"
                        onClick={() => {
                          clearDateFilter();
                          setDateSheetOpen(false);
                        }}
                      >
                        Clear Filter
                      </Button>
                      <Button 
                        className="flex-1 h-12"
                        onClick={() => setDateSheetOpen(false)}
                        disabled={dateRange?.from && !dateRange?.to}
                      >
                        Apply
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
                {dateRange && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={clearDateFilter} 
                    data-testid="button-clear-date"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Game Type */}
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9" data-testid="select-filter-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Types</SelectItem>
                      <SelectItem value="Pennant">Pennant</SelectItem>
                      <SelectItem value="Tournament">Tournament</SelectItem>
                      <SelectItem value="Practice">Practice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Surface */}
                <div className="space-y-1">
                  <Label className="text-xs">Surface</Label>
                  <Select value={filterSurface} onValueChange={setFilterSurface}>
                    <SelectTrigger className="h-9" data-testid="select-filter-surface">
                      <SelectValue placeholder="All Surfaces" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Surfaces</SelectItem>
                      <SelectItem value="Grass">Grass</SelectItem>
                      <SelectItem value="Plastic">Plastic</SelectItem>
                      <SelectItem value="Carpet">Carpet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Position */}
                <div className="space-y-1">
                  <Label className="text-xs">Position</Label>
                  <Select value={filterPosition} onValueChange={setFilterPosition}>
                    <SelectTrigger className="h-9" data-testid="select-filter-position">
                      <SelectValue placeholder="All Positions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Positions</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Second">Second</SelectItem>
                      <SelectItem value="Third">Third</SelectItem>
                      <SelectItem value="Skip">Skip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Venue */}
                <div className="space-y-1">
                  <Label className="text-xs">Venue</Label>
                  <Select value={filterVenue} onValueChange={setFilterVenue}>
                    <SelectTrigger className="h-9" data-testid="select-filter-venue">
                      <SelectValue placeholder="All Venues" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Venues</SelectItem>
                      {uniqueVenues.map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Opponent */}
                <div className="space-y-1">
                  <Label className="text-xs">Opponent</Label>
                  <Select value={filterOpponent} onValueChange={setFilterOpponent}>
                    <SelectTrigger className="h-9" data-testid="select-filter-opponent">
                      <SelectValue placeholder="All Opponents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Opponents</SelectItem>
                      {uniqueOpponents.map(o => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Format */}
                <div className="space-y-1">
                  <Label className="text-xs">Format</Label>
                  <Select value={filterFormat} onValueChange={setFilterFormat}>
                    <SelectTrigger className="h-9" data-testid="select-filter-format">
                      <SelectValue placeholder="All Formats" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Formats</SelectItem>
                      <SelectItem value="singles">Singles</SelectItem>
                      <SelectItem value="pairs">Pairs</SelectItem>
                      <SelectItem value="triples">Triples</SelectItem>
                      <SelectItem value="fours">Fours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      )}

      {/* Stats Breakdown - Three Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatBlock 
          title="All Bowls" 
          icon={Target}
          stats={allStats}
          accentColor="text-primary"
        />
        <StatBlock 
          title="Forehand" 
          icon={CircleDot}
          stats={forehandStats!}
          accentColor="text-sky-600 dark:text-sky-400"
        />
        <StatBlock 
          title="Backhand" 
          icon={CircleDot}
          stats={backhandStats!}
          accentColor="text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* Heatmap Section */}
      {allHeatmap && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Bowl Landing Heatmap</h2>
          <p className="text-sm text-muted-foreground">
            Shows where your bowls landed on a 9x9 grid (1 foot per cell). Center is the jack position.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HeatmapGrid 
              heatmap={allHeatmap} 
              maxCount={maxHeatmapCount} 
              title="All Bowls" 
            />
            {forehandHeatmap && (
              <HeatmapGrid 
                heatmap={forehandHeatmap} 
                maxCount={maxHeatmapCount} 
                title="Forehand" 
              />
            )}
            {backhandHeatmap && (
              <HeatmapGrid 
                heatmap={backhandHeatmap} 
                maxCount={maxHeatmapCount} 
                title="Backhand" 
              />
            )}
          </div>
        </div>
      )}
      
      <div className="h-4" />
      </div>
    </div>
  );
}
