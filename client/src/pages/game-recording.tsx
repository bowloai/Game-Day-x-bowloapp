import { useGameStore, BowlResult, Hand } from "@/lib/game-store";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, AlertTriangle, Flag, ArrowLeft } from "lucide-react";

export default function GameRecording() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { games, addEnd, addBowl, updateEnd, finishGame } = useGameStore();
  const game = games.find(g => g.id === id);

  // Local state for the current end being recorded
  const [currentEndNum, setCurrentEndNum] = useState(1);
  const [activeBowl, setActiveBowl] = useState<1 | 2>(1);
  
  // Bowl inputs
  const [hand, setHand] = useState<Hand>("Forehand");
  const [gridSelection, setGridSelection] = useState<{row: 0|1|2, col: 0|1|2} | null>(null);
  
  // End inputs
  const [jackEffective, setJackEffective] = useState(true);
  const [endLength, setEndLength] = useState(21); // Meters? Or steps? Default 21
  const [scoreFor, setScoreFor] = useState(0);
  const [scoreAgainst, setScoreAgainst] = useState(0);
  const [isDead, setIsDead] = useState(false);

  useEffect(() => {
    if (game) {
      const nextEnd = game.ends.length + 1;
      setCurrentEndNum(nextEnd);
      // Reset for new end
      setActiveBowl(1);
      setHand("Forehand");
      setGridSelection(null);
      setJackEffective(true);
      setScoreFor(0);
      setScoreAgainst(0);
      setIsDead(false);
    }
  }, [game, game?.ends.length]);

  if (!game) return <div>Game not found</div>;

  const handleBowlSubmit = () => {
    if (!gridSelection) return;

    // Determine result string based on grid
    let result: BowlResult = 'Effective';
    const { row, col } = gridSelection;

    // Grid logic:
    // Row 0: Short
    // Row 1: Perfect Length
    // Row 2: Heavy
    
    // Col 0: Left
    // Col 1: Center
    // Col 2: Right

    // Logic from prompt:
    // Top row = Short, Bottom = Heavy
    // Forehand + Left col = Wide
    // Forehand + Right col = Narrow
    // Backhand + Left col = Narrow
    // Backhand + Right col = Wide
    
    const isShort = row === 0;
    const isHeavy = row === 2;
    const isCenterLength = row === 1;

    const isLeft = col === 0;
    const isRight = col === 2;
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
      result = 'Effective';
    } else if (lengthStr && lineStr) {
      result = `${lengthStr} & ${lineStr}` as BowlResult;
    } else if (lengthStr) {
      result = lengthStr as BowlResult;
    } else if (lineStr) {
      result = lineStr as BowlResult;
    } else {
      // Should be covered by Effective, but fallback
      result = 'Effective'; 
    }

    // Ensure end exists first
    const currentEnd = game.ends.find(e => e.endNumber === currentEndNum);
    if (!currentEnd) {
      addEnd(game.id, currentEndNum);
      // We need to wait for state update? In a real app yes. 
      // Here we might hit a race condition if we don't check.
      // But since addEnd is synchronous in our mock store (setState), it might be queued.
      // Actually, let's just assume we need to pass the end ID or just rely on game logic.
      // Simpler: We will rely on the store finding the end by number if ID isn't ready, 
      // but our store addBowl takes endId. 
      // Let's change store slightly or just find it.
      // WORKAROUND: We can't easily get the ID of the just-created end in this render cycle.
      // So we will just create the end object manually here and pass it if needed?
      // No, let's just trigger addEnd at the start of the component if it doesn't exist?
      // Better: Trigger addEnd when component mounts for this end number.
    }
    
    // We need the end ID. 
    // Let's simplify: When we start recording bowl 1, we ensure the end exists.
  };

  // Better approach: Create end immediately when entering this screen if it doesn't exist
  const ensureEndExists = () => {
    const exists = game.ends.find(e => e.endNumber === currentEndNum);
    if (!exists) {
      addEnd(game.id, currentEndNum);
    }
    return game.ends.find(e => e.endNumber === currentEndNum); // might still be undefined until re-render
  };

  const saveBowl = () => {
    if (!gridSelection) return;

    // 1. Calculate Result
    let result: BowlResult = 'Effective';
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
      result = 'Effective';
    } else if (lengthStr && lineStr) {
      result = `${lengthStr} & ${lineStr}` as BowlResult;
    } else if (lengthStr) {
      result = lengthStr as BowlResult;
    } else if (lineStr) {
      result = lineStr as BowlResult;
    }

    // 2. Ensure End
    // We need to force add the end if it's missing. 
    // Since we can't await state, we'll rely on a "getOrCreateEnd" pattern logic or similar.
    // But for this prototype, let's just call addEnd and then assume the next render has it, 
    // OR assume the end was created at mount.
    // Let's fix the race condition by just finding the end by number in the store actions?
    // No, store actions require ID. 
    // Let's try to find the end ID from the games list.
    let end = game.ends.find(e => e.endNumber === currentEndNum);
    let endId = end?.id;

    if (!endId) {
       // This is tricky with async state. 
       // Let's alert user "Starting End..." and return?
       addEnd(game.id, currentEndNum);
       // We have to wait for re-render. 
       // Let's just create the end on mount.
       return; 
    }

    addBowl(game.id, endId, {
      bowlNumber: activeBowl,
      hand,
      result
    });

    // Update End Metadata (Jack, Length) on first bowl save
    if (activeBowl === 1) {
      updateEnd(game.id, endId, {
        jackEffective: game.position === 'Lead' ? jackEffective : undefined,
        length: endLength
      });
      setActiveBowl(2);
      setGridSelection(null);
    } else {
      // Finished 2 bowls
      // Now we stay on screen to enter score
    }
  };

  const finishEnd = () => {
    const end = game.ends.find(e => e.endNumber === currentEndNum);
    if (end) {
      updateEnd(game.id, end.id, {
        scoreFor: isDead ? 0 : scoreFor,
        scoreAgainst: isDead ? 0 : scoreAgainst,
        isDead,
        isCompleted: true
      });
    }
    // Next end logic handled by useEffect
  };

  // Ensure end exists on mount/update
  useEffect(() => {
    if (game && !game.ends.find(e => e.endNumber === currentEndNum)) {
      addEnd(game.id, currentEndNum);
    }
  }, [currentEndNum, game]);

  const currentEnd = game.ends.find(e => e.endNumber === currentEndNum);
  const bowl1 = currentEnd?.bowls.find(b => b.bowlNumber === 1);
  const bowl2 = currentEnd?.bowls.find(b => b.bowlNumber === 2);

  const GridCell = ({ r, c, label }: { r: 0|1|2, c: 0|1|2, label?: string }) => {
    const isSelected = gridSelection?.row === r && gridSelection?.col === c;
    return (
      <button
        onClick={() => setGridSelection({ row: r, col: c })}
        className={cn(
          "h-20 w-full border rounded-lg flex items-center justify-center transition-all relative font-medium text-sm",
          isSelected 
            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" 
            : "bg-background hover:bg-secondary",
          r === 1 && c === 1 ? "bg-accent/20 border-accent text-accent-foreground" : ""
        )}
      >
        {label}
        {isSelected && <CheckCircle2 className="absolute top-1 right-1 w-4 h-4" />}
      </button>
    );
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Exit
        </Button>
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold">End {currentEndNum}</h2>
          <p className="text-xs text-muted-foreground">{game.venue} • {game.surface}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => { finishGame(game.id); setLocation("/"); }}>
          Finish Game
        </Button>
      </div>

      {/* End Settings (Only visible before bowl 1 or if editing) */}
      {!bowl1 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {game.position === 'Lead' && (
               <div className="flex items-center justify-between">
                 <Label className="text-base">Jack Delivery Effective?</Label>
                 <Switch checked={jackEffective} onCheckedChange={setJackEffective} />
               </div>
            )}
            <div className="space-y-2">
              <Label>End Length (meters)</Label>
              <Input 
                type="number" 
                value={endLength} 
                onChange={(e) => setEndLength(Number(e.target.value))} 
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bowl Recording Area */}
      {(!bowl1 || !bowl2) ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Bowl {activeBowl} of 2
            </h3>
            <div className="flex bg-secondary p-1 rounded-md">
              <button 
                className={cn("px-3 py-1 rounded text-sm transition-all", hand === "Forehand" ? "bg-white shadow text-primary font-medium" : "text-muted-foreground")}
                onClick={() => setHand("Forehand")}
              >
                Forehand
              </button>
              <button 
                 className={cn("px-3 py-1 rounded text-sm transition-all", hand === "Backhand" ? "bg-white shadow text-primary font-medium" : "text-muted-foreground")}
                 onClick={() => setHand("Backhand")}
              >
                Backhand
              </button>
            </div>
          </div>

          {/* The 3x3 Grid */}
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
            disabled={!gridSelection}
            onClick={saveBowl}
          >
            Save Bowl {activeBowl}
          </Button>
        </div>
      ) : (
        /* Score Recording (After 2 bowls) */
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
                  <Switch id="dead-end" checked={isDead} onCheckedChange={setIsDead} />
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
                    />
                  </div>
                </div>
              )}

              <Button size="lg" className="w-full" onClick={finishEnd}>
                Confirm & Start Next End
              </Button>
            </CardContent>
          </Card>

          {/* Summary of just bowled */}
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
