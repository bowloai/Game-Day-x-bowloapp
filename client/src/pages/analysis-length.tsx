import { useGamesFull } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ruler, Target, CircleDot, Lightbulb } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useMemo } from "react";
import { isEffective, hasGoodWeight, isShort, isHeavy, isOnLine, isNarrow, isWide } from "@/lib/bowlResults";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { GameWithDetails } from "@/lib/api";

type LengthStatsSet = {
  short: ReturnType<typeof calcLengthStats>;
  medium: ReturnType<typeof calcLengthStats>;
  long: ReturnType<typeof calcLengthStats>;
};

function generateLengthInsights(allStats: LengthStatsSet, forehandStats: LengthStatsSet, backhandStats: LengthStatsSet, totalBowls: number): string[] {
  if (totalBowls < 10) return ["Play more games to see insights"];
  const insights: string[] = [];
  const lens = ['short', 'medium', 'long'] as const;
  const valid = lens.filter(l => allStats[l].total >= 5);
  
  if (valid.length >= 2) {
    const best = valid.reduce((a, b) => allStats[a].effectivePercent > allStats[b].effectivePercent ? a : b);
    const worst = valid.reduce((a, b) => allStats[a].effectivePercent < allStats[b].effectivePercent ? a : b);
    if (allStats[best].effectivePercent - allStats[worst].effectivePercent >= 10)
      insights.push(`You perform best on ${best} jacks`);
    else insights.push("Consistent across all jack lengths");
  }

  for (const l of valid) {
    const s = allStats[l];
    if (s.shortPercent >= 40) { insights.push(`On ${l} jacks, bowls often finish short`); break; }
    if (s.heavyPercent >= 40) { insights.push(`On ${l} jacks, bowls often run through`); break; }
    if (s.narrowPercent >= 40) { insights.push(`On ${l} jacks, bowls tend to be narrow`); break; }
    if (s.widePercent >= 40) { insights.push(`On ${l} jacks, bowls tend to be wide`); break; }
  }

  for (const l of valid) {
    if (forehandStats[l].total >= 3 && backhandStats[l].total >= 3) {
      const d = forehandStats[l].effectivePercent - backhandStats[l].effectivePercent;
      if (d >= 15) { insights.push(`Forehand works better on ${l} jacks`); break; }
      if (d <= -15) { insights.push(`Backhand works better on ${l} jacks`); break; }
    }
  }

  if (insights.length === 1) {
    insights.push("Good consistency across lengths");
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
  const parseDateString = (str: string) => {
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const dateRange = fromDate ? { from: parseDateString(fromDate), to: toDate ? parseDateString(toDate) : undefined } : undefined;

  return games.filter(g => g.status === 'COMPLETED').filter(g => {
    if (filterType !== "All") {
      if (g.type !== filterType) return false;
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

type BowlWithLength = Bowl & { endLength: string };

function calcLengthStats(bowls: BowlWithLength[], length: string) {
  const filtered = bowls.filter(b => b.endLength === length);
  const total = filtered.length;
  if (total === 0) return { 
    total: 0, effective: 0, effectivePercent: 0,
    short: 0, shortPercent: 0, heavy: 0, heavyPercent: 0, goodWeight: 0, goodWeightPercent: 0,
    narrow: 0, narrowPercent: 0, wide: 0, widePercent: 0, goodLine: 0, goodLinePercent: 0
  };
  const effective = filtered.filter(b => isEffective(b.result)).length;
  const short = filtered.filter(b => isShort(b.result)).length;
  const heavy = filtered.filter(b => isHeavy(b.result)).length;
  const goodWeight = filtered.filter(b => hasGoodWeight(b.result)).length;
  const narrow = filtered.filter(b => isNarrow(b.result)).length;
  const wide = filtered.filter(b => isWide(b.result)).length;
  const goodLine = filtered.filter(b => isOnLine(b.result)).length;
  return { 
    total, 
    effective, 
    effectivePercent: Math.round((effective / total) * 100),
    short, shortPercent: Math.round((short / total) * 100),
    heavy, heavyPercent: Math.round((heavy / total) * 100),
    goodWeight, goodWeightPercent: Math.round((goodWeight / total) * 100),
    narrow, narrowPercent: Math.round((narrow / total) * 100),
    wide, widePercent: Math.round((wide / total) * 100),
    goodLine, goodLinePercent: Math.round((goodLine / total) * 100),
  };
}

function LengthCard({ 
  title, 
  icon: Icon,
  accentColor,
  stats,
  totalBowls
}: { 
  title: string;
  icon: React.ElementType;
  accentColor: string;
  stats: LengthStatsSet;
  totalBowls: number;
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className={`h-4 w-4 ${accentColor}`} />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{totalBowls} bowls</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalBowls === 0 ? (
          <p className="text-center text-muted-foreground py-4">No data available</p>
        ) : (
          <div className="space-y-4">
            {(['short', 'medium', 'long'] as const).map((length) => {
              const lengthStats = stats[length];
              const hasData = lengthStats.total > 0;
              return (
                <div key={length} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{length} Jack</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${lengthStats.effectivePercent >= 50 ? 'text-primary' : ''}`}>
                        {hasData ? `${lengthStats.effectivePercent}%` : '-'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({lengthStats.total} bowls)
                      </span>
                    </div>
                  </div>
                  {hasData && (
                    <div className="space-y-2">
                      {/* Weight row */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-rose-50 dark:bg-rose-950/30 rounded p-2">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">{lengthStats.shortPercent}%</span>
                          <p className="text-muted-foreground">Short</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                          <span className="font-semibold text-green-600 dark:text-green-400">{lengthStats.goodWeightPercent}%</span>
                          <p className="text-muted-foreground">Good</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/30 rounded p-2">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">{lengthStats.heavyPercent}%</span>
                          <p className="text-muted-foreground">Heavy</p>
                        </div>
                      </div>
                      {/* Line row */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{lengthStats.narrowPercent}%</span>
                          <p className="text-muted-foreground">Narrow</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                          <span className="font-semibold text-green-600 dark:text-green-400">{lengthStats.goodLinePercent}%</span>
                          <p className="text-muted-foreground">On Line</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950/30 rounded p-2">
                          <span className="font-semibold text-orange-600 dark:text-orange-400">{lengthStats.widePercent}%</span>
                          <p className="text-muted-foreground">Wide</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalysisLength() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { data: gamesWithDetails = [], isLoading } = useGamesFull();

  const { allStats, forehandStats, backhandStats, totalBowls, forehandTotal, backhandTotal, hasFilters } = useMemo(() => {
    const searchParams = new URLSearchParams(search);
    const filteredGames = applyFilters(gamesWithDetails, searchParams);
    const hasFilters = searchParams.toString().length > 0;
    
    const normalizeLength = (length: string | null | undefined): string => {
      const l = (length || 'medium').toLowerCase();
      if (l === 'minimum') return 'short';
      if (l === 'maximum') return 'long';
      return l;
    };
    
    const allBowlsWithLength: BowlWithLength[] = filteredGames.flatMap(g => 
      g.ends?.flatMap(e => (e.bowls || []).map(b => ({ ...b, endLength: normalizeLength(e.length) }))) || []
    );
    
    const forehandWithLength = allBowlsWithLength.filter(b => b.hand?.toLowerCase() === 'forehand');
    const backhandWithLength = allBowlsWithLength.filter(b => b.hand?.toLowerCase() === 'backhand');

    return {
      allStats: {
        short: calcLengthStats(allBowlsWithLength, 'short'),
        medium: calcLengthStats(allBowlsWithLength, 'medium'),
        long: calcLengthStats(allBowlsWithLength, 'long'),
      },
      forehandStats: {
        short: calcLengthStats(forehandWithLength, 'short'),
        medium: calcLengthStats(forehandWithLength, 'medium'),
        long: calcLengthStats(forehandWithLength, 'long'),
      },
      backhandStats: {
        short: calcLengthStats(backhandWithLength, 'short'),
        medium: calcLengthStats(backhandWithLength, 'medium'),
        long: calcLengthStats(backhandWithLength, 'long'),
      },
      totalBowls: allBowlsWithLength.length,
      forehandTotal: forehandWithLength.length,
      backhandTotal: backhandWithLength.length,
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
          <h1 className="text-xl font-semibold">Performance by Jack Length</h1>
          <p className="text-muted-foreground text-sm">
            Detailed stats by distance{hasFilters && " (filtered)"}
          </p>
        </div>
      </div>

      {totalBowls === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">No data available</h2>
            <p className="text-muted-foreground">Play and finish some games to see length analysis.</p>
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
                  {generateLengthInsights(allStats, forehandStats, backhandStats, totalBowls).map((insight, i) => (
                    <p key={i} className="text-xs text-amber-900 dark:text-amber-100 leading-tight">
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desktop grid layout for length cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <LengthCard 
              title="All Bowls"
              icon={Ruler}
              accentColor="text-primary"
              stats={allStats}
              totalBowls={totalBowls}
            />
            <LengthCard 
              title="Forehand"
              icon={Target}
              accentColor="text-sky-600"
              stats={forehandStats}
              totalBowls={forehandTotal}
            />
            <LengthCard 
              title="Backhand"
              icon={CircleDot}
              accentColor="text-violet-600"
              stats={backhandStats}
              totalBowls={backhandTotal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
