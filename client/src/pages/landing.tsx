import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm w-full">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary" data-testid="heading-landing">Game Day</h1>
          <p className="text-sm text-primary/70">x bowlo.ai</p>
        </div>
        
        <div className="space-y-3 pt-4">
          <Button 
            size="lg" 
            className="w-full text-lg py-6"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-signin"
          >
            Sign In
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="w-full text-lg py-6"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-create-account"
          >
            Create Account
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground pt-2">
          Continue with Google, GitHub, Apple, or email
        </p>
      </div>
    </div>
  );
}
