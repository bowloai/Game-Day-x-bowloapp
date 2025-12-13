import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { GameWithDetails } from "@/lib/api";
import { format } from "date-fns";
import { toPng } from "html-to-image";

interface ShareGameSummaryProps {
  game: GameWithDetails;
  scoreFor: number;
  scoreAgainst: number;
}

export function ShareGameSummary({ game, scoreFor, scoreAgainst }: ShareGameSummaryProps) {
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const result = scoreFor > scoreAgainst ? "WIN" : scoreFor < scoreAgainst ? "LOSS" : "DRAW";
  const gameDate = format(new Date(game.createdAt), "MMM d, yyyy");
  
  const allBowls = game.ends?.flatMap(e => e.bowls || []) || [];
  const total = allBowls.length;
  
  const effective = allBowls.filter(b => b.result === 'Effective').length;
  const effectivePercent = total > 0 ? Math.round((effective / total) * 100) : 0;
  
  const short = allBowls.filter(b => b.result.includes('Short')).length;
  const heavy = allBowls.filter(b => b.result.includes('Heavy')).length;
  const goodWeight = total - short - heavy;
  const goodWeightPercent = total > 0 ? Math.round((goodWeight / total) * 100) : 0;
  
  const narrow = allBowls.filter(b => b.result.includes('Narrow')).length;
  const wide = allBowls.filter(b => b.result.includes('Wide')).length;
  const goodLine = total - narrow - wide;
  const goodLinePercent = total > 0 ? Math.round((goodLine / total) * 100) : 0;

  const handleShareImage = async () => {
    if (!cardRef.current || typeof window === 'undefined') return;
    
    setIsSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `bowlo-${game.opponent}-${gameDate}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Lawn Bowls ${result} vs ${game.opponent}`,
          files: [file],
        });
        toast({
          title: "Shared!",
          description: "Your game stats have been shared.",
        });
      } else {
        const link = document.createElement('a');
        link.download = `bowlo-${game.opponent}-${gameDate}.png`;
        link.href = dataUrl;
        link.click();
        toast({
          title: "Downloaded!",
          description: "Image saved. You can now share it on social media.",
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
        toast({
          title: "Error",
          description: "Failed to create image.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleShareImage}
        disabled={isSharing}
        data-testid={`button-share-${game.id}`}
      >
        {isSharing ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Share2 className="h-4 w-4 mr-1" />
        )}
        Share
      </Button>

      {/* Hidden card for image capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div
          ref={cardRef}
          style={{
            width: '400px',
            padding: '24px',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            borderRadius: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '2px' }}>
                {gameDate} • {game.venue}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
                vs {game.opponent}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '28px', 
                fontWeight: 'bold', 
                color: 'white',
                fontFamily: 'monospace'
              }}>
                {scoreFor} - {scoreAgainst}
              </div>
              <div style={{
                display: 'inline-block',
                padding: '2px 12px',
                background: result === 'WIN' ? '#fbbf24' : result === 'LOSS' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: result === 'WIN' ? '#000' : '#fff'
              }}>
                {result}
              </div>
            </div>
          </div>

          {/* All Bowls Stats */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              color: '#16a34a',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>All Bowls</span>
              <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666' }}>
                ({total} bowls)
              </span>
            </div>

            {/* Bowl Effectiveness */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '13px', color: '#333' }}>Bowl Effectiveness</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
                  {effectivePercent}%
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {effective} of {total} bowls effective
              </div>
            </div>

            {/* Weight Control */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: '#333', marginBottom: '8px' }}>Weight Control</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, background: '#fef2f2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626' }}>{Math.round((short / total) * 100) || 0}%</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Short</div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>{goodWeightPercent}%</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Good</div>
                </div>
                <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#475569' }}>{Math.round((heavy / total) * 100) || 0}%</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Heavy</div>
                </div>
              </div>
            </div>

            {/* Line Control */}
            <div>
              <div style={{ fontSize: '13px', color: '#333', marginBottom: '8px' }}>Line Control</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, background: '#fff7ed', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ea580c' }}>{Math.round((narrow / total) * 100) || 0}%</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Narrow</div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>{goodLinePercent}%</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Good</div>
                </div>
                <div style={{ flex: 1, background: '#eff6ff', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>{Math.round((wide / total) * 100) || 0}%</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Wide</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ 
            marginTop: '12px', 
            textAlign: 'center',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.7)'
          }}>
            bowlo.ai • #LawnBowls
          </div>
        </div>
      </div>
    </>
  );
}
