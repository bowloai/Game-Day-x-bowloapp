import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, BarChart3, Trophy } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-primary" data-testid="heading-landing">Game Day</h1>
        <p className="text-sm text-primary/70">x bowlo.ai</p>
        <p className="text-xl text-muted-foreground">Track. Analyse. Improve.</p>
        <p className="text-muted-foreground max-w-md mx-auto">
          The ultimate tracking app for lawn bowls players. Record every bowl, 
          analyse your performance, and become a better player.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
        <Card className="text-center">
          <CardHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Track Every Bowl</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Record hand, result, and position for every delivery with our intuitive 3x3 grid.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Analyse Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Get detailed insights on your forehand vs backhand, weight control, and line accuracy.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Improve Your Game</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Identify patterns, track progress over time, and focus on areas that need work.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 text-center">
        <Button 
          size="lg" 
          className="px-8"
          onClick={() => window.location.href = '/api/login'}
          data-testid="button-login"
        >
          Sign In to Get Started
        </Button>
        <p className="text-sm text-muted-foreground">
          Sign in with Google or create an account
        </p>
      </div>
    </div>
  );
}
