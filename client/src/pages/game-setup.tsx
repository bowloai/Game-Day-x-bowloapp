import { useGameStore, GameType, Surface, Position } from "@/lib/game-store";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
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

const formSchema = z.object({
  opponent: z.string().min(2, "Opponent name is required"),
  venue: z.string().min(2, "Venue is required"),
  surface: z.enum(["Grass", "Plastic", "Carpet"] as const),
  rink: z.string().min(1, "Rink number is required"),
  type: z.enum(["Practice", "Tournament", "Pennant"] as const),
  totalEnds: z.coerce.number().min(1, "Must have at least 1 end"),
  position: z.enum(["Lead", "Second", "Third", "Skip"] as const),
});

export default function GameSetup() {
  const [, setLocation] = useLocation();
  const { createGame } = useGameStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      opponent: "",
      venue: "",
      surface: "Grass",
      rink: "",
      type: "Pennant",
      totalEnds: 21,
      position: "Lead",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createGame(values);
    // The store updates activeGameId, but we need to know the ID to navigate?
    // Actually the store sets activeGameId, so we can just find the latest or just redirect to /play/active
    // But createGame doesn't return ID. 
    // Let's just redirect to home, and home will show the "Continue Active Game" button which is safer,
    // OR assume the active game is the one we just created.
    setLocation("/");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <Button variant="ghost" onClick={() => setLocation("/")} className="gap-2 pl-0 hover:pl-2 transition-all">
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
                        <Input placeholder="Team or Player Name" {...field} />
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
                        <Input placeholder="Club Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <FormField
                  control={form.control}
                  name="surface"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surface</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                        <Input placeholder="e.g. 4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalEnds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ends to Play</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          <SelectTrigger>
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
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>My Position</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Lead">Lead</SelectItem>
                          <SelectItem value="Second">Second</SelectItem>
                          <SelectItem value="Third">Third</SelectItem>
                          <SelectItem value="Skip">Skip</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4">
                <Button type="submit" size="lg" className="w-full">Start Game</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
