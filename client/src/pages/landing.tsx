import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Target, BarChart3, Trophy, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          title: "Sign in failed",
          description: data.message || "Invalid email or password",
          variant: "destructive",
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-primary" data-testid="heading-landing">Game Day</h1>
            <p className="text-sm text-primary/70">x bowlo.app</p>
            <p className="text-xl text-muted-foreground pt-2">Track. Analyse. Improve.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Mail className="w-4 h-4" />
                <span>Sign in with your email</span>
              </div>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="py-6"
                required
                data-testid="input-email"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="py-6"
                required
                data-testid="input-password"
              />
            </div>
            <Button 
              type="submit"
              size="lg" 
              className="w-full py-6 font-medium"
              disabled={isLoading}
              data-testid="button-submit-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="flex justify-center gap-4 pt-4">
            <Card className="flex-1 p-3 text-center">
              <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">Track</p>
            </Card>
            <Card className="flex-1 p-3 text-center">
              <BarChart3 className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">Analyse</p>
            </Card>
            <Card className="flex-1 p-3 text-center">
              <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">Improve</p>
            </Card>
          </div>
        </div>
      </div>

      <footer className="p-4 text-center text-xs text-muted-foreground">
        <p>Game Day x bowlo.app</p>
      </footer>
    </div>
  );
}
