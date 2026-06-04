import { useGamesFull } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, CircleDot, Lightbulb } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useMemo } from "react";
import { isEffective, hasGoodWeight, isShort, isHeavy, isOnLine, isNarrow, isWide } from "@/lib/bowlResults";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { GameWithDetails } from "@/lib/api";

function generateInsights(allStats: ReturnType<typeof calculateStats>, forehandStats: ReturnType<typeof calculateStats>, backhandStats: ReturnType<typeof calculateStats>): string[] {
  if (allStats.total < 10) return ["Play more games to see insights"];
  const insights: string[] = [];

  const maxW = Math.max(allStats.shortPercent, allStats.goodWeightPercent, allStats.heavyPercent);
  if (maxW === allStats.shortPercent && allStats.shortPercent >= 35) {
    insights.push("Most bowls are finishing short");
  } else if (maxW === allStats.heavyPercent && allStats.heavyPercent >= 35) {
    insights.push("Most bowls are running through");
  } else {
    insights.push("Weight control is solid");
  }

  const maxL = Math.max(allStats.narrowPercent, allStats.goodLinePercent, allStats.widePercent);
  if (maxL === allStats.narrowPercent && allStats.narrowPercent >= 35) {
    insights.push("Bowls tend to finish narrow");
  } else if (maxL === allStats.widePercent && allStats.widePercent >= 35) {
    insights.push("Bowls tend to finish wide");
  } else {
    insights.push("Line is consistent");
  }

  if (forehandStats.total >= 5 && backhandStats.total >= 5) {
    const diff = forehandStats.effectivePercent - backhandStats.effectivePercent;
    if (diff >= 10) insights.push("Forehand is your stronger hand");
    else if (diff <= -10) insights.push("Backhand is your stronger hand");
    else insights.push("Both hands perform similarly");
  }

  return insights.slice(0, 3);
}

function applyFilters(games: GameWithDetails[], searchParams: URLSearchParams): GameWithDetails[] {
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
    if (filterType !== "All") {
      if (filterType === "100up" ? g.singlesType !== "100up" : g.type !== filterType) return false;
    }
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
};

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

function StatCard({ 
  title, 
  icon: Icon, 
  stats, 
  accentColor 
}: { 
  title: string; 
  icon: React.ElementType;
  stats: ReturnType<typeof calculateStats>;
  accentColor: string;
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${accentColor}`} />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{stats.total} bowls</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center py-3 bg-primary/5 rounded-xl border border-primary/10">
          <span className={`text-4xl font-bold ${accentColor}`}>
            {stats.effectivePercent}%
          </span>
          <p className="text-sm text-muted-foreground mt-1">Bowl Effectiveness</p>
          <p className="text-xs text-muted-foreground">{stats.effective} of {stats.total} bowls</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <span className="text-xl font-bold">{stats.goodWeightPercent}%</span>
            <p className="text-xs text-muted-foreground">Good Weight</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <span className="text-xl font-bold">{stats.goodLinePercent}%</span>
            <p className="text-xs text-muted-foreground">On Line</p>
          </div>
        </div>

        {stats.firstBowlTotal > 0 && (
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <span className="text-xl font-bold">{stats.firstBowlPercent}%</span>
            <p className="text-xs text-muted-foreground">First Bowl ({stats.firstBowlEffective}/{stats.firstBowlTotal})</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weight Breakdown</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-rose-50 dark:bg-rose-950/30 rounded p-2">
              <span className="font-semibold text-rose-600 dark:text-rose-400">{stats.shortPercent}%</span>
              <p className="text-muted-foreground">Short</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
              <span className="font-semibold text-green-600 dark:text-green-400">{stats.goodWeightPercent}%</span>
              <p className="text-muted-foreground">Good</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/30 rounded p-2">
              <span className="font-semibold text-slate-600 dark:text-slate-400">{stats.heavyPercent}%</span>
              <p className="text-muted-foreground">Heavy</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line Breakdown</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2">
              <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.narrowPercent}%</span>
              <p className="text-muted-foreground">Narrow</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
              <span className="font-semibold text-green-600 dark:text-green-400">{stats.goodLinePercent}%</span>
              <p className="text-muted-foreground">On Line</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded p-2">
              <span className="font-semibold text-orange-600 dark:text-orange-400">{stats.widePercent}%</span>
              <p className="text-muted-foreground">Wide</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalysisEffectiveness() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { data: gamesWithDetails = [], isLoading } = useGamesFull();

  const { allStats, forehandStats, backhandStats, hasFilters } = useMemo(() => {
    const searchParams = new URLSearchParams(search);
    const filteredGames = applyFilters(gamesWithDetails, searchParams);
    const hasFilters = searchParams.toString().length > 0;
    
    const allBowls: Bowl[] = filteredGames.flatMap(g => 
      g.ends?.flatMap(e => e.bowls || []) || []
    );
    
    const forehandBowls = allBowls.filter(b => b.hand?.toLowerCase() === 'forehand');
    const backhandBowls = allBowls.filter(b => b.hand?.toLowerCase() === 'backhand');

    return {
      allStats: calculateStats(allBowls),
      forehandStats: calculateStats(forehandBowls),
      backhandStats: calculateStats(backhandBowls),
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
          <h1 className="text-xl font-semibold">Effectiveness Breakdown</h1>
          <p className="text-muted-foreground text-sm">
            Performance by hand{hasFilters && " (filtered)"}
          </p>
        </div>
      </div>

      {allStats.total === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">No data available</h2>
            <p className="text-muted-foreground">Play and finish some games to see analysis.</p>
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
                  {generateInsights(allStats, forehandStats, backhandStats).map((insight, i) => (
                    <p key={i} className="text-xs text-amber-900 dark:text-amber-100 leading-tight">
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desktop grid layout for stat cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatCard 
              title="All Bowls" 
              icon={Target}
              stats={allStats}
              accentColor="text-primary"
            />
            <StatCard 
              title="Forehand" 
              icon={CircleDot}
              stats={forehandStats}
              accentColor="text-sky-600 dark:text-sky-400"
            />
            <StatCard 
              title="Backhand" 
              icon={CircleDot}
              stats={backhandStats}
              accentColor="text-violet-600 dark:text-violet-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}
