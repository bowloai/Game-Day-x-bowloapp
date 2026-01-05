import { useGamesFull } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ruler } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";
import { isEffective, hasGoodWeight, isShort, isHeavy, isOnLine, isNarrow, isWide } from "@/lib/bowlResults";

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

function LengthStatsCard({ 
  length, 
  allStats, 
  forehandStats, 
  backhandStats 
}: { 
  length: string;
  allStats: ReturnType<typeof calcLengthStats>;
  forehandStats: ReturnType<typeof calcLengthStats>;
  backhandStats: ReturnType<typeof calcLengthStats>;
}) {
  const hasData = allStats.total > 0;
  
  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base capitalize">{length} Jack</CardTitle>
          <span className="text-sm text-muted-foreground">{allStats.total} bowls</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="text-center text-muted-foreground py-4">No data for this length</p>
        ) : (
          <>
            {/* Overall Effectiveness */}
            <div className="text-center py-3 bg-primary/5 rounded-xl border border-primary/10">
              <span className="text-3xl font-bold text-primary">{allStats.effectivePercent}%</span>
              <p className="text-sm text-muted-foreground mt-1">Overall Effectiveness</p>
            </div>

            {/* Forehand / Backhand comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-sky-50 dark:bg-sky-950/30 rounded-lg p-3 text-center">
                <span className="text-xl font-bold text-sky-600 dark:text-sky-400">
                  {forehandStats.total > 0 ? `${forehandStats.effectivePercent}%` : '-'}
                </span>
                <p className="text-xs text-muted-foreground">Forehand ({forehandStats.total})</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3 text-center">
                <span className="text-xl font-bold text-violet-600 dark:text-violet-400">
                  {backhandStats.total > 0 ? `${backhandStats.effectivePercent}%` : '-'}
                </span>
                <p className="text-xs text-muted-foreground">Backhand ({backhandStats.total})</p>
              </div>
            </div>

            {/* Weight breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weight</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-rose-50 dark:bg-rose-950/30 rounded p-2">
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{allStats.shortPercent}%</span>
                  <p className="text-muted-foreground">Short</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                  <span className="font-semibold text-green-600 dark:text-green-400">{allStats.goodWeightPercent}%</span>
                  <p className="text-muted-foreground">Good</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/30 rounded p-2">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">{allStats.heavyPercent}%</span>
                  <p className="text-muted-foreground">Heavy</p>
                </div>
              </div>
            </div>

            {/* Line breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{allStats.narrowPercent}%</span>
                  <p className="text-muted-foreground">Narrow</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                  <span className="font-semibold text-green-600 dark:text-green-400">{allStats.goodLinePercent}%</span>
                  <p className="text-muted-foreground">On Line</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/30 rounded p-2">
                  <span className="font-semibold text-orange-600 dark:text-orange-400">{allStats.widePercent}%</span>
                  <p className="text-muted-foreground">Wide</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalysisLength() {
  const [, setLocation] = useLocation();
  const { data: gamesWithDetails = [], isLoading } = useGamesFull();

  const lengthStats = useMemo(() => {
    const completedGames = gamesWithDetails.filter(g => g.status === 'COMPLETED');
    
    const normalizeLength = (length: string | null | undefined): string => {
      const l = (length || 'medium').toLowerCase();
      if (l === 'minimum') return 'short';
      if (l === 'maximum') return 'long';
      return l;
    };
    
    const allBowlsWithLength: BowlWithLength[] = completedGames.flatMap(g => 
      g.ends?.flatMap(e => (e.bowls || []).map(b => ({ ...b, endLength: normalizeLength(e.length) }))) || []
    );
    
    const forehandWithLength = allBowlsWithLength.filter(b => b.hand?.toLowerCase() === 'forehand');
    const backhandWithLength = allBowlsWithLength.filter(b => b.hand?.toLowerCase() === 'backhand');

    return {
      short: {
        all: calcLengthStats(allBowlsWithLength, 'short'),
        forehand: calcLengthStats(forehandWithLength, 'short'),
        backhand: calcLengthStats(backhandWithLength, 'short'),
      },
      medium: {
        all: calcLengthStats(allBowlsWithLength, 'medium'),
        forehand: calcLengthStats(forehandWithLength, 'medium'),
        backhand: calcLengthStats(backhandWithLength, 'medium'),
      },
      long: {
        all: calcLengthStats(allBowlsWithLength, 'long'),
        forehand: calcLengthStats(forehandWithLength, 'long'),
        backhand: calcLengthStats(backhandWithLength, 'long'),
      },
      totalBowls: allBowlsWithLength.length,
    };
  }, [gamesWithDetails]);

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
          onClick={() => setLocation('/analysis')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Performance by Jack Length</h1>
          <p className="text-muted-foreground text-sm">Detailed stats by distance</p>
        </div>
      </div>

      {lengthStats.totalBowls === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">No data available</h2>
            <p className="text-muted-foreground">Play and finish some games to see length analysis.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <LengthStatsCard 
            length="short"
            allStats={lengthStats.short.all}
            forehandStats={lengthStats.short.forehand}
            backhandStats={lengthStats.short.backhand}
          />
          <LengthStatsCard 
            length="medium"
            allStats={lengthStats.medium.all}
            forehandStats={lengthStats.medium.forehand}
            backhandStats={lengthStats.medium.backhand}
          />
          <LengthStatsCard 
            length="long"
            allStats={lengthStats.long.all}
            forehandStats={lengthStats.long.forehand}
            backhandStats={lengthStats.long.backhand}
          />
        </div>
      )}
    </div>
  );
}
