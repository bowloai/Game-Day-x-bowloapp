import { useCreateGame } from "@/lib/hooks";
import { useLocation } from "wouter";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  category: z.enum(["game", "drill"] as const),
  opponent: z.string().min(1, "This field is required"),
  venue: z.string().min(2, "Venue is required"),
  surface: z.enum(["Grass", "Plastic", "Carpet"] as const),
  rink: z.string().min(1, "Rink number is required"),
  type: z.enum(["Practice", "Tournament", "Pennant", "The Phantom"] as const),
  gameEndType: z.enum(["ends", "score"] as const),
  totalEnds: z.coerce.number().min(1, "Must have at least 1 end").optional().nullable(),
  targetScore: z.coerce.number().min(1, "Target score must be at least 1").optional().nullable(),
  gameFormat: z.enum(["singles", "pairs", "triples", "fours"] as const),
  pairsType: z.enum(["3_bowl", "2_4_2", "walking"] as const).optional().nullable(),
  position: z.string().optional().nullable(),
  bowlsPerEnd: z.coerce.number().min(1, "Must have at least 1 bowl").max(4, "Maximum 4 bowls per end"),
  ourMat: z.boolean(),
  trackOpponent: z.boolean(),
}).refine((data) => {
  if (data.gameEndType === "ends") {
    return data.totalEnds && data.totalEnds >= 1;
  }
  return true;
}, { message: "Total ends is required for ends-based games", path: ["totalEnds"] })
.refine((data) => {
  if (data.gameEndType === "score") {
    return data.targetScore && data.targetScore >= 1;
  }
  return true;
}, { message: "Target score is required for score-based games", path: ["targetScore"] });

type FormValues = z.infer<typeof formSchema>;

const getPositionOptions = (gameFormat: string, pairsType?: string | null) => {
  switch (gameFormat) {
    case "singles":
      return [];
    case "pairs":
      if (pairsType === "2_4_2") return [];
      if (pairsType === "walking") return ["Lead & Third", "Second & Skip"];
      return ["Lead", "Second", "Third", "Skip"];
    case "triples":
      return ["Lead", "Second", "Skip"];
    case "fours":
    default:
      return ["Lead", "Second", "Third", "Skip"];
  }
};

const getBowlsPerEnd = (gameFormat: string, pairsType?: string | null) => {
  switch (gameFormat) {
    case "singles":
      return 4;
    case "pairs":
      if (pairsType === "3_bowl") return 3;
      return 4;
    case "triples":
      return 2;
    case "fours":
    default:
      return 2;
  }
};

export default function GameSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createGame = useCreateGame();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "game",
      opponent: "",
      venue: "",
      surface: "Grass",
      rink: "",
      type: "Pennant",
      gameEndType: "ends",
      totalEnds: 21,
      targetScore: 25,
      gameFormat: "fours",
      pairsType: null,
      position: "Lead",
      bowlsPerEnd: 2,
      ourMat: true,
      trackOpponent: false,
    },
  });

  const category = useWatch({ control: form.control, name: "category" });
  const gameFormat = useWatch({ control: form.control, name: "gameFormat" });
  const pairsType = useWatch({ control: form.control, name: "pairsType" });
  const gameEndType = useWatch({ control: form.control, name: "gameEndType" });

  const isDrill = category === "drill";
  const positionOptions = getPositionOptions(gameFormat, pairsType);
  const showPosition = !isDrill && positionOptions.length > 0;
  const showPairsType = !isDrill && gameFormat === "pairs";

  useEffect(() => {
    if (isDrill) {
      form.setValue("type", "The Phantom");
      form.setValue("bowlsPerEnd", 4);
      form.setValue("gameFormat", "singles");
      form.setValue("position", null);
      form.setValue("trackOpponent", false);
      form.setValue("rink", "1");
      form.setValue("gameEndType", "ends");
      if (!form.getValues("totalEnds")) {
        form.setValue("totalEnds", 10);
      }
    } else {
      // Switching back to Game — reset any drill-only values
      if (form.getValues("type") === "The Phantom") {
        form.setValue("type", "Pennant");
      }
    }
  }, [isDrill, form]);

  useEffect(() => {
    if (isDrill) return;
    if (gameFormat !== "pairs") {
      form.setValue("pairsType", null);
    }
    if (!showPosition) {
      form.setValue("position", null);
    } else if (positionOptions.length > 0 && !positionOptions.includes(form.getValues("position") || "")) {
      form.setValue("position", positionOptions[0]);
    }
    const defaultBowls = getBowlsPerEnd(gameFormat, pairsType);
    form.setValue("bowlsPerEnd", defaultBowls);
  }, [gameFormat, pairsType, form, showPosition, positionOptions, isDrill]);

  function onSubmit(values: FormValues) {
    createGame.mutate(
      {
        ...values,
        status: "IN_PROGRESS",
        position: values.position || null,
        pairsType: values.pairsType || null,
        totalEnds: values.gameEndType === "ends" ? values.totalEnds : null,
        targetScore: values.gameEndType === "score" ? values.targetScore : null,
      },
      {
        onSuccess: (game) => {
          const desc = isDrill
            ? `The Phantom drill is ready. Good luck!`
            : `Ready to start vs ${game.opponent}`;
          toast({ title: isDrill ? "Drill created" : "Game created", description: desc });
          setLocation(`/play/${game.id}`);
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Error", description: error.message });
        },
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <Button
        variant="ghost"
        onClick={() => setLocation("/")}
        className="gap-2 pl-0 hover:pl-2 transition-all"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-primary">
            {isDrill ? "Drill Setup" : "Game Setup"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Category Toggle */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <div className="flex bg-secondary p-1 rounded-lg w-full gap-1" data-testid="toggle-category">
                        <button
                          type="button"
                          onClick={() => field.onChange("game")}
                          className={cn(
                            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                            field.value === "game"
                              ? "bg-white dark:bg-slate-800 shadow text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          data-testid="toggle-category-game"
                        >
                          Game
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange("drill")}
                          className={cn(
                            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                            field.value === "drill"
                              ? "bg-amber-500 shadow text-white"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          data-testid="toggle-category-drill"
                        >
                          Drill
                        </button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Drill info banner */}
              {isDrill && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">The Phantom Drill</p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Deliver 4 bowls per end. Bowls landing in the effective weight zone (within 2 feet of the jack) score you a point. All others score The Phantom. No score entry — results are calculated automatically.
                  </p>
                </div>
              )}

              {/* Game Type — category-filtered options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isDrill ? "Drill Type" : "Game Type"}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isDrill}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isDrill ? (
                            <SelectItem value="The Phantom">The Phantom</SelectItem>
                          ) : (
                            <>
                              <SelectItem value="Practice">Practice</SelectItem>
                              <SelectItem value="Tournament">Tournament</SelectItem>
                              <SelectItem value="Pennant">Pennant</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isDrill && (
                  <FormField
                    control={form.control}
                    name="gameFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-format">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="singles">Singles</SelectItem>
                            <SelectItem value="pairs">Pairs</SelectItem>
                            <SelectItem value="triples">Triples</SelectItem>
                            <SelectItem value="fours">Fours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Pairs Type */}
              {showPairsType && (
                <FormField
                  control={form.control}
                  name="pairsType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pairs Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-pairs-type">
                            <SelectValue placeholder="Select pairs type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3_bowl">3 Bowl (3 bowls)</SelectItem>
                          <SelectItem value="2_4_2">2-4-2 (4 bowls)</SelectItem>
                          <SelectItem value="walking">Walking (4 bowls)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Bowls per end — only shown for games */}
              {!isDrill && (
                <FormField
                  control={form.control}
                  name="bowlsPerEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bowls Per End</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={4} {...field} data-testid="input-bowls-per-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="opponent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isDrill ? "Session Name" : "Opponent"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={isDrill ? "e.g. Morning Session" : "Team or Player Name"}
                          {...field}
                          data-testid="input-opponent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue</FormLabel>
                      <FormControl>
                        <Input placeholder="Club Name" {...field} data-testid="input-venue" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="surface"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surface</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-surface">
                            <SelectValue placeholder="Select surface" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Grass">Grass</SelectItem>
                          <SelectItem value="Plastic">Plastic</SelectItem>
                          <SelectItem value="Carpet">Carpet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rink — hidden for drills */}
                {!isDrill && (
                  <FormField
                    control={form.control}
                    name="rink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rink Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 4" {...field} data-testid="input-rink" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Ends/Score config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="gameEndType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isDrill ? "Drill Ends When" : "Game Ends When"}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isDrill}>
                        <FormControl>
                          <SelectTrigger data-testid="select-game-end-type">
                            <SelectValue placeholder="Select end condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ends">Total Ends Played</SelectItem>
                          {!isDrill && <SelectItem value="score">First to Target Score</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {gameEndType === "ends" ? (
                  <FormField
                    control={form.control}
                    name="totalEnds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Ends</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? ""} data-testid="input-total-ends" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="targetScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Score (First to)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? ""} placeholder="e.g. 25" data-testid="input-target-score" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Position — only for games */}
              {showPosition && (
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>My Position</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-position">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {positionOptions.map((pos) => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Our Mat — only for games */}
              {!isDrill && (
                <FormField
                  control={form.control}
                  name="ourMat"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Our Mat (First End)</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Does your team deliver the jack on the first end?
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-our-mat" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {/* Track Opponent — only for games */}
              {!isDrill && (
                <FormField
                  control={form.control}
                  name="trackOpponent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Track Opponent Bowls</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Record your direct opponent's bowls for in-game tactical analysis
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-track-opponent" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className={cn(
                    "w-full",
                    isDrill && "bg-amber-500 hover:bg-amber-600 text-white"
                  )}
                  disabled={createGame.isPending}
                  data-testid="button-start-game"
                >
                  {createGame.isPending ? "Creating..." : isDrill ? "Start Drill" : "Start Game"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
