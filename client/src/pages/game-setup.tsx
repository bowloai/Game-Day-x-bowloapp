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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const formSchema = z.object({
  opponent: z.string().min(2, "Opponent name is required"),
  venue: z.string().min(2, "Venue is required"),
  surface: z.enum(["Grass", "Plastic", "Carpet"] as const),
  rink: z.string().min(1, "Rink number is required"),
  type: z.enum(["Practice", "Tournament", "Pennant"] as const),
  gameEndType: z.enum(["ends", "score"] as const),
  totalEnds: z.coerce.number().optional().nullable(),
  targetScore: z.coerce.number().optional().nullable(),
  gameFormat: z.enum(["singles", "pairs", "triples", "fours"] as const),
  pairsType: z.enum(["3_bowl", "2_4_2", "walking"] as const).optional().nullable(),
  position: z.string().optional().nullable(),
});

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
    },
  });

  const gameFormat = useWatch({ control: form.control, name: "gameFormat" });
  const pairsType = useWatch({ control: form.control, name: "pairsType" });
  const gameEndType = useWatch({ control: form.control, name: "gameEndType" });

  const positionOptions = getPositionOptions(gameFormat, pairsType);
  const showPosition = positionOptions.length > 0;
  const showPairsType = gameFormat === "pairs";

  useEffect(() => {
    if (gameFormat !== "pairs") {
      form.setValue("pairsType", null);
    }
    if (!showPosition) {
      form.setValue("position", null);
    } else if (positionOptions.length > 0 && !positionOptions.includes(form.getValues("position") || "")) {
      form.setValue("position", positionOptions[0]);
    }
  }, [gameFormat, pairsType, form, showPosition, positionOptions]);

  function onSubmit(values: FormValues) {
    const bowlsPerEnd = getBowlsPerEnd(values.gameFormat, values.pairsType);
    createGame.mutate(
      { 
        ...values, 
        bowlsPerEnd,
        status: "IN_PROGRESS",
        position: values.position || null,
        pairsType: values.pairsType || null,
        totalEnds: values.gameEndType === "ends" ? values.totalEnds : null,
        targetScore: values.gameEndType === "score" ? values.targetScore : null,
      },
      {
        onSuccess: (game) => {
          toast({
            title: "Game created",
            description: `Ready to start vs ${game.opponent}`,
          });
          setLocation(`/play/${game.id}`);
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message,
          });
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
          <CardTitle className="text-2xl text-primary">Game Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="opponent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opponent</FormLabel>
                      <FormControl>
                        <Input placeholder="Team or Player Name" {...field} data-testid="input-opponent" />
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="gameEndType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Ends When</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-game-end-type">
                            <SelectValue placeholder="Select end condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ends">Total Ends Played</SelectItem>
                          <SelectItem value="score">First to Target Score</SelectItem>
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
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ""} 
                            data-testid="input-total-ends" 
                          />
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
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ""} 
                            placeholder="e.g. 25"
                            data-testid="input-target-score" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Practice">Practice</SelectItem>
                          <SelectItem value="Tournament">Tournament</SelectItem>
                          <SelectItem value="Pennant">Pennant</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <SelectItem value="singles">Singles (4 bowls)</SelectItem>
                          <SelectItem value="pairs">Pairs</SelectItem>
                          <SelectItem value="triples">Triples (2 bowls)</SelectItem>
                          <SelectItem value="fours">Fours (2 bowls)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showPairsType && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>
              )}

              {!showPairsType && showPosition && (
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

              <div className="pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full" 
                  disabled={createGame.isPending}
                  data-testid="button-start-game"
                >
                  {createGame.isPending ? "Creating..." : "Start Game"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
