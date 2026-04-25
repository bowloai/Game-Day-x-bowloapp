import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Target, BarChart3, Trophy, Mail, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

type View = "login" | "forgot" | "setup";

export default function Landing() {
  const [view, setView] = useState<View>("login");
  const [checkingSetup, setCheckingSetup] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/check-setup")
      .then((r) => r.json())
      .then((data) => {
        if (data.needsSetup) setView("setup");
      })
      .catch(() => {})
      .finally(() => setCheckingSetup(false));
  }, []);

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
        toast({ title: "Sign in failed", description: data.message || "Invalid email or password", variant: "destructive" });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch {
      toast({ title: "Sign in failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetPassword || !resetConfirm) return;
    setIsResetting(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, newPassword: resetPassword, confirmPassword: resetConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Reset failed", description: data.message || "Could not reset password", variant: "destructive" });
        return;
      }
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      setResetEmail(""); setResetPassword(""); setResetConfirm("");
      setView("login");
    } catch {
      toast({ title: "Reset failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupEmail || !setupPassword || !setupConfirm) return;
    if (setupPassword !== setupConfirm) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    setIsSettingUp(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: setupEmail, password: setupPassword }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: "Setup failed", description: data.message || "Could not create account", variant: "destructive" });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch {
      toast({ title: "Setup failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsSettingUp(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-primary" data-testid="heading-landing">Game Day</h1>
            <p className="text-sm text-primary/70">x bowlo.app</p>
            <p className="text-xl text-muted-foreground pt-2">Track. Analyse. Improve.</p>
          </div>

          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Mail className="w-4 h-4" />
                  <span>Sign in with your email</span>
                </div>
                <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="py-6" required data-testid="input-email" />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="py-6" required data-testid="input-password" />
              </div>
              <Button type="submit" size="lg" className="w-full py-6 font-medium" disabled={isLoading} data-testid="button-submit-login">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => setView("forgot")} className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-forgot-password">
                  Forgot your password?
                </button>
              </div>
            </form>
          )}

          {view === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="space-y-1 mb-2">
                <button type="button" onClick={() => setView("login")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-back-to-login">
                  <ArrowLeft className="w-3 h-3" />Back to sign in
                </button>
                <h2 className="text-lg font-semibold mt-2">Reset your password</h2>
                <p className="text-sm text-muted-foreground">Enter your email address and choose a new password.</p>
              </div>
              <Input type="email" placeholder="Email address" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="py-6" required data-testid="input-reset-email" />
              <Input type="password" placeholder="New password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="py-6" required data-testid="input-reset-password" />
              <Input type="password" placeholder="Confirm new password" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} className="py-6" required data-testid="input-reset-confirm" />
              <Button type="submit" size="lg" className="w-full py-6 font-medium" disabled={isResetting} data-testid="button-submit-reset">
                {isResetting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating password...</> : "Update Password"}
              </Button>
            </form>
          )}

          {view === "setup" && (
            <form onSubmit={handleSetup} className="space-y-3">
              <div className="space-y-1 mb-2">
                <h2 className="text-lg font-semibold">Create your account</h2>
                <p className="text-sm text-muted-foreground">Set up your email and password to get started.</p>
              </div>
              <Input type="email" placeholder="Email address" value={setupEmail} onChange={(e) => setSetupEmail(e.target.value)} className="py-6" required data-testid="input-setup-email" />
              <Input type="password" placeholder="Password" value={setupPassword} onChange={(e) => setSetupPassword(e.target.value)} className="py-6" required data-testid="input-setup-password" />
              <Input type="password" placeholder="Confirm password" value={setupConfirm} onChange={(e) => setSetupConfirm(e.target.value)} className="py-6" required data-testid="input-setup-confirm" />
              <Button type="submit" size="lg" className="w-full py-6 font-medium" disabled={isSettingUp} data-testid="button-submit-setup">
                {isSettingUp ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : "Create Account"}
              </Button>
            </form>
          )}

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
