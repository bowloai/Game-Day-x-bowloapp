import { useGameFull, useCreateEnd, useCreateBowl, useUpdateEnd, useUpdateGame } from "@/lib/hooks";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, ArrowLeft, ArrowRight, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BowlResult = 
  | 'Short' 
  | 'Heavy' 
  | 'Narrow' 
  | 'Wide' 
  | 'Short & Narrow' 
  | 'Short & Wide' 
  | 'Heavy & Narrow' 
  | 'Heavy & Wide' 
  | 'Effective';

type ViewState = 'end-setup' | 'bowling' | 'score-entry' | 'end-summary';

export default function GameRecording() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: game, isLoading, refetch } = useGameFull(id);
  const createEnd = useCreateEnd();
  const createBowl = useCreateBowl();
  const updateEnd = useUpdateEnd();
  const updateGame = useUpdateGame();

  const [viewState, setViewState] = useState<ViewState>('end-setup');
  const [currentEndId, setCurrentEndId] = useState<string | null>(null);
  const [activeBowl, setActiveBowl] = useState<1 | 2>(1);
  const [hand, setHand] = useState<"Forehand" | "Backhand">("Forehand");
  const [gridSelection, setGridSelection] = useState<{row: 0|1|2, col: 0|1|2} | null>(null);
  const [jackEffective, setJackEffective] = useState(true);
  const [endLength, setEndLength] = useState<string>("Medium");
  const [scoreFor, setScoreFor] = useState(0);
  const [scoreAgainst, setScoreAgainst] = useState(0);
  const [isDead, setIsDead] = useState(false);

  const completedEnds = game?.ends?.filter(e => e.isCompleted) || [];
  const incompleteEnd = game?.ends?.find(e => !e.isCompleted);
  const currentEnd = currentEndId 
    ? game?.ends?.find(e => e.id === currentEndId) 
    : incompleteEnd;
  const nextEndNumber = completedEnds.length + 1;
  
  const bowl1 = currentEnd?.bowls?.find(b => b.bowlNumber === 1);
  const bowl2 = currentEnd?.bowls?.find(b => b.bowlNumber === 2);

  useEffect(() => {
    if (!game) return;
    
    // Don't override end-summary view - user must click button to proceed
    if (viewState === 'end-summary') return;
    
    if (incompleteEnd) {
      setCurrentEndId(incompleteEnd.id);
      if (incompleteEnd.bowls?.length === 0) {
        setViewState('bowling');
        setActiveBowl(1);
      } else if (incompleteEnd.bowls?.length === 1) {
        setViewState('bowling');
        setActiveBowl(2);
      } else if (incompleteEnd.bowls?.length >= 2) {
        setViewState('score-entry');
      }
    } else if (viewState !== 'end-summary') {
      setCurrentEndId(null);
      setViewState('end-setup');
    }
  }, [game?.ends?.length, incompleteEnd?.bowls?.length, viewState]);

  if (isLoading) return <div className="text-center py-12">Loading game...</div>;
  if (!game) return <div className="text-center py-12">Game not found</div>;

  const calculateResult = (): BowlResult => {
    if (!gridSelection) return 'Effective';
    const { row, col } = gridSelection;
    const isShort = row === 0;
    const isHeavy = row === 2;
    const isLeft = col === 0;
    const isRight = col === 2;
    const isCenterLength = row === 1;
    const isCenterLine = col === 1;

    let lengthStr = '';
    if (isShort) lengthStr = 'Short';
    if (isHeavy) lengthStr = 'Heavy';

    let lineStr = '';
    if (isLeft) {
       lineStr = hand === 'Forehand' ? 'Wide' : 'Narrow';
    } else if (isRight) {
       lineStr = hand === 'Forehand' ? 'Narrow' : 'Wide';
    }

    if (isCenterLength && isCenterLine) {
      return 'Effective';
    } else if (lengthStr && lineStr) {
      return `${lengthStr} & ${lineStr}` as BowlResult;
    } else if (lengthStr) {
      return lengthStr as BowlResult;
    } else if (lineStr) {
      return lineStr as BowlResult;
    }
    return 'Effective';
  };

  const endLengthOptions = ["Minimum", "Short", "Medium", "Long", "Maximum"];

  const handleStartEnd = async () => {
    createEnd.mutate(
      {
        gameId: game.id,
        endNumber: nextEndNumber,
        length: endLength,
        jackEffective: game.position === 'Lead' ? jackEffective : undefined,
        scoreFor: 0,
        scoreAgainst: 0,
        isDead: false,
        isCompleted: false,
      },
      {
        onSuccess: (newEnd) => {
          setCurrentEndId(newEnd.id);
          setViewState('bowling');
          setActiveBowl(1);
          setGridSelection(null);
        },
      }
    );
  };

  const saveBowl = async () => {
    if (!gridSelection || !currentEnd) return;

    const result = calculateResult();
    
    createBowl.mutate(
      {
        bowl: {
          endId: currentEnd.id,
          bowlNumber: activeBowl,
          hand,
          result,
        },
        gameId: game.id,
      },
      {
        onSuccess: () => {
          toast({ title: `Bowl ${activeBowl} recorded` });
          setGridSelection(null);
          if (activeBowl === 1) {
            setActiveBowl(2);
          } else {
            setViewState('score-entry');
          }
        },
      }
    );
  };

  const finishEnd = () => {
    if (!currentEnd) return;

    updateEnd.mutate(
      {
        id: currentEnd.id,
        gameId: game.id,
        updates: {
          scoreFor: isDead ? 0 : scoreFor,
          scoreAgainst: isDead ? 0 : scoreAgainst,
          isDead,
          isCompleted: true,
        },
      },
      {
        onSuccess: () => {
          setViewState('end-summary');
        },
      }
    );
  };

  const startNextEnd = () => {
    setScoreFor(0);
    setScoreAgainst(0);
    setIsDead(false);
    setJackEffective(true);
    setEndLength("Medium");
    setCurrentEndId(null);
    setViewState('end-setup');
    refetch();
  };

  const handleFinishGame = () => {
    updateGame.mutate(
      {
        id: game.id,
        updates: { status: "COMPLETED" },
      },
      {
        onSuccess: () => {
          toast({ title: "Game finished!", description: "Check out your stats in Analysis" });
          setLocation("/");
        },
      }
    );
  };

  const GridCell = ({ r, c, label }: { r: 0|1|2, c: 0|1|2, label?: string }) => {
    const isSelected = gridSelection?.row === r && gridSelection?.col === c;
    return (
      <button
        type="button"
        onClick={() => setGridSelection({ row: r, col: c })}
        className={cn(
          "h-20 w-full border rounded-lg flex items-center justify-center transition-all relative font-medium text-sm",
          isSelected 
            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" 
            : "bg-background hover:bg-secondary",
          r === 1 && c === 1 ? "bg-accent/20 border-accent text-accent-foreground" : ""
        )}
        data-testid={`grid-cell-${r}-${c}`}
      >
        {label}
        {isSelected && <CheckCircle2 className="absolute top-1 right-1 w-4 h-4" />}
      </button>
    );
  };

  const totalFor = completedEnds.reduce((sum, e) => sum + (e.scoreFor || 0), 0);
  const totalAgainst = completedEnds.reduce((sum, e) => sum + (e.scoreAgainst || 0), 0);

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} data-testid="button-exit">
          <ArrowLeft className="w-4 h-4 mr-1" /> Exit
        </Button>
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold" data-testid="text-end-number">
            {viewState === 'end-summary' 
              ? `End ${currentEnd?.endNumber} Summary` 
              : `End ${currentEnd?.endNumber || nextEndNumber}`
            }
          </h2>
          <p className="text-xs text-muted-foreground">{game.venue} • {game.surface}</p>
        </div>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleFinishGame}
          disabled={updateGame.isPending}
          data-testid="button-finish-game"
        >
          <Flag className="w-4 h-4 mr-1" /> Finish
        </Button>
      </div>

      {/* End Setup View */}
      {viewState === 'end-setup' && (
        <Card>
          <CardHeader>
            <CardTitle>Start End {nextEndNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {game.position === 'Lead' && (
              <div className="flex items-center justify-between">
                <Label className="text-base">Jack Delivery Effective?</Label>
                <Switch checked={jackEffective} onCheckedChange={setJackEffective} data-testid="switch-jack" />
              </div>
            )}
            <div className="space-y-2">
              <Label>End Length</Label>
              <Select value={endLength} onValueChange={setEndLength}>
                <SelectTrigger data-testid="select-end-length">
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  {endLengthOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full" 
              onClick={handleStartEnd}
              disabled={createEnd.isPending}
              data-testid="button-start-end"
            >
              {createEnd.isPending ? "Starting..." : "Start End Recording"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bowling View */}
      {viewState === 'bowling' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold" data-testid="text-bowl-number">
              Bowl {activeBowl} of 2
            </h3>
            <div className="flex bg-secondary p-1 rounded-md">
              <button 
                type="button"
                className={cn("px-3 py-1 rounded text-sm transition-all", hand === "Forehand" ? "bg-white shadow text-primary font-medium" : "text-muted-foreground")}
                onClick={() => setHand("Forehand")}
                data-testid="button-hand-forehand"
              >
                Forehand
              </button>
              <button 
                type="button"
                className={cn("px-3 py-1 rounded text-sm transition-all", hand === "Backhand" ? "bg-white shadow text-primary font-medium" : "text-muted-foreground")}
                onClick={() => setHand("Backhand")}
                data-testid="button-hand-backhand"
              >
                Backhand
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <GridCell r={0} c={0} />
            <GridCell r={0} c={1} label="Short" />
            <GridCell r={0} c={2} />
            
            <GridCell r={1} c={0} label={hand === 'Forehand' ? 'Wide' : 'Narrow'} />
            <GridCell r={1} c={1} label="Effective" />
            <GridCell r={1} c={2} label={hand === 'Forehand' ? 'Narrow' : 'Wide'} />

            <GridCell r={2} c={0} />
            <GridCell r={2} c={1} label="Heavy" />
            <GridCell r={2} c={2} />
          </div>
          
          <Button 
            size="lg" 
            className="w-full font-display text-lg" 
            disabled={!gridSelection || createBowl.isPending}
            onClick={saveBowl}
            data-testid="button-save-bowl"
          >
            {createBowl.isPending ? "Saving..." : `Save Bowl ${activeBowl}`}
          </Button>
        </div>
      )}

      {/* Score Entry View */}
      {viewState === 'score-entry' && (
        <div className="space-y-6 animate-in fade-in">
          <Card className="bg-secondary/20 border-primary/20">
            <CardHeader>
              <CardTitle>Record End Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-background p-3 rounded border">
                  <span className="block font-semibold text-foreground">Bowl 1</span>
                  {bowl1?.hand} - {bowl1?.result}
                </div>
                <div className="bg-background p-3 rounded border">
                  <span className="block font-semibold text-foreground">Bowl 2</span>
                  {bowl2?.hand} - {bowl2?.result}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                <span className="font-medium">End Status</span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="dead-end">Dead End?</Label>
                  <Switch id="dead-end" checked={isDead} onCheckedChange={setIsDead} data-testid="switch-dead-end" />
                </div>
              </div>

              {!isDead && (
                <div className="space-y-4">
                  <Label className="text-center block">End Score</Label>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-24 w-24 text-3xl font-bold rounded-xl"
                      onClick={() => {
                        if (scoreFor > 0) {
                          setScoreFor(scoreFor - 1);
                        } else if (scoreAgainst < 8) {
                          setScoreAgainst(scoreAgainst + 1);
                        }
                      }}
                      data-testid="button-score-minus"
                    >
                      −
                    </Button>
                    
                    <div className="text-center min-w-[100px]">
                      <div className={cn(
                        "text-5xl font-bold",
                        scoreFor > 0 ? "text-primary" : scoreAgainst > 0 ? "text-destructive" : "text-foreground"
                      )}>
                        {scoreFor > 0 ? `+${scoreFor}` : scoreAgainst > 0 ? `-${scoreAgainst}` : '0'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {scoreFor > 0 ? "For Us" : scoreAgainst > 0 ? "Against" : "Draw"}
                      </p>
                    </div>
                    
                    <Button
                      type="button"
                      className="h-24 w-24 text-3xl font-bold rounded-xl bg-primary hover:bg-primary/90"
                      onClick={() => {
                        if (scoreAgainst > 0) {
                          setScoreAgainst(scoreAgainst - 1);
                        } else if (scoreFor < 8) {
                          setScoreFor(scoreFor + 1);
                        }
                      }}
                      data-testid="button-score-plus"
                    >
                      +
                    </Button>
                  </div>
                </div>
              )}

              <Button 
                size="lg" 
                className="w-full" 
                onClick={finishEnd}
                disabled={updateEnd.isPending}
                data-testid="button-finish-end"
              >
                {updateEnd.isPending ? "Saving..." : "Save & Finish End"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* End Summary View - Shows after each completed end */}
      {viewState === 'end-summary' && currentEnd && (() => {
        const allEndsIncludingCurrent = [...completedEnds.filter(e => e.id !== currentEnd.id), currentEnd];
        const allBowls = allEndsIncludingCurrent.flatMap(e => e.bowls || []);
        const totalBowls = allBowls.length;
        const effectiveBowls = allBowls.filter(b => b.result === 'Effective').length;
        const effectivePercent = totalBowls > 0 ? Math.round((effectiveBowls / totalBowls) * 100) : 0;
        const runningFor = totalFor + (currentEnd.scoreFor || 0);
        const runningAgainst = totalAgainst + (currentEnd.scoreAgainst || 0);

        return (
          <div className="space-y-6 animate-in fade-in">
            {/* This End Result */}
            <Card className="border-primary/30">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-primary">End {currentEnd.endNumber} Complete</CardTitle>
              </CardHeader>
              <CardContent>
                {currentEnd.isDead ? (
                  <p className="text-center text-muted-foreground py-4">Dead End - No Score</p>
                ) : (
                  <div className="flex justify-center gap-8 py-2">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-primary">{currentEnd.scoreFor}</span>
                      <p className="text-xs text-muted-foreground">For</p>
                    </div>
                    <div className="text-center">
                      <span className="text-4xl font-bold text-destructive">{currentEnd.scoreAgainst}</span>
                      <p className="text-xs text-muted-foreground">Against</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="py-4 text-center">
                  <span className="text-sm text-muted-foreground">Game Score</span>
                  <div className="flex justify-center items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-primary">{runningFor}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-3xl font-bold text-destructive">{runningAgainst}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className={cn(
                "bg-muted/30",
                effectivePercent >= 50 ? "border-primary/30" : ""
              )}>
                <CardContent className="py-4 text-center">
                  <span className="text-sm text-muted-foreground">Effective Bowls</span>
                  <div className="mt-1">
                    <span className={cn(
                      "text-3xl font-bold",
                      effectivePercent >= 50 ? "text-primary" : "text-foreground"
                    )}>{effectivePercent}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{effectiveBowls} of {totalBowls}</p>
                </CardContent>
              </Card>
            </div>

            {/* All Bowls Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">All Bowls This Game</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>End</TableHead>
                      <TableHead>Bowl</TableHead>
                      <TableHead>Hand</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEndsIncludingCurrent.map((end) => 
                      end.bowls?.map((bowl) => (
                        <TableRow key={bowl.id}>
                          <TableCell className="font-medium">{end.endNumber}</TableCell>
                          <TableCell>{bowl.bowlNumber}</TableCell>
                          <TableCell className="text-xs">{bowl.hand}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              bowl.result === 'Effective' ? "bg-primary/10 text-primary" : "bg-secondary"
                            )}>
                              {bowl.result}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Ends Summary Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ends Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>End</TableHead>
                      <TableHead>Length</TableHead>
                      <TableHead>Bowl 1</TableHead>
                      <TableHead>Bowl 2</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEndsIncludingCurrent.map((end) => (
                      <TableRow key={end.id}>
                        <TableCell className="font-medium">{end.endNumber}</TableCell>
                        <TableCell className="text-xs">{end.length}</TableCell>
                        <TableCell className="text-xs">
                          <span className={cn(
                            end.bowls?.[0]?.result === 'Effective' ? "text-primary font-medium" : ""
                          )}>
                            {end.bowls?.[0]?.result || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={cn(
                            end.bowls?.[1]?.result === 'Effective' ? "text-primary font-medium" : ""
                          )}>
                            {end.bowls?.[1]?.result || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {end.isDead ? (
                            <span className="text-muted-foreground">Dead</span>
                          ) : (
                            <span>
                              <span className="text-primary font-medium">{end.scoreFor}</span>
                              {' - '}
                              <span className="text-destructive font-medium">{end.scoreAgainst}</span>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button 
                size="lg" 
                className="flex-1"
                onClick={startNextEnd}
                data-testid="button-next-end"
              >
                Record Next End <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
