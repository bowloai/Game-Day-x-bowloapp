import { useGameFull, useCreateEnd, useCreateBowl, useUpdateEnd, useUpdateGame } from "@/lib/hooks";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, ArrowLeft } from "lucide-react";
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

export default function GameRecording() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: game, isLoading } = useGameFull(id);
  const createEnd = useCreateEnd();
  const createBowl = useCreateBowl();
  const updateEnd = useUpdateEnd();
  const updateGame = useUpdateGame();

  const [activeBowl, setActiveBowl] = useState<1 | 2>(1);
  const [hand, setHand] = useState<"Forehand" | "Backhand">("Forehand");
  const [gridSelection, setGridSelection] = useState<{row: 0|1|2, col: 0|1|2} | null>(null);
  const [jackEffective, setJackEffective] = useState(true);
  const [endLength, setEndLength] = useState(21);
  const [scoreFor, setScoreFor] = useState(0);
  const [scoreAgainst, setScoreAgainst] = useState(0);
  const [isDead, setIsDead] = useState(false);

  const currentEndNum = (game?.ends?.length || 0) + 1;
  const currentEnd = game?.ends?.find(e => !e.isCompleted) || game?.ends?.[game?.ends?.length - 1];
  const bowl1 = currentEnd?.bowls?.find(b => b.bowlNumber === 1);
  const bowl2 = currentEnd?.bowls?.find(b => b.bowlNumber === 2);

  useEffect(() => {
    setActiveBowl(bowl1 ? (bowl2 ? 1 : 2) : 1);
    setGridSelection(null);
    if (currentEnd && !bowl1 && !bowl2) {
      setScoreFor(0);
      setScoreAgainst(0);
      setIsDead(false);
    }
  }, [currentEnd?.id, bowl1, bowl2]);

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

  const handleCreateOrContinueEnd = async () => {
    if (!currentEnd || currentEnd.isCompleted) {
      createEnd.mutate({
        gameId: game.id,
        endNumber: currentEndNum,
        length: endLength,
        jackEffective: game.position === 'Lead' ? jackEffective : undefined,
        scoreFor: 0,
        scoreAgainst: 0,
        isDead: false,
        isCompleted: false,
      });
    }
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
          toast({ title: "End complete" });
          setScoreFor(0);
          setScoreAgainst(0);
          setIsDead(false);
          setJackEffective(true);
          setEndLength(21);
        },
      }
    );
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

  const needsEndCreation = !currentEnd || currentEnd.isCompleted;
  const showBowlRecording = currentEnd && !currentEnd.isCompleted && (!bowl1 || !bowl2);
  const showScoreEntry = currentEnd && !currentEnd.isCompleted && bowl1 && bowl2;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} data-testid="button-exit">
          <ArrowLeft className="w-4 h-4 mr-1" /> Exit
        </Button>
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold" data-testid="text-end-number">
            End {currentEnd?.isCompleted ? currentEndNum : (currentEnd?.endNumber || currentEndNum)}
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
          Finish Game
        </Button>
      </div>

      {needsEndCreation && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {game.position === 'Lead' && (
              <div className="flex items-center justify-between">
                <Label className="text-base">Jack Delivery Effective?</Label>
                <Switch checked={jackEffective} onCheckedChange={setJackEffective} data-testid="switch-jack" />
              </div>
            )}
            <div className="space-y-2">
              <Label>End Length (meters)</Label>
              <Input 
                type="number" 
                value={endLength} 
                onChange={(e) => setEndLength(Number(e.target.value))}
                data-testid="input-end-length"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleCreateOrContinueEnd}
              disabled={createEnd.isPending}
              data-testid="button-start-end"
            >
              {createEnd.isPending ? "Starting..." : "Start End Recording"}
            </Button>
          </CardContent>
        </Card>
      )}

      {showBowlRecording && (
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

      {showScoreEntry && (
        <div className="space-y-6 animate-in fade-in">
          <Card className="bg-secondary/20 border-primary/20">
            <CardHeader>
              <CardTitle>End Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                <span className="font-medium">End Status</span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="dead-end">Dead End?</Label>
                  <Switch id="dead-end" checked={isDead} onCheckedChange={setIsDead} data-testid="switch-dead-end" />
                </div>
              </div>

              {!isDead && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-center block">Shots For</Label>
                    <Input 
                      type="number" 
                      min={0} max={8} 
                      className="text-center text-2xl h-16"
                      value={scoreFor}
                      onChange={(e) => { setScoreFor(Number(e.target.value)); setScoreAgainst(0); }}
                      data-testid="input-score-for"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-center block">Shots Against</Label>
                    <Input 
                      type="number" 
                      min={0} max={8} 
                      className="text-center text-2xl h-16"
                      value={scoreAgainst}
                      onChange={(e) => { setScoreAgainst(Number(e.target.value)); setScoreFor(0); }}
                      data-testid="input-score-against"
                    />
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
                {updateEnd.isPending ? "Saving..." : "Confirm & Start Next End"}
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="bg-secondary/50 p-3 rounded border">
              <span className="block font-semibold text-foreground">Bowl 1</span>
              {bowl1?.hand} - {bowl1?.result}
            </div>
            <div className="bg-secondary/50 p-3 rounded border">
              <span className="block font-semibold text-foreground">Bowl 2</span>
              {bowl2?.hand} - {bowl2?.result}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
