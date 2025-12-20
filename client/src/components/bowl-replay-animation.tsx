import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BowlReplayAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  hand: "Forehand" | "Backhand";
  gridRow: number;
  gridCol: number;
  bowlNumber: number;
  result: string;
}

export function BowlReplayAnimation({
  isOpen,
  onClose,
  hand,
  gridRow,
  gridCol,
  bowlNumber,
  result,
}: BowlReplayAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<"idle" | "rolling" | "complete">("idle");

  useEffect(() => {
    if (isOpen) {
      setAnimationPhase("idle");
      const timer = setTimeout(() => setAnimationPhase("rolling"), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (animationPhase === "rolling") {
      const timer = setTimeout(() => setAnimationPhase("complete"), 2500);
      return () => clearTimeout(timer);
    }
  }, [animationPhase]);

  const normalizedCol = (gridCol - 4) / 4;
  const normalizedRow = (gridRow - 4) / 4;

  const targetX = normalizedCol * 35;
  const targetY = 75 + normalizedRow * 15;

  const curveDirection = hand === "Forehand" ? -1 : 1;
  const curveIntensity = Math.abs(normalizedCol) * 25 + 15;

  const generateCurvePath = () => {
    const startX = 50;
    const startY = 95;
    const endX = 50 + targetX;
    const endY = targetY;
    
    const cp1X = startX + (curveDirection * curveIntensity);
    const cp1Y = startY - 20;
    const cp2X = endX + (curveDirection * curveIntensity * 0.3);
    const cp2Y = endY + 15;
    
    return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
  };

  const pathD = generateCurvePath();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-left">
                <h3 className="text-white font-display text-xl">Bowl {bowlNumber} Replay</h3>
                <p className="text-white/70 text-sm">{hand} - {result}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={onClose}
                data-testid="button-close-replay"
              >
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>

            <div className="relative bg-gradient-to-b from-green-700 via-green-600 to-green-500 rounded-lg overflow-hidden aspect-[3/4] shadow-2xl border-4 border-green-800">
              <div className="absolute inset-0 opacity-30">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-full h-px bg-green-900/30"
                    style={{ top: `${(i + 1) * 5}%` }}
                  />
                ))}
              </div>

              <div className="absolute left-0 right-0 top-0 h-1 bg-white/20" />
              <div className="absolute left-0 right-0 bottom-0 h-2 bg-amber-800/50" />

              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {animationPhase !== "idle" && (
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                  />
                )}
              </svg>

              <motion.div
                className="absolute w-3 h-3 rounded-full bg-yellow-400 shadow-lg border border-yellow-300"
                style={{
                  left: `${50 + targetX}%`,
                  top: `${targetY}%`,
                  transform: "translate(-50%, -50%)",
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              />

              {animationPhase !== "idle" && (
                <motion.div
                  className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 shadow-xl border-2 border-gray-600"
                  initial={{
                    left: "50%",
                    top: "95%",
                    x: "-50%",
                    y: "-50%",
                    scale: 1.2,
                  }}
                  animate={
                    animationPhase === "rolling" || animationPhase === "complete"
                      ? {
                          left: `${50 + targetX}%`,
                          top: `${targetY}%`,
                          x: "-50%",
                          y: "-50%",
                          scale: 1,
                          rotate: hand === "Forehand" ? -720 : 720,
                        }
                      : {}
                  }
                  transition={{
                    duration: 2.5,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-gray-800 to-gray-600" />
                  <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-white/30" />
                </motion.div>
              )}

              {animationPhase === "complete" && (
                <motion.div
                  className="absolute inset-x-0 bottom-4 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {result}
                  </span>
                </motion.div>
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full mt-4 text-white/70 hover:text-white hover:bg-white/10"
              onClick={onClose}
              data-testid="button-close-replay-bottom"
            >
              Tap to close
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
