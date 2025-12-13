import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Share2, Copy, Check, Twitter, Facebook, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { GameWithDetails } from "@/lib/api";
import { format } from "date-fns";

interface ShareGameSummaryProps {
  game: GameWithDetails;
  scoreFor: number;
  scoreAgainst: number;
}

export function ShareGameSummary({ game, scoreFor, scoreAgainst }: ShareGameSummaryProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const result = scoreFor > scoreAgainst ? "Win" : scoreFor < scoreAgainst ? "Loss" : "Draw";
  const resultEmoji = scoreFor > scoreAgainst ? "🏆" : scoreFor < scoreAgainst ? "😔" : "🤝";
  const completedEnds = game.ends?.filter(e => e.isCompleted).length || 0;
  
  const allBowls = game.ends?.flatMap(e => e.bowls || []) || [];
  const effectiveBowls = allBowls.filter(b => b.result === 'Effective').length;
  const effectivePercent = allBowls.length > 0 ? Math.round((effectiveBowls / allBowls.length) * 100) : 0;

  const gameDate = format(new Date(game.createdAt), "MMM d, yyyy");
  
  const summaryText = `${resultEmoji} ${result}! vs ${game.opponent}

📊 Final Score: ${scoreFor} - ${scoreAgainst}
📍 ${game.venue} | ${game.surface}
🎯 ${completedEnds} ends played
✨ ${effectivePercent}% bowl effectiveness (${effectiveBowls}/${allBowls.length} bowls)

#LawnBowls #Bowls #GameDay`;

  const handleCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast({
        title: "Not supported",
        description: "Clipboard access is not available in this browser.",
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Game summary copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Lawn Bowls ${result} vs ${game.opponent}`,
          text: summaryText,
        });
        setOpen(false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  const shareToTwitter = () => {
    if (typeof window === 'undefined') return;
    const tweetText = encodeURIComponent(summaryText);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank', 'noopener,noreferrer');
  };

  const shareToFacebook = () => {
    if (typeof window === 'undefined') return;
    const text = encodeURIComponent(summaryText);
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${text}`, '_blank', 'noopener,noreferrer');
  };

  const shareToLinkedIn = () => {
    if (typeof window === 'undefined') return;
    const text = encodeURIComponent(summaryText);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${text}`, '_blank', 'noopener,noreferrer');
  };

  const supportsNativeShare = typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid={`button-share-${game.id}`}
        >
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Game Summary</DialogTitle>
          <DialogDescription>
            Share your game result on social media
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap font-mono">
            {summaryText}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {supportsNativeShare && (
              <Button 
                onClick={handleNativeShare}
                className="flex-1"
                data-testid="button-native-share"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex-1"
              data-testid="button-copy-summary"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">Or share directly to:</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={shareToTwitter}
                className="flex-1 h-10"
                data-testid="button-share-twitter"
              >
                <Twitter className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={shareToFacebook}
                className="flex-1 h-10"
                data-testid="button-share-facebook"
              >
                <Facebook className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={shareToLinkedIn}
                className="flex-1 h-10"
                data-testid="button-share-linkedin"
              >
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
