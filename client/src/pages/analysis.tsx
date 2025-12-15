import { useGamesFull } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import type { GameWithDetails } from "@/lib/api";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Filter, Target, CircleDot, X, FileText, Star, Brain, Gauge, StickyNote } from "lucide-react";

type Bowl = {
  id: string;
  result: string;
  hand: string;
  bowlNumber: number;
  gridRow?: number | null;
  gridCol?: number | null;
};

function mapResultToGrid(result: string): { row: number, col: number } {
  // Map old 3x3 result strings to center of corresponding 9x9 zone
  switch (result) {
    case 'Short & Narrow':
    case 'Short-Narrow':
      return { row: 1, col: 1 }; // center of top-left zone
    case 'Short':
      return { row: 1, col: 4 }; // center of top-center zone
    case 'Short & Wide':
    case 'Short-Wide':
      return { row: 1, col: 7 }; // center of top-right zone
    case 'Narrow':
      return { row: 4, col: 1 }; // center of left zone
    case 'Effective':
      return { row: 4, col: 4 }; // center (jack position)
    case 'Wide':
      return { row: 4, col: 7 }; // center of right zone
    case 'Heavy & Narrow':
    case 'Heavy-Narrow':
      return { row: 7, col: 1 }; // center of bottom-left zone
    case 'Heavy':
      return { row: 7, col: 4 }; // center of bottom-center zone
    case 'Heavy & Wide':
    case 'Heavy-Wide':
      return { row: 7, col: 7 }; // center of bottom-right zone
    default:
      return { row: 4, col: 4 }; // default to center
  }
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

function HeatmapGrid({ heatmap, maxCount, title }: { heatmap: number[][], maxCount: number, title: string }) {
  const getHeatColor = (count: number): string => {
    if (count === 0) return "bg-slate-100 dark:bg-slate-900";
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    
    // Standard YlOrRd (Yellow-Orange-Red) heatmap gradient
    // Low intensity = pale yellow, high intensity = deep red
    if (intensity <= 0.2) return "bg-yellow-100 dark:bg-yellow-950/40";
    if (intensity <= 0.4) return "bg-amber-200 dark:bg-amber-900/50";
    if (intensity <= 0.6) return "bg-orange-400 dark:bg-orange-700";
    if (intensity <= 0.8) return "bg-orange-500 dark:bg-orange-600";
    return "bg-red-600 dark:bg-red-700";
  };

  const getZoneLabel = (row: number, col: number): string => {
    const isZoneCenter = (row % 3 === 1) && (col % 3 === 1);
    if (!isZoneCenter) return "";
    
    const zoneRow = Math.floor(row / 3);
    const zoneCol = Math.floor(col / 3);
    
    if (zoneRow === 0 && zoneCol === 1) return "S";
    if (zoneRow === 2 && zoneCol === 1) return "H";
    if (zoneRow === 1 && zoneCol === 0) return "N";
    if (zoneRow === 1 && zoneCol === 1) return "E";
    if (zoneRow === 1 && zoneCol === 2) return "W";
    return "";
  };

  const isEffectiveZone = (row: number, col: number) => 
    row >= 3 && row <= 5 && col >= 3 && col <= 5;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-9 gap-0.5 max-w-[280px] mx-auto">
          {heatmap.map((row, rowIdx) =>
            row.map((count, colIdx) => {
              const isJack = rowIdx === 4 && colIdx === 4;
              const label = getZoneLabel(rowIdx, colIdx);
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`
                    aspect-square flex items-center justify-center text-xs font-medium rounded-sm
                    ${getHeatColor(count)}
                    ${isEffectiveZone(rowIdx, colIdx) ? "ring-1 ring-primary/30" : ""}
                    ${isJack ? "ring-2 ring-primary" : ""}
                  `}
                  title={`${count} bowl${count !== 1 ? 's' : ''} (Row ${rowIdx}, Col ${colIdx})`}
                  data-testid={`heatmap-cell-${rowIdx}-${colIdx}`}
                >
                  {count > 0 ? count : label}
                </div>
              );
            })
          )}
        </div>
        <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
          <span>Short</span>
          <span className="text-center">E = Effective (Jack)</span>
          <span>Heavy</span>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>N = Narrow</span>
          <span>W = Wide</span>
          <span>S = Short</span>
          <span>H = Heavy</span>
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

  const effective = bowls.filter(b => b.result === 'Effective').length;
  const firstBowls = bowls.filter(b => b.bowlNumber === 1);
  const firstBowlEffective = firstBowls.filter(b => b.result === 'Effective').length;

  const short = bowls.filter(b => b.result.includes('Short')).length;
  const heavy = bowls.filter(b => b.result.includes('Heavy')).length;
  const goodWeight = total - short - heavy;

  const narrow = bowls.filter(b => b.result.includes('Narrow')).length;
  const wide = bowls.filter(b => b.result.includes('Wide')).length;
  const goodLine = total - narrow - wide;

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

function StatBlock({ title, icon: Icon, stats }: { 
  title: string; 
  icon: React.ElementType;
  stats: ReturnType<typeof calculateStats>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{stats.total} bowls delivered</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bowl Effectiveness */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium">Bowl Effectiveness</span>
            <span className="text-2xl font-bold text-primary" data-testid={`text-effectiveness-${title.toLowerCase().replace(' ', '-')}`}>
              {stats.effectivePercent}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.effective} of {stats.total} bowls marked effective
          </p>
        </div>

        {/* First Bowl Effectiveness */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium">First Bowl Effectiveness</span>
            <span className="text-2xl font-bold text-accent-foreground" data-testid={`text-first-effectiveness-${title.toLowerCase().replace(' ', '-')}`}>
              {stats.firstBowlPercent}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.firstBowlEffective} of {stats.firstBowlTotal} first bowls effective
          </p>
        </div>

        {/* Weight Control */}
        <div className="space-y-2 pt-2 border-t">
          <span className="text-sm font-medium">Weight Control</span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-red-50 dark:bg-red-950/30 rounded p-2">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{stats.shortPercent}%</div>
              <div className="text-xs text-muted-foreground">Short</div>
              <div className="text-xs text-muted-foreground">({stats.short})</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.goodWeightPercent}%</div>
              <div className="text-xs text-muted-foreground">Good</div>
              <div className="text-xs text-muted-foreground">({stats.goodWeight})</div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
              <div className="text-lg font-bold text-slate-600 dark:text-slate-400">{stats.heavyPercent}%</div>
              <div className="text-xs text-muted-foreground">Heavy</div>
              <div className="text-xs text-muted-foreground">({stats.heavy})</div>
            </div>
          </div>
        </div>

        {/* Line Control */}
        <div className="space-y-2 pt-2 border-t">
          <span className="text-sm font-medium">Line Control</span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded p-2">
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.narrowPercent}%</div>
              <div className="text-xs text-muted-foreground">Narrow</div>
              <div className="text-xs text-muted-foreground">({stats.narrow})</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.goodLinePercent}%</div>
              <div className="text-xs text-muted-foreground">Good</div>
              <div className="text-xs text-muted-foreground">({stats.goodLine})</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.widePercent}%</div>
              <div className="text-xs text-muted-foreground">Wide</div>
              <div className="text-xs text-muted-foreground">({stats.wide})</div>
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

    if (filteredGames.length === 0) {
      return { allStats: null, forehandStats: null, backhandStats: null, totalGames: 0, allHeatmap: null, forehandHeatmap: null, backhandHeatmap: null, maxHeatmapCount: 0 };
    }

    // Get all bowls from filtered games
    const allBowls: Bowl[] = filteredGames.flatMap(g => 
      g.ends?.flatMap(e => e.bowls || []) || []
    );

    const forehandBowls = allBowls.filter(b => b.hand === 'Forehand');
    const backhandBowls = allBowls.filter(b => b.hand === 'Backhand');

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
  }, [gamesWithDetails, gameIdFromUrl, filterType, filterSurface, filterPosition, filterVenue, filterOpponent, filterFormat]);

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
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
    filterPosition !== "All" || filterVenue !== "All" || filterOpponent !== "All" || filterFormat !== "All";
  
  // Get the selected game details for display
  const selectedGame = gameIdFromUrl ? gamesWithDetails.find(g => g.id === gameIdFromUrl) : null;
  
  const clearGameFilter = () => {
    setLocation('/analysis');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Performance Analysis</h1>
        <div className="text-sm text-muted-foreground">
          {totalGames} game{totalGames !== 1 ? 's' : ''} analyzed
        </div>
      </div>

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
            <CardContent className="pt-0">
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
        />
        <StatBlock 
          title="Forehand" 
          icon={CircleDot}
          stats={forehandStats!} 
        />
        <StatBlock 
          title="Backhand" 
          icon={CircleDot}
          stats={backhandStats!} 
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
    </div>
  );
}
