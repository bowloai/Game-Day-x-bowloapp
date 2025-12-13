import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGameFull, useUpdateEnd, useUpdateBowl } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Save, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Bowl, End } from "@shared/schema";

const RESULT_LABELS: Record<string, string> = {
  "SHORT_NARROW": "Short Narrow",
  "SHORT": "Short",
  "SHORT_WIDE": "Short Wide",
  "NARROW": "Narrow",
  "GOOD": "Effective",
  "WIDE": "Wide",
  "LONG_NARROW": "Long Narrow",
  "LONG": "Long",
  "LONG_WIDE": "Long Wide",
};

const getResultLabel = (result: string) => {
  return RESULT_LABELS[result] || result;
};

const getResultColor = (result: string) => {
  if (result === "GOOD") return "bg-green-500 text-white";
  if (result.includes("NARROW") || result.includes("WIDE")) return "bg-yellow-500 text-white";
  return "bg-orange-500 text-white";
};

type BowlWithEnd = Bowl & { endId: string };

const GridCell = ({ r, c, label, selected, isCenter, onClick }: { 
  r: number; 
  c: number; 
  label?: string; 
  selected: boolean;
  isCenter?: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-16 w-full border rounded-lg flex items-center justify-center transition-all relative font-medium text-sm",
        selected 
          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" 
          : "bg-background hover:bg-secondary",
        isCenter ? "bg-accent/20 border-accent text-accent-foreground" : ""
      )}
      data-testid={`grid-cell-${r}-${c}`}
    >
      {label}
    </button>
  );
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
    if (!editingBowl || !id) return;
    
    try {
      await updateBowl.mutateAsync({
        id: editingBowl.id,
        gameId: id,
        updates: {
          hand: editingBowl.hand,
          result: editingBowl.result,
        },
      });
      toast({ title: "Bowl updated" });
      setEditingBowl(null);
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Bowl {editingBowl?.bowlNumber}</DialogTitle>
          </DialogHeader>
          
          {editingBowl && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label>Hand</Label>
                <div className="flex bg-secondary p-1 rounded-md">
                  <button 
                    type="button"
                    className={cn(
                      "px-4 py-2 rounded text-sm transition-all",
                      editingBowl.hand === "FOREHAND" 
                        ? "bg-white shadow text-primary font-medium" 
                        : "text-muted-foreground"
                    )}
                    onClick={() => setEditingBowl({ ...editingBowl, hand: "FOREHAND" })}
                    data-testid="button-hand-forehand"
                  >
                    Forehand
                  </button>
                  <button 
                    type="button"
                    className={cn(
                      "px-4 py-2 rounded text-sm transition-all",
                      editingBowl.hand === "BACKHAND" 
                        ? "bg-white shadow text-primary font-medium" 
                        : "text-muted-foreground"
                    )}
                    onClick={() => setEditingBowl({ ...editingBowl, hand: "BACKHAND" })}
                    data-testid="button-hand-backhand"
                  >
                    Backhand
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Result</Label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Row 0: Short */}
                  <GridCell 
                    r={0} c={0} 
                    selected={editingBowl.result === "SHORT_NARROW"} 
                    onClick={() => setEditingBowl({ ...editingBowl, result: "SHORT_NARROW" })}
                  />
                  <GridCell 
                    r={0} c={1} 
                    label="Short"
                    selected={editingBowl.result === "SHORT"} 
                    onClick={() => setEditingBowl({ ...editingBowl, result: "SHORT" })}
                  />
                  <GridCell 
                    r={0} c={2} 
                    selected={editingBowl.result === "SHORT_WIDE"} 
                    onClick={() => setEditingBowl({ ...editingBowl, result: "SHORT_WIDE" })}
                  />
                  
                  {/* Row 1: Middle */}
                  <GridCell 
                    r={1} c={0} 
                    label={editingBowl.hand === "FOREHAND" ? "Wide" : "Narrow"}
                    selected={editingBowl.result === "NARROW"} 
                    onClick={() => setEditingBowl({ ...editingBowl, result: "NARROW" })}
                  />
                  <GridCell 
                    r={1} c={1} 
                    label="Effective"
                    isCenter
                    selected={editingBowl.result === "GOOD"} 
                    onClick={() => setEditingBowl({ ...editingBowl, result: "GOOD" })}
                  />
                  <GridCell 
                    r={1} c={2} 
                    label={editingBowl.hand === "FOREHAND" ? "Narrow" : "Wide"}
                    selected={editingBowl.result === "WIDE"} 
                    onClick={() => setEditingBowl({ ...editingBowl, result: "WIDE" })}
                  />
                  
                  {/* Row 2: Long */}
                  <GridCell 
                    r={2} c={0} 
                    selected={editingBowl.result === "LONG_NARROW"} 
                    onClick={() => setEditingBowl({ ...editingBowl, result: "LONG_NARROW" })}
                  />
                  <GridCell 
                    r={2} c={1} 
                    label="Long"
                    selected={editingBowl.result === "LONG"} 
                    onClick={() => setEditingBowl({ ...editingBowl, result: "LONG" })}
                  />
                  <GridCell 
                    r={2} c={2} 
                    selected={editingBowl.result === "LONG_WIDE"} 
                    onClick={() => setEditingBowl({ ...editingBowl, result: "LONG_WIDE" })}
                  />
                </div>
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
