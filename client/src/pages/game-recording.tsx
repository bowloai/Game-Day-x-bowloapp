import { useGameFull, useCreateEnd, useCreateBowl, useUpdateEnd, useUpdateGame } from "@/lib/hooks";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
  
  // Survey dialog state
  const [showSurveyDialog, setShowSurveyDialog] = useState(false);
  const [surveyGreenSpeed, setSurveyGreenSpeed] = useState<string>("");
  const [surveyGreenComparable, setSurveyGreenComparable] = useState<string>("");
  const [surveyMentalFeeling, setSurveyMentalFeeling] = useState<string>("");
  const [surveyPerformanceRating, setSurveyPerformanceRating] = useState<number[]>([5]);
  const [surveyRatingTouched, setSurveyRatingTouched] = useState(false);
  const [surveyNotes, setSurveyNotes] = useState<string>("");
  
  const resetSurveyState = () => {
    setSurveyGreenSpeed("");
    setSurveyGreenComparable("");
    setSurveyMentalFeeling("");
    setSurveyPerformanceRating([5]);
    setSurveyRatingTouched(false);
    setSurveyNotes("");
  };

  const completedEnds = game?.ends?.filter(e => e.isCompleted) || [];
  const incompleteEnd = game?.ends?.find(e => !e.isCompleted);
  const currentEnd = currentEndId 
    ? game?.ends?.find(e => e.id === currentEndId) 
    : incompleteEnd;
  const nextEndNumber = completedEnds.length + 1;
  
  // Check if we won the last end (or it's the first end) - determines if we deliver the jack
  const lastCompletedEnd = completedEnds.length > 0 
    ? completedEnds.reduce((latest, end) => end.endNumber > latest.endNumber ? end : latest)
    : null;
  const wonLastEnd = !lastCompletedEnd || (lastCompletedEnd.scoreFor || 0) > (lastCompletedEnd.scoreAgainst || 0);
  const canDeliverJack = game?.position === 'Lead' && wonLastEnd;
  
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
    } else {
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
        jackEffective: canDeliverJack ? jackEffective : undefined,
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
    setShowSurveyDialog(true);
  };

  const submitSurveyAndFinish = () => {
    const greenSpeedValue = surveyGreenSpeed.trim() ? parseInt(surveyGreenSpeed) : null;
    
    updateGame.mutate(
      {
        id: game.id,
        updates: { 
          status: "COMPLETED",
          greenSpeed: greenSpeedValue && !isNaN(greenSpeedValue) ? greenSpeedValue : null,
          greenComparable: surveyGreenComparable.trim() || null,
          mentalFeeling: surveyMentalFeeling.trim() || null,
          performanceRating: surveyRatingTouched ? surveyPerformanceRating[0] : null,
          notes: surveyNotes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          resetSurveyState();
          toast({ title: "Game finished!", description: "Check out your stats in Analysis" });
          setLocation("/");
        },
      }
    );
  };

  const skipSurveyAndFinish = () => {
    resetSurveyState();
    setShowSurveyDialog(false);
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
            {canDeliverJack && (
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
        
        // Calculate running totals - exclude current end from completedEnds since we add it separately
        const otherEnds = completedEnds.filter(e => e.id !== currentEnd.id);
        const runningFor = otherEnds.reduce((sum, e) => sum + (e.scoreFor || 0), 0) + (currentEnd.scoreFor || 0);
        const runningAgainst = otherEnds.reduce((sum, e) => sum + (e.scoreAgainst || 0), 0) + (currentEnd.scoreAgainst || 0);
        
        // Odd/Even end analysis
        const oddEnds = allEndsIncludingCurrent.filter(e => e.endNumber % 2 === 1);
        const evenEnds = allEndsIncludingCurrent.filter(e => e.endNumber % 2 === 0);
        const oddBowls = oddEnds.flatMap(e => e.bowls || []);
        const evenBowls = evenEnds.flatMap(e => e.bowls || []);
        
        // Effective percentages
        const oddEffective = oddBowls.filter(b => b.result === 'Effective').length;
        const oddEffectivePercent = oddBowls.length > 0 ? Math.round((oddEffective / oddBowls.length) * 100) : 0;
        const evenEffective = evenBowls.filter(b => b.result === 'Effective').length;
        const evenEffectivePercent = evenBowls.length > 0 ? Math.round((evenEffective / evenBowls.length) * 100) : 0;
        
        // Weight issues (Heavy or Short) - check if result contains these words
        const isWeightIssue = (result: string) => result.includes('Heavy') || result.includes('Short');
        const oddWeightIssues = oddBowls.filter(b => isWeightIssue(b.result)).length;
        const oddWeightPercent = oddBowls.length > 0 ? Math.round((oddWeightIssues / oddBowls.length) * 100) : 0;
        const evenWeightIssues = evenBowls.filter(b => isWeightIssue(b.result)).length;
        const evenWeightPercent = evenBowls.length > 0 ? Math.round((evenWeightIssues / evenBowls.length) * 100) : 0;
        
        // Line issues (Narrow or Wide) - check if result contains these words
        const isLineIssue = (result: string) => result.includes('Narrow') || result.includes('Wide');
        const oddLineIssues = oddBowls.filter(b => isLineIssue(b.result)).length;
        const oddLinePercent = oddBowls.length > 0 ? Math.round((oddLineIssues / oddBowls.length) * 100) : 0;
        const evenLineIssues = evenBowls.filter(b => isLineIssue(b.result)).length;
        const evenLinePercent = evenBowls.length > 0 ? Math.round((evenLineIssues / evenBowls.length) * 100) : 0;

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

            {/* Odd/Even End Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Direction Analysis</CardTitle>
                <p className="text-xs text-muted-foreground">Compare your performance by end direction</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead className="text-center">Odd Ends</TableHead>
                      <TableHead className="text-center">Even Ends</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Effective</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          oddEffectivePercent >= 50 ? "text-primary" : ""
                        )}>{oddEffectivePercent}%</span>
                        <span className="text-xs text-muted-foreground ml-1">({oddEffective}/{oddBowls.length})</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {evenBowls.length > 0 ? (
                          <>
                            <span className={cn(
                              "font-bold",
                              evenEffectivePercent >= 50 ? "text-primary" : ""
                            )}>{evenEffectivePercent}%</span>
                            <span className="text-xs text-muted-foreground ml-1">({evenEffective}/{evenBowls.length})</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Weight Issues</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          oddWeightPercent > 30 ? "text-destructive" : ""
                        )}>{oddWeightPercent}%</span>
                        <span className="text-xs text-muted-foreground ml-1">heavy/short</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {evenBowls.length > 0 ? (
                          <>
                            <span className={cn(
                              "font-bold",
                              evenWeightPercent > 30 ? "text-destructive" : ""
                            )}>{evenWeightPercent}%</span>
                            <span className="text-xs text-muted-foreground ml-1">heavy/short</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Line Issues</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          oddLinePercent > 30 ? "text-destructive" : ""
                        )}>{oddLinePercent}%</span>
                        <span className="text-xs text-muted-foreground ml-1">narrow/wide</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {evenBowls.length > 0 ? (
                          <>
                            <span className={cn(
                              "font-bold",
                              evenLinePercent > 30 ? "text-destructive" : ""
                            )}>{evenLinePercent}%</span>
                            <span className="text-xs text-muted-foreground ml-1">narrow/wide</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
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
                          {end.bowls?.[0] ? (
                            <div>
                              <span className={cn(
                                end.bowls[0].result === 'Effective' ? "text-primary font-medium" : ""
                              )}>
                                {end.bowls[0].result}
                              </span>
                              <span className="text-muted-foreground ml-1">
                                ({end.bowls[0].hand === 'Forehand' ? 'FH' : 'BH'})
                              </span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {end.bowls?.[1] ? (
                            <div>
                              <span className={cn(
                                end.bowls[1].result === 'Effective' ? "text-primary font-medium" : ""
                              )}>
                                {end.bowls[1].result}
                              </span>
                              <span className="text-muted-foreground ml-1">
                                ({end.bowls[1].hand === 'Forehand' ? 'FH' : 'BH'})
                              </span>
                            </div>
                          ) : '-'}
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

      {/* Post-Game Survey Dialog */}
      <Dialog 
        open={showSurveyDialog} 
        onOpenChange={(open) => {
          setShowSurveyDialog(open);
          if (!open) {
            resetSurveyState();
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Game Complete!</DialogTitle>
            <DialogDescription>
              Take a moment to reflect on your game. All fields are optional.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Green Speed */}
            <div className="space-y-2">
              <Label htmlFor="greenSpeed">Green Speed (estimated seconds)</Label>
              <Input
                id="greenSpeed"
                type="number"
                placeholder="e.g., 14"
                value={surveyGreenSpeed}
                onChange={(e) => setSurveyGreenSpeed(e.target.value)}
                data-testid="input-green-speed"
              />
            </div>

            {/* Green Comparable */}
            <div className="space-y-2">
              <Label htmlFor="greenComparable">Green comparable to</Label>
              <Input
                id="greenComparable"
                placeholder="e.g., Home green, Club championship green"
                value={surveyGreenComparable}
                onChange={(e) => setSurveyGreenComparable(e.target.value)}
                data-testid="input-green-comparable"
              />
            </div>

            {/* Mental Feeling */}
            <div className="space-y-2">
              <Label>How did you feel mentally?</Label>
              <Select value={surveyMentalFeeling} onValueChange={setSurveyMentalFeeling}>
                <SelectTrigger data-testid="select-mental-feeling">
                  <SelectValue placeholder="Select how you felt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent - Fully focused</SelectItem>
                  <SelectItem value="Good">Good - Generally focused</SelectItem>
                  <SelectItem value="Average">Average - Some distractions</SelectItem>
                  <SelectItem value="Below Average">Below Average - Struggled to concentrate</SelectItem>
                  <SelectItem value="Poor">Poor - Couldn't focus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Performance Rating */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Rate your performance</Label>
                <span className="text-2xl font-bold text-primary">{surveyPerformanceRating[0]}/10</span>
              </div>
              <Slider
                value={surveyPerformanceRating}
                onValueChange={(value) => {
                  setSurveyPerformanceRating(value);
                  setSurveyRatingTouched(true);
                }}
                max={10}
                min={1}
                step={1}
                className="py-2"
                data-testid="slider-performance"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional notes</Label>
              <Textarea
                id="notes"
                placeholder="Any thoughts or reflections on the game..."
                value={surveyNotes}
                onChange={(e) => setSurveyNotes(e.target.value)}
                rows={3}
                data-testid="textarea-notes"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={skipSurveyAndFinish}
              disabled={updateGame.isPending}
              data-testid="button-skip-survey"
            >
              Skip
            </Button>
            <Button 
              onClick={submitSurveyAndFinish}
              disabled={updateGame.isPending}
              data-testid="button-submit-survey"
            >
              Save & Finish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
