import { useGames, useDeleteGame } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, Trash2, BarChart3, Play, X } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export default function Games() {
  const { data: games, isLoading } = useGames();
  const deleteGame = useDeleteGame();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const filteredGames = useMemo(() => {
    if (!games) return [];
    
    let filtered = [...games].sort((a, b) => 
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
  }, [games, dateRange]);

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

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-primary">My Games</h1>
        
        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
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
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
          {dateRange && (
            <Button variant="ghost" size="icon" onClick={clearDateFilter} data-testid="button-clear-date">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {games?.length === 0 
                ? "No games recorded yet. Start a new game to begin tracking your performance."
                : "No games found for the selected date range."}
            </p>
            {games?.length === 0 && (
              <Button 
                className="mt-4" 
                onClick={() => setLocation("/new-game")}
                data-testid="button-start-first-game"
              >
                Start Your First Game
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGames.map(game => {
            const isCompleted = game.status === 'COMPLETED';
            const isInProgress = game.status === 'IN_PROGRESS';
            
            return (
              <Card key={game.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg truncate" data-testid={`text-opponent-${game.id}`}>
                          vs {game.opponent}
                        </h3>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          isCompleted ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          isInProgress ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        )}>
                          {game.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span>{format(new Date(game.createdAt), "MMM d, yyyy")}</span>
                        <span>{game.venue}</span>
                        <span>{game.type}</span>
                        <span>{game.surface}</span>
                        <span>{game.position}</span>
                      </div>
                                          </div>
                    
                    <div className="flex items-center gap-2">
                      {isInProgress && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setLocation(`/play/${game.id}`)}
                          data-testid={`button-continue-${game.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                      )}
                      {isCompleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/analysis?game=${game.id}`)}
                          data-testid={`button-analyze-${game.id}`}
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Analyze
                        </Button>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
          })}
        </div>
      )}
      
      <div className="text-center text-sm text-muted-foreground">
        {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''} 
        {dateRange ? ' in selected range' : ' total'}
      </div>
    </div>
  );
}
