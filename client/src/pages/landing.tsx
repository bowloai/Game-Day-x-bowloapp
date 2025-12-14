import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Target, BarChart3, Trophy, Mail } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default function Landing() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = '/api/login';
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
          
          <div className="space-y-3">
            <Button 
              size="lg" 
              variant="outline"
              className="w-full py-6 gap-3 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-google-signin"
            >
              <GoogleIcon className="w-5 h-5" />
              Sign in with Google
            </Button>
            
            <Button 
              size="lg" 
              className="w-full py-6 gap-3 font-medium"
              style={{ backgroundColor: '#1877F2' }}
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-facebook-signin"
            >
              <FacebookIcon className="w-5 h-5" />
              Continue with Facebook
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">or</span>
              </div>
            </div>

            {!showEmailForm ? (
              <Button 
                size="lg" 
                variant="outline"
                className="w-full py-6 gap-3 font-medium"
                onClick={() => setShowEmailForm(true)}
                data-testid="button-email-signin"
              >
                <Mail className="w-5 h-5" />
                Sign in with Email
              </Button>
            ) : (
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="py-6"
                  data-testid="input-email"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="py-6"
                  data-testid="input-password"
                />
                <Button 
                  type="submit"
                  size="lg" 
                  className="w-full py-6 font-medium"
                  data-testid="button-submit-email"
                >
                  Sign In
                </Button>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  data-testid="button-back-to-options"
                >
                  Back to sign in options
                </button>
              </form>
            )}
          </div>

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
