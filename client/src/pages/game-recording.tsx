import { useGameFull, useCreateEnd, useCreateBowl, useUpdateEnd, useUpdateGame, useUpdateBowl } from "@/lib/hooks";
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
import { CheckCircle2, ArrowLeft, ArrowRight, Flag, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatResult, formatResultShort, formatHandShort, isEffective, isShort, isHeavy, isNarrow, isWide, getResultColorClass } from "@/lib/bowlResults";

// Database format for bowl results: weight_line
type BowlResult = 
  | 'effective_online'
  | 'effective_narrow'
  | 'effective_wide'
  | 'short_online'
  | 'short_narrow'
  | 'short_wide'
  | 'heavy_online'
  | 'heavy_narrow'
  | 'heavy_wide';

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
  const updateBowl = useUpdateBowl();

  const [viewState, setViewState] = useState<ViewState>('end-setup');
  const [currentEndId, setCurrentEndId] = useState<string | null>(null);
  const [activeBowl, setActiveBowl] = useState<number>(1);
  
  const bowlsPerEnd = game?.bowlsPerEnd || 2;
  const [hand, setHand] = useState<"Forehand" | "Backhand">("Forehand");
  const [gridSelection, setGridSelection] = useState<{row: number, col: number} | null>(null);
  const [jackEffective, setJackEffective] = useState(true);
  const [endLength, setEndLength] = useState<string>("Medium");
  const [scoreFor, setScoreFor] = useState(0);
  const [scoreAgainst, setScoreAgainst] = useState(0);
  const [isDead, setIsDead] = useState(false);
  
  // Bowl editing state
  const [editingBowl, setEditingBowl] = useState<{ id: string; bowlNumber: number; hand: "Forehand" | "Backhand"; gridRow?: number | null; gridCol?: number | null } | null>(null);
  const [editHand, setEditHand] = useState<"Forehand" | "Backhand">("Forehand");
  const [editGridSelection, setEditGridSelection] = useState<{row: number, col: number} | null>(null);
  
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

  const openEditBowl = (bowl: { id: string; bowlNumber: number; hand: "Forehand" | "Backhand"; gridRow?: number | null; gridCol?: number | null }) => {
    setEditingBowl(bowl);
    setEditHand(bowl.hand);
    setEditGridSelection(bowl.gridRow != null && bowl.gridCol != null ? { row: bowl.gridRow, col: bowl.gridCol } : null);
  };

  const closeEditBowl = () => {
    setEditingBowl(null);
    setEditGridSelection(null);
  };

  const calculateEditResult = (): BowlResult => {
    if (!editGridSelection) return 'effective_online';
    const { row, col } = editGridSelection;
    
    const isShortRow = row <= 2;
    const isHeavyRow = row >= 6;
    const isLeft = col <= 2;
    const isRight = col >= 6;

    // Determine weight component
    let weight = 'effective';
    if (isShortRow) weight = 'short';
    else if (isHeavyRow) weight = 'heavy';

    // Determine line component based on hand
    let line = 'online';
    if (isLeft) {
       line = editHand === 'Forehand' ? 'wide' : 'narrow';
    } else if (isRight) {
       line = editHand === 'Forehand' ? 'narrow' : 'wide';
    }

    return `${weight}_${line}` as BowlResult;
  };

  const saveEditedBowl = () => {
    if (!editingBowl || !editGridSelection || !game) return;
    
    const result = calculateEditResult();
    updateBowl.mutate(
      {
        id: editingBowl.id,
        gameId: game.id,
        updates: {
          hand: editHand,
          result,
          gridRow: editGridSelection.row,
          gridCol: editGridSelection.col,
        },
      },
      {
        onSuccess: () => {
          toast({ title: `Bowl ${editingBowl.bowlNumber} updated` });
          closeEditBowl();
        },
      }
    );
  };

  const completedEnds = game?.ends?.filter(e => e.isCompleted) || [];
  const incompleteEnd = game?.ends?.find(e => !e.isCompleted);
  const currentEnd = currentEndId 
    ? game?.ends?.find(e => e.id === currentEndId) 
    : incompleteEnd;
  const nextEndNumber = completedEnds.length + 1;
  
  // Check if we won the last end - determines if we deliver the jack
  const lastCompletedEnd = completedEnds.length > 0 
    ? completedEnds.reduce((latest, end) => end.endNumber > latest.endNumber ? end : latest)
    : null;
  const wonLastEnd = lastCompletedEnd ? (lastCompletedEnd.scoreFor || 0) > (lastCompletedEnd.scoreAgainst || 0) : false;
  // Jack delivery eligibility: Singles (no position), or any position containing "Lead"
  const isLeadRole = !game?.position || game.position === 'Lead' || game.position.includes('Lead');
  // For first end, use ourMat setting; for subsequent ends, use wonLastEnd
  const canDeliverJack = isLeadRole && (nextEndNumber === 1 ? (game?.ourMat ?? true) : wonLastEnd);
  
  const endBowls = currentEnd?.bowls?.sort((a, b) => a.bowlNumber - b.bowlNumber) || [];

  useEffect(() => {
    if (!game) return;
    
    // Don't override end-summary view - user must click button to proceed
    if (viewState === 'end-summary') return;
    
    if (incompleteEnd) {
      setCurrentEndId(incompleteEnd.id);
      const bowlCount = incompleteEnd.bowls?.length || 0;
      if (bowlCount === 0) {
        setViewState('bowling');
        setActiveBowl(1);
      } else if (bowlCount < bowlsPerEnd) {
        setViewState('bowling');
        setActiveBowl(bowlCount + 1);
      } else {
        setViewState('score-entry');
      }
    } else {
      setCurrentEndId(null);
      setViewState('end-setup');
    }
  }, [game?.ends?.length, incompleteEnd?.bowls?.length, viewState, bowlsPerEnd]);

  if (isLoading) return <div className="text-center py-12">Loading game...</div>;
  if (!game) return <div className="text-center py-12">Game not found</div>;

  const calculateResult = (): BowlResult => {
    if (!gridSelection) return 'effective_online';
    const { row, col } = gridSelection;
    
    // Map 9x9 grid to zones
    // Rows 0-2: Short, Rows 3-5: Effective weight, Rows 6-8: Heavy
    // Cols 0-2: Left side, Cols 3-5: Online, Cols 6-8: Right side
    const isShortRow = row <= 2;
    const isHeavyRow = row >= 6;
    const isLeft = col <= 2;
    const isRight = col >= 6;

    // Determine weight component
    let weight = 'effective';
    if (isShortRow) weight = 'short';
    else if (isHeavyRow) weight = 'heavy';

    // Determine line component based on hand
    let line = 'online';
    if (isLeft) {
       line = hand === 'Forehand' ? 'wide' : 'narrow';
    } else if (isRight) {
       line = hand === 'Forehand' ? 'narrow' : 'wide';
    }

    return `${weight}_${line}` as BowlResult;
  };

  const endLengthOptions = ["Short", "Medium", "Long"];

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
          // Alternate hand based on end number - odd ends use Forehand, even ends use Backhand
          setHand(nextEndNumber % 2 === 1 ? "Forehand" : "Backhand");
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
          gridRow: gridSelection.row,
          gridCol: gridSelection.col,
        },
        gameId: game.id,
      },
      {
        onSuccess: () => {
          toast({ title: `Bowl ${activeBowl} recorded` });
          setGridSelection(null);
          if (activeBowl < bowlsPerEnd) {
            setActiveBowl(activeBowl + 1);
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

  const getZoneColor = (row: number, col: number) => {
    // Center 3x3 (rows 3-5, cols 3-5) = Effective zone (green)
    const isEffective = row >= 3 && row <= 5 && col >= 3 && col <= 5;
    if (isEffective) return "bg-green-100 dark:bg-green-950/40 border-green-400";
    
    // Short zones (rows 0-2)
    if (row <= 2) {
      if (col <= 2) return "bg-red-50 dark:bg-red-950/20 border-red-200"; // Short-Left
      if (col >= 6) return "bg-red-50 dark:bg-red-950/20 border-red-200"; // Short-Right
      return "bg-red-100 dark:bg-red-950/30 border-red-300"; // Short center
    }
    
    // Heavy zones (rows 6-8)
    if (row >= 6) {
      if (col <= 2) return "bg-slate-50 dark:bg-slate-950/20 border-slate-200"; // Heavy-Left
      if (col >= 6) return "bg-slate-50 dark:bg-slate-950/20 border-slate-200"; // Heavy-Right
      return "bg-slate-100 dark:bg-slate-950/30 border-slate-300"; // Heavy center
    }
    
    // Good weight but off-line (rows 3-5, cols 0-2 or 6-8)
    if (col <= 2) return "bg-orange-50 dark:bg-orange-950/20 border-orange-200"; // Left
    if (col >= 6) return "bg-blue-50 dark:bg-blue-950/20 border-blue-200"; // Right
    
    return "bg-background border-border";
  };

  const getZoneLabel = (row: number, col: number): string => {
    // Only show labels at zone centers (middle cell of each 3x3 zone)
    const isZoneCenter = (row % 3 === 1) && (col % 3 === 1);
    if (!isZoneCenter) return "";
    
    const zoneRow = Math.floor(row / 3); // 0=Short, 1=Good, 2=Heavy
    const zoneCol = Math.floor(col / 3); // 0=Left, 1=Center, 2=Right
    
    // Map left/right to wide/narrow based on hand - use single letters
    const leftLabel = hand === 'Forehand' ? 'W' : 'N';
    const rightLabel = hand === 'Forehand' ? 'N' : 'W';
    
    if (zoneRow === 0 && zoneCol === 1) return "S";
    if (zoneRow === 2 && zoneCol === 1) return "H";
    if (zoneRow === 1 && zoneCol === 0) return leftLabel;
    if (zoneRow === 1 && zoneCol === 1) return "✓";
    if (zoneRow === 1 && zoneCol === 2) return rightLabel;
    
    return "";
  };

  const GridCell9x9 = ({ r, c }: { r: number, c: number }) => {
    const isSelected = gridSelection?.row === r && gridSelection?.col === c;
    const label = getZoneLabel(r, c);
    const isEffectiveZone = r >= 3 && r <= 5 && c >= 3 && c <= 5;
    const isJackCell = r === 4 && c === 4;
    
    return (
      <button
        type="button"
        onClick={() => setGridSelection({ row: r, col: c })}
        className={cn(
          "aspect-square w-full border rounded flex items-center justify-center transition-all relative text-xs font-medium",
          isSelected 
            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 z-10" 
            : getZoneColor(r, c),
          isSelected ? "" : "hover:opacity-80 hover:ring-1 hover:ring-primary/50",
          isJackCell && !isSelected ? "ring-2 ring-primary/30" : ""
        )}
        data-testid={`grid-cell-${r}-${c}`}
      >
        {isJackCell && !label && !isSelected && (
          <div className="w-2 h-2 rounded-full bg-primary/60" />
        )}
        {label && <span className={cn("text-center leading-tight", label.length > 6 ? "text-[10px]" : "")}>{label}</span>}
        {isSelected && <CheckCircle2 className="absolute -top-1 -right-1 w-3 h-3" />}
      </button>
    );
  };

  const getEditZoneLabel = (row: number, col: number): string => {
    const isZoneCenter = (row % 3 === 1) && (col % 3 === 1);
    if (!isZoneCenter) return "";
    
    const zoneRow = Math.floor(row / 3);
    const zoneCol = Math.floor(col / 3);
    
    // Use single letters for labels
    const leftLabel = editHand === 'Forehand' ? 'W' : 'N';
    const rightLabel = editHand === 'Forehand' ? 'N' : 'W';
    
    if (zoneRow === 0 && zoneCol === 1) return "S";
    if (zoneRow === 2 && zoneCol === 1) return "H";
    if (zoneRow === 1 && zoneCol === 0) return leftLabel;
    if (zoneRow === 1 && zoneCol === 1) return "✓";
    if (zoneRow === 1 && zoneCol === 2) return rightLabel;
    
    return "";
  };

  const EditGridCell9x9 = ({ r, c }: { r: number, c: number }) => {
    const isSelected = editGridSelection?.row === r && editGridSelection?.col === c;
    const label = getEditZoneLabel(r, c);
    const isJackCell = r === 4 && c === 4;
    
    return (
      <button
        type="button"
        onClick={() => setEditGridSelection({ row: r, col: c })}
        className={cn(
          "aspect-square w-full border rounded flex items-center justify-center transition-all relative text-xs font-medium",
          isSelected 
            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 z-10" 
            : getZoneColor(r, c),
          isSelected ? "" : "hover:opacity-80 hover:ring-1 hover:ring-primary/50",
          isJackCell && !isSelected ? "ring-2 ring-primary/30" : ""
        )}
        data-testid={`edit-grid-cell-${r}-${c}`}
      >
        {isJackCell && !label && !isSelected && (
          <div className="w-2 h-2 rounded-full bg-primary/60" />
        )}
        {label && <span className={cn("text-center leading-tight", label.length > 6 ? "text-[10px]" : "")}>{label}</span>}
        {isSelected && <CheckCircle2 className="absolute -top-1 -right-1 w-3 h-3" />}
      </button>
    );
  };

  const totalFor = completedEnds.reduce((sum, e) => sum + (e.scoreFor || 0), 0);
  const totalAgainst = completedEnds.reduce((sum, e) => sum + (e.scoreAgainst || 0), 0);
  
  const isScoreBased = game?.gameEndType === "score";
  const targetScore = game?.targetScore || 0;
  const targetReached = isScoreBased && targetScore > 0 && (totalFor >= targetScore || totalAgainst >= targetScore);
  const isEndsBased = game?.gameEndType === "ends" || !game?.gameEndType;
  const totalEndsReached = isEndsBased && game?.totalEnds && game.totalEnds > 0 && completedEnds.length >= game.totalEnds;

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
          <p className="text-xs text-muted-foreground">
            {game.venue} • {game.surface} • {isScoreBased ? `First to ${targetScore}` : `${game.totalEnds} ends`}
          </p>
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

      {/* Game Complete Alert */}
      {(targetReached || totalEndsReached) && viewState === 'end-setup' && (
        <Card className="border-primary bg-primary/10">
          <CardContent className="py-4">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-primary">
                {targetReached 
                  ? `Target Score Reached! ${totalFor >= targetScore ? "You won!" : "Opponent won."}`
                  : `All ${game.totalEnds} ends completed!`
                }
              </p>
              <p className="text-sm text-muted-foreground">
                Final Score: {totalFor} - {totalAgainst}
              </p>
              <Button onClick={handleFinishGame} className="mt-2" data-testid="button-finish-game-alert">
                Finish Game
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* End Setup View */}
      {viewState === 'end-setup' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {targetReached || totalEndsReached ? "Continue Playing?" : `Start End ${nextEndNumber}`}
            </CardTitle>
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
              Bowl {activeBowl} of {bowlsPerEnd}
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

          <div className="grid grid-cols-9 gap-0.5">
            {Array.from({ length: 9 }, (_, row) =>
              Array.from({ length: 9 }, (_, col) => (
                <GridCell9x9 key={`${row}-${col}`} r={row} c={col} />
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Tap a cell to mark where your bowl landed. Each cell = 1 foot.
          </p>
          
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
              <div className={cn(
                "grid gap-4 text-sm",
                bowlsPerEnd <= 2 ? "grid-cols-2" : bowlsPerEnd === 3 ? "grid-cols-3" : "grid-cols-4"
              )}>
                {endBowls.map((bowl) => (
                  <div key={bowl.id} className="bg-background p-3 rounded border relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => openEditBowl(bowl)}
                      data-testid={`button-edit-bowl-${bowl.bowlNumber}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <span className="block font-medium text-foreground">Bowl {bowl.bowlNumber}</span>
                    <span className="text-xs text-muted-foreground">{formatHandShort(bowl.hand)}</span>
                    <span className={cn(
                      "block text-lg font-bold",
                      getResultColorClass(bowl.result)
                    )}>{formatResultShort(bowl.result)}</span>
                  </div>
                ))}
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
        const effectiveBowls = allBowls.filter(b => isEffective(b.result)).length;
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
        const oddEffective = oddBowls.filter(b => isEffective(b.result)).length;
        const oddEffectivePercent = oddBowls.length > 0 ? Math.round((oddEffective / oddBowls.length) * 100) : 0;
        const evenEffective = evenBowls.filter(b => isEffective(b.result)).length;
        const evenEffectivePercent = evenBowls.length > 0 ? Math.round((evenEffective / evenBowls.length) * 100) : 0;
        
        // Specific weight breakdown - Heavy vs Short
        const oddHeavy = oddBowls.filter(b => isHeavy(b.result)).length;
        const oddHeavyPercent = oddBowls.length > 0 ? Math.round((oddHeavy / oddBowls.length) * 100) : 0;
        const oddShort = oddBowls.filter(b => isShort(b.result)).length;
        const oddShortPercent = oddBowls.length > 0 ? Math.round((oddShort / oddBowls.length) * 100) : 0;
        const evenHeavy = evenBowls.filter(b => isHeavy(b.result)).length;
        const evenHeavyPercent = evenBowls.length > 0 ? Math.round((evenHeavy / evenBowls.length) * 100) : 0;
        const evenShort = evenBowls.filter(b => isShort(b.result)).length;
        const evenShortPercent = evenBowls.length > 0 ? Math.round((evenShort / evenBowls.length) * 100) : 0;
        
        // Specific line breakdown - Narrow vs Wide
        const oddNarrow = oddBowls.filter(b => isNarrow(b.result)).length;
        const oddNarrowPercent = oddBowls.length > 0 ? Math.round((oddNarrow / oddBowls.length) * 100) : 0;
        const oddWide = oddBowls.filter(b => isWide(b.result)).length;
        const oddWidePercent = oddBowls.length > 0 ? Math.round((oddWide / oddBowls.length) * 100) : 0;
        const evenNarrow = evenBowls.filter(b => isNarrow(b.result)).length;
        const evenNarrowPercent = evenBowls.length > 0 ? Math.round((evenNarrow / evenBowls.length) * 100) : 0;
        const evenWide = evenBowls.filter(b => isWide(b.result)).length;
        const evenWidePercent = evenBowls.length > 0 ? Math.round((evenWide / evenBowls.length) * 100) : 0;
        
        // All bowls combined stats
        const allHeavy = allBowls.filter(b => isHeavy(b.result)).length;
        const allHeavyPercent = totalBowls > 0 ? Math.round((allHeavy / totalBowls) * 100) : 0;
        const allShort = allBowls.filter(b => isShort(b.result)).length;
        const allShortPercent = totalBowls > 0 ? Math.round((allShort / totalBowls) * 100) : 0;
        const allNarrow = allBowls.filter(b => isNarrow(b.result)).length;
        const allNarrowPercent = totalBowls > 0 ? Math.round((allNarrow / totalBowls) * 100) : 0;
        const allWide = allBowls.filter(b => isWide(b.result)).length;
        const allWidePercent = totalBowls > 0 ? Math.round((allWide / totalBowls) * 100) : 0;
        
        // Helper to shorten result text for display
        const shortenResult = (result: string) => {
          return formatResultShort(result);
        };

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
                      <TableHead className="text-center text-xs">All</TableHead>
                      <TableHead className="text-center text-xs">Odd</TableHead>
                      <TableHead className="text-center text-xs">Even</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-xs">Effective</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          effectivePercent >= 50 ? "text-primary" : ""
                        )}>{effectivePercent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          oddEffectivePercent >= 50 ? "text-primary" : ""
                        )}>{oddEffectivePercent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {evenBowls.length > 0 ? (
                          <span className={cn(
                            "font-bold",
                            evenEffectivePercent >= 50 ? "text-primary" : ""
                          )}>{evenEffectivePercent}%</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-xs">Heavy</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          allHeavyPercent > 20 ? "text-destructive" : ""
                        )}>{allHeavyPercent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          oddHeavyPercent > 20 ? "text-destructive" : ""
                        )}>{oddHeavyPercent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {evenBowls.length > 0 ? (
                          <span className={cn(
                            "font-bold",
                            evenHeavyPercent > 20 ? "text-destructive" : ""
                          )}>{evenHeavyPercent}%</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-xs">Short</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          allShortPercent > 20 ? "text-destructive" : ""
                        )}>{allShortPercent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          oddShortPercent > 20 ? "text-destructive" : ""
                        )}>{oddShortPercent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {evenBowls.length > 0 ? (
                          <span className={cn(
                            "font-bold",
                            evenShortPercent > 20 ? "text-destructive" : ""
                          )}>{evenShortPercent}%</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-xs">Narrow</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          allNarrowPercent > 20 ? "text-destructive" : ""
                        )}>{allNarrowPercent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          oddNarrowPercent > 20 ? "text-destructive" : ""
                        )}>{oddNarrowPercent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {evenBowls.length > 0 ? (
                          <span className={cn(
                            "font-bold",
                            evenNarrowPercent > 20 ? "text-destructive" : ""
                          )}>{evenNarrowPercent}%</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-xs">Wide</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          allWidePercent > 20 ? "text-destructive" : ""
                        )}>{allWidePercent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold",
                          oddWidePercent > 20 ? "text-destructive" : ""
                        )}>{oddWidePercent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {evenBowls.length > 0 ? (
                          <span className={cn(
                            "font-bold",
                            evenWidePercent > 20 ? "text-destructive" : ""
                          )}>{evenWidePercent}%</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Jack Length Analysis */}
            {(() => {
              // Normalize legacy length values: minimum → short, maximum → long
              const normalizeLength = (len: string | null | undefined): string => {
                const l = (len || 'medium').toLowerCase();
                if (l === 'minimum') return 'short';
                if (l === 'maximum') return 'long';
                return l;
              };
              const calcLengthStats = (length: string) => {
                const endsAtLength = allEndsIncludingCurrent.filter(e => normalizeLength(e.length) === length);
                const bowlsAtLength = endsAtLength.flatMap(e => e.bowls || []);
                const total = bowlsAtLength.length;
                if (total === 0) return { total: 0, percent: 0, forehandPercent: 0, backhandPercent: 0, forehandTotal: 0, backhandTotal: 0 };
                const effective = bowlsAtLength.filter(b => isEffective(b.result)).length;
                const forehandBowls = bowlsAtLength.filter(b => b.hand?.toLowerCase() === 'forehand');
                const backhandBowls = bowlsAtLength.filter(b => b.hand?.toLowerCase() === 'backhand');
                const forehandEffective = forehandBowls.filter(b => isEffective(b.result)).length;
                const backhandEffective = backhandBowls.filter(b => isEffective(b.result)).length;
                return {
                  total,
                  percent: Math.round((effective / total) * 100),
                  forehandTotal: forehandBowls.length,
                  forehandPercent: forehandBowls.length > 0 ? Math.round((forehandEffective / forehandBowls.length) * 100) : 0,
                  backhandTotal: backhandBowls.length,
                  backhandPercent: backhandBowls.length > 0 ? Math.round((backhandEffective / backhandBowls.length) * 100) : 0,
                };
              };
              const shortStats = calcLengthStats('short');
              const mediumStats = calcLengthStats('medium');
              const longStats = calcLengthStats('long');
              const hasLengthData = shortStats.total > 0 || mediumStats.total > 0 || longStats.total > 0;
              
              return hasLengthData ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Jack Length Analysis</CardTitle>
                    <p className="text-xs text-muted-foreground">Effectiveness by jack distance</p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Length</TableHead>
                          <TableHead className="text-center text-xs">All</TableHead>
                          <TableHead className="text-center text-xs">FH</TableHead>
                          <TableHead className="text-center text-xs">BH</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { label: 'Short', stats: shortStats },
                          { label: 'Medium', stats: mediumStats },
                          { label: 'Long', stats: longStats },
                        ].map(({ label, stats }) => (
                          <TableRow key={label}>
                            <TableCell className="font-medium text-xs">{label}</TableCell>
                            <TableCell className="text-center">
                              {stats.total > 0 ? (
                                <span className={cn("font-bold", stats.percent >= 50 ? "text-primary" : "")}>
                                  {stats.percent}%
                                </span>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {stats.forehandTotal > 0 ? (
                                <span className={cn("font-bold", stats.forehandPercent >= 50 ? "text-primary" : "")}>
                                  {stats.forehandPercent}%
                                </span>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {stats.backhandTotal > 0 ? (
                                <span className={cn("font-bold", stats.backhandPercent >= 50 ? "text-primary" : "")}>
                                  {stats.backhandPercent}%
                                </span>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : null;
            })()}

            {/* Ends Summary Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ends Summary</CardTitle>
              </CardHeader>
              <CardContent className="px-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs px-1 w-8">#</TableHead>
                      <TableHead className="text-xs px-1">Len</TableHead>
                      <TableHead className="text-xs px-1">B1</TableHead>
                      <TableHead className="text-xs px-1">B2</TableHead>
                      <TableHead className="text-xs px-1 text-right">Scr</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEndsIncludingCurrent.map((end) => (
                      <TableRow key={end.id}>
                        <TableCell className="font-medium text-xs px-1">{end.endNumber}</TableCell>
                        <TableCell className="text-xs px-1">{end.length?.slice(0,3)}</TableCell>
                        <TableCell className="text-xs px-1">
                          {end.bowls?.[0] ? (
                            <span className={cn("font-bold", getResultColorClass(end.bowls[0].result))}>
                              {shortenResult(end.bowls[0].result)}
                              <span className="text-muted-foreground text-[10px] ml-0.5 font-normal">
                                {end.bowls[0].hand === 'Forehand' ? 'F' : 'B'}
                              </span>
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs px-1">
                          {end.bowls?.[1] ? (
                            <span className={cn("font-bold", getResultColorClass(end.bowls[1].result))}>
                              {shortenResult(end.bowls[1].result)}
                              <span className="text-muted-foreground text-[10px] ml-0.5 font-normal">
                                {end.bowls[1].hand === 'Forehand' ? 'F' : 'B'}
                              </span>
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs px-1">
                          {end.isDead ? (
                            <span className="text-muted-foreground">D</span>
                          ) : (
                            <span>
                              <span className="text-primary font-medium">{end.scoreFor}</span>
                              <span className="text-muted-foreground">-</span>
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

      {/* Bowl Edit Dialog */}
      <Dialog open={!!editingBowl} onOpenChange={(open) => !open && closeEditBowl()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Bowl {editingBowl?.bowlNumber}</DialogTitle>
            <DialogDescription>Tap a cell to update where your bowl landed.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="flex bg-secondary p-1 rounded-md">
                <button 
                  type="button"
                  className={cn("px-3 py-1 rounded text-sm transition-all", editHand === "Forehand" ? "bg-white shadow text-primary font-medium" : "text-muted-foreground")}
                  onClick={() => setEditHand("Forehand")}
                  data-testid="button-edit-hand-forehand"
                >
                  Forehand
                </button>
                <button 
                  type="button"
                  className={cn("px-3 py-1 rounded text-sm transition-all", editHand === "Backhand" ? "bg-white shadow text-primary font-medium" : "text-muted-foreground")}
                  onClick={() => setEditHand("Backhand")}
                  data-testid="button-edit-hand-backhand"
                >
                  Backhand
                </button>
              </div>
            </div>

            <div className="grid grid-cols-9 gap-0.5">
              {Array.from({ length: 9 }, (_, row) =>
                Array.from({ length: 9 }, (_, col) => (
                  <EditGridCell9x9 key={`edit-${row}-${col}`} r={row} c={col} />
                ))
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={closeEditBowl}>
              Cancel
            </Button>
            <Button 
              onClick={saveEditedBowl}
              disabled={!editGridSelection || updateBowl.isPending}
              data-testid="button-save-edit-bowl"
            >
              {updateBowl.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
