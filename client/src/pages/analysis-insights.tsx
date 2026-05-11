import { useGamesFull } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useMemo } from "react";
import { isEffective, hasGoodWeight, isShort, isHeavy, isOnLine, isNarrow, isWide } from "@/lib/bowlResults";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { GameWithDetails } from "@/lib/api";

type Bowl = {
  id: string;
  result: string;
  hand: string;
  bowlNumber: number;
};

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

function generateFullSummary(
  allStats: ReturnType<typeof calculateStats>,
  forehandStats: ReturnType<typeof calculateStats>,
  backhandStats: ReturnType<typeof calculateStats>,
  gamesCount: number
): string[] {
  if (allStats.total < 10) {
    return ["You haven't recorded enough bowls yet for a detailed summary. Keep playing and tracking your games to build up your data."];
  }

  const paragraphs: string[] = [];

  // Opening summary
  let opening = `Based on ${allStats.total} bowls across ${gamesCount} games, `;
  if (allStats.effectivePercent >= 50) {
    opening += `you're bowling very well with ${allStats.effectivePercent}% of your bowls landing effectively near the jack.`;
  } else if (allStats.effectivePercent >= 35) {
    opening += `you're bowling solidly with ${allStats.effectivePercent}% of your bowls landing effectively. There's room to improve.`;
  } else {
    opening += `${allStats.effectivePercent}% of your bowls are landing effectively. Let's look at what's happening.`;
  }
  paragraphs.push(opening);

  // Weight analysis
  let weight = "";
  if (allStats.shortPercent >= 40) {
    weight = `Your main tendency is bowling short - ${allStats.shortPercent}% of your bowls don't reach the head. This is your biggest area for improvement.`;
  } else if (allStats.heavyPercent >= 40) {
    weight = `You're often running through the head - ${allStats.heavyPercent}% of bowls finish heavy. Pulling back the weight slightly could help.`;
  } else if (allStats.goodWeightPercent >= 50) {
    weight = `Your weight control is excellent - ${allStats.goodWeightPercent}% of bowls have good weight. This is a real strength.`;
  } else {
    weight = `Your weight is fairly balanced with ${allStats.goodWeightPercent}% good, ${allStats.shortPercent}% short, and ${allStats.heavyPercent}% heavy.`;
  }
  paragraphs.push(weight);

  // Line analysis
  let line = "";
  if (allStats.narrowPercent >= 40) {
    line = `On line, you tend to finish narrow - ${allStats.narrowPercent}% of bowls come up inside the jack. Taking more grass might help.`;
  } else if (allStats.widePercent >= 40) {
    line = `You're often finishing wide - ${allStats.widePercent}% of bowls end up outside the head. You might be taking too much grass.`;
  } else if (allStats.goodLinePercent >= 50) {
    line = `Your line is consistent - ${allStats.goodLinePercent}% of bowls are on the right line. Keep doing what you're doing.`;
  } else {
    line = `Your line is mixed with ${allStats.goodLinePercent}% on target, ${allStats.narrowPercent}% narrow, and ${allStats.widePercent}% wide.`;
  }
  paragraphs.push(line);

  // Hand comparison
  if (forehandStats.total >= 10 && backhandStats.total >= 10) {
    const fhEff = forehandStats.effectivePercent;
    const bhEff = backhandStats.effectivePercent;
    const diff = fhEff - bhEff;
    
    let hands = "";
    if (diff >= 15) {
      hands = `Your forehand is noticeably stronger at ${fhEff}% effective compared to ${bhEff}% on the backhand. You might want to favour forehand when you have the choice.`;
    } else if (diff <= -15) {
      hands = `Your backhand is noticeably stronger at ${bhEff}% effective compared to ${fhEff}% on the forehand. You might want to favour backhand when you have the choice.`;
    } else if (Math.abs(diff) <= 5) {
      hands = `Both hands are performing similarly - forehand at ${fhEff}% and backhand at ${bhEff}%. You're well-balanced.`;
    } else {
      const stronger = diff > 0 ? 'forehand' : 'backhand';
      hands = `Your ${stronger} is slightly more effective, but both hands are performing reasonably well.`;
    }
    paragraphs.push(hands);
  }

  return paragraphs;
}

export default function AnalysisInsights() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { data: gamesWithDetails = [], isLoading } = useGamesFull();

  const { allStats, forehandStats, backhandStats, gamesCount, hasFilters } = useMemo(() => {
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
      gamesCount: filteredGames.length,
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

  const paragraphs = generateFullSummary(allStats, forehandStats, backhandStats, gamesCount);

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
          <h1 className="text-xl font-semibold">Your Performance Summary</h1>
          <p className="text-muted-foreground text-sm">
            Plain English breakdown{hasFilters && " (filtered)"}
          </p>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">What your data tells us</h2>
              <p className="text-sm text-muted-foreground">Based on your recorded games</p>
            </div>
          </div>
          
          <div className="space-y-4 text-sm leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-foreground/90">{p}</p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
