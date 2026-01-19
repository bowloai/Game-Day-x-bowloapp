import { useGames, useDeleteGame } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useMemo, useEffect } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Trash2, BarChart3, Play, X, Download, Pencil, Trophy, TrendingDown, Minus } from "lucide-react";
import { ShareGameSummary } from "@/components/share-game-summary";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import * as api from "@/lib/api";
import type { GameWithDetails } from "@/lib/api";

export default function Games() {
  const { data: games, isLoading } = useGames();
  const deleteGame = useDeleteGame();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [gamesWithDetails, setGamesWithDetails] = useState<GameWithDetails[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  const datePresets = [
    { label: "All games", value: null },
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

  useEffect(() => {
    async function fetchDetails() {
      if (!games || games.length === 0) {
        setGamesWithDetails([]);
        return;
      }
      
      setLoadingDetails(true);
      try {
        const details = await Promise.all(
          games.map(g => api.getGameFull(g.id))
        );
        setGamesWithDetails(details);
      } catch (err) {
        console.error('Failed to load game details', err);
      }
      setLoadingDetails(false);
    }
    fetchDetails();
  }, [games]);

  const getGameScore = (game: GameWithDetails) => {
    if (!game.ends || game.ends.length === 0) return { scoreFor: 0, scoreAgainst: 0 };
    
    const completedEnds = game.ends.filter(e => e.isCompleted);
    const scoreFor = completedEnds.reduce((sum, e) => sum + (e.scoreFor || 0), 0);
    const scoreAgainst = completedEnds.reduce((sum, e) => sum + (e.scoreAgainst || 0), 0);
    
    return { scoreFor, scoreAgainst };
  };

  const filteredGames = useMemo(() => {
    if (!gamesWithDetails) return [];
    
    let filtered = [...gamesWithDetails].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    if (dateRange?.from) {
      filtered = filtered.filter(game => {
        const gameDate = new Date(game.createdAt);
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return isWithinInterval(gameDate, { start: from, end: to });
      });
    }
    
    return filtered;
  }, [gamesWithDetails, dateRange]);

  const handleDelete = async (id: string, opponent: string) => {
    try {
      await deleteGame.mutateAsync(id);
      toast({
        title: "Game deleted",
        description: `Game vs ${opponent} has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete game.",
        variant: "destructive",
      });
    }
  };

  const clearDateFilter = () => {
    setDateRange(undefined);
  };

  const downloadCSV = () => {
    if (!gamesWithDetails || gamesWithDetails.length === 0) {
      toast({
        title: "No data",
        description: "No games available to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Game Date",
      "Opponent",
      "Venue",
      "Surface",
      "Rink",
      "Type",
      "Position",
      "Total Ends",
      "Status",
      "Final Score For",
      "Final Score Against",
      "Result",
      "End Number",
      "End Score For",
      "End Score Against",
      "Jack Effective",
      "Jack Length",
      "Is Dead",
      "Bowl Number",
      "Hand",
      "Result"
    ];

    const rows: string[][] = [];

    gamesWithDetails.forEach(game => {
      const { scoreFor: totalFor, scoreAgainst: totalAgainst } = getGameScore(game);
      const result = totalFor > totalAgainst ? "Win" : totalFor < totalAgainst ? "Loss" : "Draw";
      
      if (!game.ends || game.ends.length === 0) {
        rows.push([
          format(new Date(game.createdAt), "yyyy-MM-dd"),
          game.opponent,
          game.venue,
          game.surface,
          game.rink,
          game.type,
          game.position || "",
          String(game.totalEnds),
          game.status,
          String(totalFor),
          String(totalAgainst),
          result,
          "", "", "", "", "", "", "", "", ""
        ]);
      } else {
        game.ends.forEach(end => {
          if (!end.bowls || end.bowls.length === 0) {
            rows.push([
              format(new Date(game.createdAt), "yyyy-MM-dd"),
              game.opponent,
              game.venue,
              game.surface,
              game.rink,
              game.type,
              game.position || "",
              String(game.totalEnds),
              game.status,
              String(totalFor),
              String(totalAgainst),
              result,
              String(end.endNumber),
              String(end.scoreFor || 0),
              String(end.scoreAgainst || 0),
              end.jackEffective ? "Yes" : "No",
              end.length || "",
              end.isDead ? "Yes" : "No",
              "", "", ""
            ]);
          } else {
            end.bowls.forEach(bowl => {
              rows.push([
                format(new Date(game.createdAt), "yyyy-MM-dd"),
                game.opponent,
                game.venue,
                game.surface,
                game.rink,
                game.type,
                game.position || "",
                String(game.totalEnds),
                game.status,
                String(totalFor),
                String(totalAgainst),
                result,
                String(end.endNumber),
                String(end.scoreFor || 0),
                String(end.scoreAgainst || 0),
                end.jackEffective ? "Yes" : "No",
                end.length || "",
                end.isDead ? "Yes" : "No",
                String(bowl.bowlNumber),
                bowl.hand || "",
                bowl.result || ""
              ]);
            });
          }
        });
      }
    });

    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bowlo-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Exported ${gamesWithDetails.length} games to CSV.`,
    });
  };

  if (isLoading || loadingDetails) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 -mx-4 -mt-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white px-6 py-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Games</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={downloadCSV}
            disabled={!gamesWithDetails || gamesWithDetails.length === 0}
            data-testid="button-download-csv"
            title="Download all data as CSV"
            className="text-white hover:bg-white/10"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Sheet open={dateSheetOpen} onOpenChange={setDateSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white",
                  !dateRange && "text-white/70"
                )}
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
                  "Filter by date"
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
                    <Label htmlFor="from-date" className="text-sm font-medium">From</Label>
                    <input
                      id="from-date"
                      type="date"
                      className="w-full h-12 px-3 rounded-lg border border-input bg-background text-base"
                      value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                      max={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined}
                      onChange={(e) => {
                        const newFrom = e.target.value ? parseISO(e.target.value) : undefined;
                        setDateRange(prev => {
                          // Auto-swap if from > to
                          if (newFrom && prev?.to && newFrom > prev.to) {
                            return { from: prev.to, to: newFrom };
                          }
                          return { from: newFrom, to: prev?.to };
                        });
                      }}
                      data-testid="input-date-from"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to-date" className="text-sm font-medium">To</Label>
                    <input
                      id="to-date"
                      type="date"
                      className="w-full h-12 px-3 rounded-lg border border-input bg-background text-base"
                      value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                      min={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined}
                      onChange={(e) => {
                        const newTo = e.target.value ? parseISO(e.target.value) : undefined;
                        setDateRange(prev => {
                          // Auto-swap if to < from
                          if (newTo && prev?.from && newTo < prev.from) {
                            return { from: newTo, to: prev.from };
                          }
                          return { from: prev?.from, to: newTo };
                        });
                      }}
                      data-testid="input-date-to"
                    />
                  </div>
                </div>
                {dateRange?.from && dateRange?.to && dateRange.from > dateRange.to && (
                  <p className="text-sm text-amber-600 mt-2 text-center">Dates will be auto-swapped</p>
                )}
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
                  disabled={!!(dateRange?.from && !dateRange?.to)}
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
              className="text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <p className="text-white/60 text-sm mt-3">
          {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''} 
          {dateRange ? ' in selected range' : ' total'}
        </p>
      </div>

      {/* Games List */}
      <div className="px-4 space-y-3">
        {filteredGames.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {games?.length === 0 
                  ? "No games recorded yet. Start a new game to begin tracking your performance."
                  : "No games found for the selected date range."}
              </p>
              {games?.length === 0 && (
                <Button 
                  className="mt-4 rounded-xl" 
                  onClick={() => setLocation("/new-game")}
                  data-testid="button-start-first-game"
                >
                  Start Your First Game
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredGames.map(game => {
            const isCompleted = game.status === 'COMPLETED';
            const isInProgress = game.status === 'IN_PROGRESS';
            const { scoreFor, scoreAgainst } = getGameScore(game);
            const completedEnds = game.ends?.filter(e => e.isCompleted).length || 0;
            const isWin = scoreFor > scoreAgainst;
            const isLoss = scoreFor < scoreAgainst;
            
            return (
              <Card 
                key={game.id} 
                className="border-0 shadow-md overflow-hidden"
                data-testid={`card-game-${game.id}`}
              >
                <CardContent className="p-0">
                  {/* Result indicator strip */}
                  <div className={cn(
                    "h-1",
                    isCompleted && isWin ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                    isCompleted && isLoss ? "bg-gradient-to-r from-red-500 to-rose-500" :
                    isCompleted ? "bg-gradient-to-r from-gray-400 to-gray-500" :
                    "bg-gradient-to-r from-amber-400 to-yellow-500"
                  )} />
                  
                  <div className="p-4 space-y-3">
                    {/* Top row: Game info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-lg" data-testid={`text-opponent-${game.id}`}>
                            vs {game.opponent}
                          </h3>
                          
                          {/* Result badge */}
                          {isCompleted && (
                            <span className={cn(
                              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                              isWin ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                              isLoss ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                            )}>
                              {isWin ? <Trophy className="w-3 h-3" /> : isLoss ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {isWin ? "Win" : isLoss ? "Loss" : "Draw"}
                            </span>
                          )}
                          
                          {isInProgress && (
                            <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              End {completedEnds + 1}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(game.createdAt), "MMM d, yyyy")} · {game.venue} · {game.position}
                        </p>
                      </div>
                      
                      {/* Score Display */}
                      <div className="flex items-center gap-1 bg-muted/50 rounded-xl px-4 py-2">
                        <span className={cn(
                          "text-2xl font-bold tabular-nums",
                          isWin ? "text-green-600 dark:text-green-400" : ""
                        )} data-testid={`text-score-for-${game.id}`}>
                          {scoreFor}
                        </span>
                        <span className="text-muted-foreground mx-1">-</span>
                        <span className={cn(
                          "text-2xl font-bold tabular-nums",
                          isLoss ? "text-green-600 dark:text-green-400" : ""
                        )} data-testid={`text-score-against-${game.id}`}>
                          {scoreAgainst}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {isInProgress && (
                        <Button
                          size="sm"
                          onClick={() => setLocation(`/play/${game.id}`)}
                          data-testid={`button-continue-${game.id}`}
                          className="rounded-xl"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                      )}
                      {isCompleted && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/games/${game.id}/analysis`)}
                            data-testid={`button-analyze-${game.id}`}
                            className="rounded-xl"
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Analysis
                          </Button>
                          <ShareGameSummary 
                            game={game} 
                            scoreFor={scoreFor} 
                            scoreAgainst={scoreAgainst} 
                          />
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/games/${game.id}/edit`)}
                        data-testid={`button-edit-${game.id}`}
                        className="rounded-xl"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      <div className="flex-1" />
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            data-testid={`button-delete-${game.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Game</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the game vs {game.opponent}? 
                              This will permanently remove all recorded ends and bowls for this game. 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(game.id, game.opponent)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-${game.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      <div className="h-4" />
    </div>
  );
}
