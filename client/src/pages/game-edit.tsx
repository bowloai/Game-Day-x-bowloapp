import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGameFull, useUpdateEnd, useUpdateBowl } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Save, Check, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Bowl, End } from "@shared/schema";

const RESULT_LABELS: Record<string, string> = {
  "SHORT_NARROW": "Short Narrow",
  "SHORT": "Short",
  "SHORT_WIDE": "Short Wide",
  "NARROW": "Narrow",
  "GOOD": "Effective",
  "Effective": "Effective",
  "WIDE": "Wide",
  "LONG_NARROW": "Long Narrow",
  "LONG": "Long",
  "LONG_WIDE": "Long Wide",
  "Short": "Short",
  "Short & Narrow": "Short Narrow",
  "Short & Wide": "Short Wide",
  "Heavy": "Heavy",
  "Heavy & Narrow": "Heavy Narrow",
  "Heavy & Wide": "Heavy Wide",
  "Narrow": "Narrow",
  "Wide": "Wide",
};

const getResultLabel = (result: string) => {
  return RESULT_LABELS[result] || result;
};

const getResultColor = (result: string) => {
  if (result === "GOOD" || result === "Effective") return "bg-green-500 text-white";
  if (result.includes("NARROW") || result.includes("WIDE") || result.includes("Narrow") || result.includes("Wide")) return "bg-yellow-500 text-white";
  return "bg-orange-500 text-white";
};

type BowlWithEnd = Bowl & { endId: string };

const getZoneColor = (row: number, col: number) => {
  const isEffective = row >= 3 && row <= 5 && col >= 3 && col <= 5;
  if (isEffective) return "bg-green-100 dark:bg-green-950/40 border-green-400";
  
  if (row <= 2) {
    if (col <= 2) return "bg-red-50 dark:bg-red-950/20 border-red-200";
    if (col >= 6) return "bg-red-50 dark:bg-red-950/20 border-red-200";
    return "bg-red-100 dark:bg-red-950/30 border-red-300";
  }
  
  if (row >= 6) {
    if (col <= 2) return "bg-slate-50 dark:bg-slate-950/20 border-slate-200";
    if (col >= 6) return "bg-slate-50 dark:bg-slate-950/20 border-slate-200";
    return "bg-slate-100 dark:bg-slate-950/30 border-slate-300";
  }
  
  if (col <= 2) return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200";
  if (col >= 6) return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200";
  
  return "bg-background border-border";
};

const mapResultToGrid = (result: string, hand: string): { row: number; col: number } => {
  const normalized = result.toUpperCase().replace(/ & /g, '_').replace(/ /g, '_');
  
  let row = 4;
  let col = 4;
  
  if (normalized.includes('SHORT')) row = 1;
  else if (normalized.includes('HEAVY') || normalized.includes('LONG')) row = 7;
  
  const isForward = hand === 'FOREHAND' || hand === 'Forehand';
  if (normalized.includes('NARROW')) {
    col = isForward ? 7 : 1;
  } else if (normalized.includes('WIDE')) {
    col = isForward ? 1 : 7;
  }
  
  return { row, col };
};

const calculateResultFromGrid = (row: number, col: number, hand: string): string => {
  const isShort = row <= 2;
  const isHeavy = row >= 6;
  const isLeft = col <= 2;
  const isRight = col >= 6;
  const isCenterLength = row >= 3 && row <= 5;
  const isCenterLine = col >= 3 && col <= 5;

  let lengthStr = '';
  if (isShort) lengthStr = 'Short';
  if (isHeavy) lengthStr = 'Heavy';

  let lineStr = '';
  const isForward = hand === 'FOREHAND' || hand === 'Forehand';
  if (isLeft) {
    lineStr = isForward ? 'Wide' : 'Narrow';
  } else if (isRight) {
    lineStr = isForward ? 'Narrow' : 'Wide';
  }

  if (isCenterLength && isCenterLine) {
    return 'Effective';
  } else if (lengthStr && lineStr) {
    return `${lengthStr} & ${lineStr}`;
  } else if (lengthStr) {
    return lengthStr;
  } else if (lineStr) {
    return lineStr;
  }
  return 'Effective';
};

export default function GameEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: game, isLoading } = useGameFull(id);
  const updateEnd = useUpdateEnd();
  const updateBowl = useUpdateBowl();
  const { toast } = useToast();

  const [openEnds, setOpenEnds] = useState<Set<string>>(new Set());
  const [editingBowl, setEditingBowl] = useState<BowlWithEnd | null>(null);
  const [editingEndScores, setEditingEndScores] = useState<{ endId: string; scoreFor: number; scoreAgainst: number } | null>(null);
  const [gridSelection, setGridSelection] = useState<{ row: number; col: number } | null>(null);
  const [editHand, setEditHand] = useState<string>("FOREHAND");

  useEffect(() => {
    if (editingBowl) {
      setEditHand(editingBowl.hand || "FOREHAND");
      if (editingBowl.gridRow !== null && editingBowl.gridRow !== undefined && 
          editingBowl.gridCol !== null && editingBowl.gridCol !== undefined) {
        setGridSelection({ row: editingBowl.gridRow, col: editingBowl.gridCol });
      } else {
        const mapped = mapResultToGrid(editingBowl.result || "Effective", editingBowl.hand || "FOREHAND");
        setGridSelection(mapped);
      }
    } else {
      setGridSelection(null);
    }
  }, [editingBowl]);

  const getEditZoneLabel = (row: number, col: number): string => {
    const isZoneCenter = (row % 3 === 1) && (col % 3 === 1);
    if (!isZoneCenter) return "";
    
    const zoneRow = Math.floor(row / 3);
    const zoneCol = Math.floor(col / 3);
    
    // Use single letters for labels
    const isForward = editHand === 'FOREHAND' || editHand === 'Forehand';
    const leftLabel = isForward ? 'W' : 'N';
    const rightLabel = isForward ? 'N' : 'W';
    
    if (zoneRow === 0 && zoneCol === 1) return "S";
    if (zoneRow === 2 && zoneCol === 1) return "H";
    if (zoneRow === 1 && zoneCol === 0) return leftLabel;
    if (zoneRow === 1 && zoneCol === 1) return "✓";
    if (zoneRow === 1 && zoneCol === 2) return rightLabel;
    
    return "";
  };

  const EditGridCell9x9 = ({ r, c }: { r: number, c: number }) => {
    const isSelected = gridSelection?.row === r && gridSelection?.col === c;
    const label = getEditZoneLabel(r, c);
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

  const toggleEnd = (endId: string) => {
    setOpenEnds(prev => {
      const next = new Set(prev);
      if (next.has(endId)) {
        next.delete(endId);
      } else {
        next.add(endId);
      }
      return next;
    });
  };

  const handleSaveBowl = async () => {
    if (!editingBowl || !id || !gridSelection) return;
    
    const result = calculateResultFromGrid(gridSelection.row, gridSelection.col, editHand);
    
    try {
      await updateBowl.mutateAsync({
        id: editingBowl.id,
        gameId: id,
        updates: {
          hand: editHand,
          result: result,
          gridRow: gridSelection.row,
          gridCol: gridSelection.col,
        },
      });
      toast({ title: "Bowl updated" });
      setEditingBowl(null);
      setGridSelection(null);
    } catch (error) {
      toast({ title: "Failed to update bowl", variant: "destructive" });
    }
  };

  const handleSaveEndScores = async () => {
    if (!editingEndScores || !id) return;
    
    try {
      await updateEnd.mutateAsync({
        id: editingEndScores.endId,
        gameId: id,
        updates: {
          scoreFor: editingEndScores.scoreFor,
          scoreAgainst: editingEndScores.scoreAgainst,
        },
      });
      toast({ title: "End scores updated" });
      setEditingEndScores(null);
    } catch (error) {
      toast({ title: "Failed to update scores", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!game) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Game not found.</p>
        <Button onClick={() => setLocation("/games")} className="mt-4">
          Back to Games
        </Button>
      </div>
    );
  }

  const sortedEnds = [...(game.ends || [])].sort((a, b) => a.endNumber - b.endNumber);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/games")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-primary" data-testid="heading-edit-game">Edit Game</h1>
          <p className="text-muted-foreground text-sm">vs {game.opponent}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Date:</span>{" "}
              <span className="font-medium">{format(new Date(game.createdAt), "MMM d, yyyy")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Venue:</span>{" "}
              <span className="font-medium">{game.venue}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Surface:</span>{" "}
              <span className="font-medium">{game.surface}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Position:</span>{" "}
              <span className="font-medium">{game.position}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className={cn(
                "font-medium",
                game.status === "COMPLETED" ? "text-green-600" : "text-yellow-600"
              )}>
                {game.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Ends & Bowls</h2>
        
        {sortedEnds.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No ends recorded yet.
            </CardContent>
          </Card>
        ) : (
          sortedEnds.map((end) => (
            <Collapsible
              key={end.id}
              open={openEnds.has(end.id)}
              onOpenChange={() => toggleEnd(end.id)}
            >
              <Card className={cn(end.isDead && "opacity-60")}>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {openEnds.has(end.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <CardTitle className="text-base">End {end.endNumber}</CardTitle>
                        {end.isDead && (
                          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded">Dead</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 font-mono">
                          <span className={cn(
                            "font-bold",
                            (end.scoreFor || 0) > (end.scoreAgainst || 0) ? "text-green-600" : ""
                          )}>
                            {end.scoreFor || 0}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className={cn(
                            "font-bold",
                            (end.scoreAgainst || 0) > (end.scoreFor || 0) ? "text-green-600" : ""
                          )}>
                            {end.scoreAgainst || 0}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEndScores({
                              endId: end.id,
                              scoreFor: end.scoreFor || 0,
                              scoreAgainst: end.scoreAgainst || 0,
                            });
                          }}
                          data-testid={`button-edit-end-score-${end.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4">
                    <div className="space-y-2">
                      {end.bowls && end.bowls.length > 0 ? (
                        end.bowls
                          .sort((a, b) => a.bowlNumber - b.bowlNumber)
                          .map((bowl) => (
                            <div
                              key={bowl.id}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                              data-testid={`bowl-${bowl.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium w-16">Bowl {bowl.bowlNumber}</span>
                                <span className={cn(
                                  "text-xs px-2 py-1 rounded",
                                  bowl.hand === "FOREHAND" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                )}>
                                  {bowl.hand === "FOREHAND" ? "FH" : "BH"}
                                </span>
                                <span className={cn(
                                  "text-xs px-2 py-1 rounded",
                                  getResultColor(bowl.result)
                                )}>
                                  {getResultLabel(bowl.result)}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingBowl({ ...bowl, endId: end.id })}
                                data-testid={`button-edit-bowl-${bowl.id}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">No bowls recorded</p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>

      <div className="flex justify-center pt-4">
        <Button onClick={() => setLocation("/games")} data-testid="button-done">
          <Check className="h-4 w-4 mr-2" />
          Done Editing
        </Button>
      </div>

      {/* Edit Bowl Dialog */}
      <Dialog open={!!editingBowl} onOpenChange={() => setEditingBowl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bowl {editingBowl?.bowlNumber}</DialogTitle>
          </DialogHeader>
          
          {editingBowl && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Hand</Label>
                <div className="flex bg-secondary p-1 rounded-md">
                  <button 
                    type="button"
                    className={cn(
                      "px-4 py-2 rounded text-sm transition-all",
                      editHand === "FOREHAND" 
                        ? "bg-white shadow text-primary font-medium" 
                        : "text-muted-foreground"
                    )}
                    onClick={() => setEditHand("FOREHAND")}
                    data-testid="button-hand-forehand"
                  >
                    Forehand
                  </button>
                  <button 
                    type="button"
                    className={cn(
                      "px-4 py-2 rounded text-sm transition-all",
                      editHand === "BACKHAND" 
                        ? "bg-white shadow text-primary font-medium" 
                        : "text-muted-foreground"
                    )}
                    onClick={() => setEditHand("BACKHAND")}
                    data-testid="button-hand-backhand"
                  >
                    Backhand
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Where did the bowl land?</Label>
                <div className="grid grid-cols-9 gap-0.5">
                  {Array.from({ length: 9 }, (_, row) =>
                    Array.from({ length: 9 }, (_, col) => (
                      <EditGridCell9x9 key={`edit-${row}-${col}`} r={row} c={col} />
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Tap a cell to mark where your bowl landed. Each cell = 1 foot.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBowl(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBowl} disabled={updateBowl.isPending} data-testid="button-save-bowl">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit End Scores Dialog */}
      <Dialog open={!!editingEndScores} onOpenChange={() => setEditingEndScores(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit End Scores</DialogTitle>
          </DialogHeader>
          
          {editingEndScores && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scoreFor">Your Score</Label>
                <Input
                  id="scoreFor"
                  type="number"
                  min="0"
                  value={editingEndScores.scoreFor}
                  onChange={(e) => setEditingEndScores({
                    ...editingEndScores,
                    scoreFor: parseInt(e.target.value) || 0,
                  })}
                  data-testid="input-score-for"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scoreAgainst">Opponent Score</Label>
                <Input
                  id="scoreAgainst"
                  type="number"
                  min="0"
                  value={editingEndScores.scoreAgainst}
                  onChange={(e) => setEditingEndScores({
                    ...editingEndScores,
                    scoreAgainst: parseInt(e.target.value) || 0,
                  })}
                  data-testid="input-score-against"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEndScores(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEndScores} disabled={updateEnd.isPending} data-testid="button-save-scores">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
