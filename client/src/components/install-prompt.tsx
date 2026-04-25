import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Share, Plus } from "lucide-react";

const DISMISSED_KEY = "pwa-install-dismissed";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    ("standalone" in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (isIos()) {
      const timer = setTimeout(() => setShowIos(true), 2000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowAndroid(false);
    setShowIos(false);
  };

  const installAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setDeferredPrompt(null);
    setShowAndroid(false);
  };

  if (!showAndroid && !showIos) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <img src="/app-icon.png" alt="Game Day" className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Add to your home screen</p>
            {showAndroid && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Install Game Day for quick access and the best experience.
              </p>
            )}
            {showIos && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap <Share className="inline w-3 h-3 mx-0.5" /> then{" "}
                <span className="font-medium">Add to Home Screen</span>{" "}
                <Plus className="inline w-3 h-3 mx-0.5" /> to install.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
            aria-label="Dismiss"
            data-testid="button-dismiss-install"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showAndroid && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={dismiss}
              data-testid="button-install-later"
            >
              Not now
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={installAndroid}
              data-testid="button-install-app"
            >
              Install
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
