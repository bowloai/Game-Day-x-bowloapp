import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  PlusCircle, 
  Target, 
  BarChart3, 
  Share2, 
  ClipboardList,
  Play,
  CheckCircle,
  Grid3X3,
  StickyNote,
  Pencil,
  HelpCircle
} from "lucide-react";

interface HelpSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function HelpSection({ title, icon: Icon, children, defaultOpen = false }: HelpSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary" />
                {title}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function Help() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-primary">Help & Guide</h1>
        <p className="text-muted-foreground mt-2">
          Learn how to use Game Day x bowlo.ai to track and improve your lawn bowls performance.
        </p>
      </div>

      <div className="space-y-4">
        <HelpSection title="Getting Started" icon={HelpCircle} defaultOpen={true}>
          <div className="space-y-4 text-sm">
            <p>
              Game Day x bowlo.ai helps you track every bowl you deliver during a game, 
              giving you insights into your performance through detailed statistics.
            </p>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Quick Start:</h4>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Tap <strong>New Game</strong> to set up your match details</li>
                <li>Record each bowl during play using the 3x3 grid</li>
                <li>Complete ends and track scores as you go</li>
                <li>Finish the game and add optional notes</li>
                <li>View your analysis and share your stats</li>
              </ol>
            </div>
          </div>
        </HelpSection>

        <HelpSection title="Starting a New Game" icon={PlusCircle}>
          <div className="space-y-4 text-sm">
            <p>Before you start playing, set up your game with the following details:</p>
            
            <div className="space-y-3">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Game Type</h4>
                <p className="text-muted-foreground">Choose Pennant, Tournament, or Practice to categorize your game.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Game Format</h4>
                <p className="text-muted-foreground">Select Singles, Pairs, Triples, or Fours based on your team size.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Bowls Per End</h4>
                <p className="text-muted-foreground">Set how many bowls you personally deliver each end (typically 2-4 depending on your format and position).</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Opponent & Venue</h4>
                <p className="text-muted-foreground">Enter who you're playing against and where the game is being held.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Surface & Position</h4>
                <p className="text-muted-foreground">Record whether you're playing on Grass, Plastic, or Carpet, and your position in the team.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Total Ends</h4>
                <p className="text-muted-foreground">Set how many ends the game will be (typically 18-21 for pennant games).</p>
              </div>
            </div>
          </div>
        </HelpSection>

        <HelpSection title="Recording Bowls During Play" icon={Grid3X3}>
          <div className="space-y-4 text-sm">
            <p>During each end, record every bowl you deliver using the simple 3x3 grid system:</p>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-3">The 3x3 Grid Explained:</h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs max-w-[300px] mx-auto mb-4">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded">
                  <div className="font-bold text-orange-600">Short</div>
                  <div className="text-muted-foreground">Narrow</div>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded">
                  <div className="font-bold text-red-600">Short</div>
                  <div className="text-muted-foreground">On Line</div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded">
                  <div className="font-bold text-blue-600">Short</div>
                  <div className="text-muted-foreground">Wide</div>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded">
                  <div className="font-bold text-orange-600">Good Weight</div>
                  <div className="text-muted-foreground">Narrow</div>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded">
                  <div className="font-bold text-green-600">Effective!</div>
                  <div className="text-muted-foreground">Perfect</div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded">
                  <div className="font-bold text-blue-600">Good Weight</div>
                  <div className="text-muted-foreground">Wide</div>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded">
                  <div className="font-bold text-orange-600">Heavy</div>
                  <div className="text-muted-foreground">Narrow</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                  <div className="font-bold text-slate-600">Heavy</div>
                  <div className="text-muted-foreground">On Line</div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded">
                  <div className="font-bold text-blue-600">Heavy</div>
                  <div className="text-muted-foreground">Wide</div>
                </div>
              </div>
              <p className="text-muted-foreground text-center">
                Tap the center for an effective bowl, or tap the appropriate zone based on weight (rows) and line (columns).
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Recording Steps:</h4>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Select your hand (Forehand or Backhand)</li>
                <li>Deliver your bowl</li>
                <li>Tap the grid zone that matches where your bowl finished</li>
                <li>Repeat for each bowl in the end</li>
              </ol>
            </div>
          </div>
        </HelpSection>

        <HelpSection title="Completing an End" icon={CheckCircle}>
          <div className="space-y-4 text-sm">
            <p>After all bowls are delivered for an end:</p>
            
            <div className="space-y-3">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Jack Effective</h4>
                <p className="text-muted-foreground">Toggle if your team's jack was effective (in a good position).</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Jack Length</h4>
                <p className="text-muted-foreground">Record the jack length (Short, Medium, Long) for analysis.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Scores</h4>
                <p className="text-muted-foreground">Enter shots for and against. Use the +/- buttons to adjust.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Dead End</h4>
                <p className="text-muted-foreground">Mark if the end was dead (jack knocked out of bounds).</p>
              </div>
            </div>
            
            <p className="text-muted-foreground">
              Tap <strong>Complete End</strong> to save and move to the next end.
            </p>
          </div>
        </HelpSection>

        <HelpSection title="Finishing a Game" icon={Play}>
          <div className="space-y-4 text-sm">
            <p>When all ends are complete or you need to finish early:</p>
            
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Tap <strong>Finish Game</strong> in the game recording screen</li>
              <li>Optionally add a game report with:
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Green speed (in seconds)</li>
                  <li>Green comparison (similar greens you've played)</li>
                  <li>Mental feeling during the game</li>
                  <li>Performance rating (1-10)</li>
                  <li>Notes about the game</li>
                </ul>
              </li>
              <li>Tap <strong>Complete Game</strong> to save</li>
            </ol>
            
            <p className="bg-muted/50 rounded-lg p-3">
              <strong>Tip:</strong> You can edit game details later from the My Games page.
            </p>
          </div>
        </HelpSection>

        <HelpSection title="My Games" icon={ClipboardList}>
          <div className="space-y-4 text-sm">
            <p>View all your recorded games in one place:</p>
            
            <div className="space-y-3">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Game Cards</h4>
                <p className="text-muted-foreground">Each game shows opponent, score, date, venue, and status.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Filter by Date</h4>
                <p className="text-muted-foreground">Use the calendar filter to view games from a specific date range.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Actions</h4>
                <p className="text-muted-foreground">
                  <strong>Continue</strong> - Resume an in-progress game<br />
                  <strong>Analyze</strong> - View detailed stats for a completed game<br />
                  <strong>Share</strong> - Share your stats as an image<br />
                  <strong>Edit</strong> - Modify game details or notes<br />
                  <strong>Delete</strong> - Remove a game permanently
                </p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Export Data</h4>
                <p className="text-muted-foreground">Tap the download button to export all your data as a CSV file.</p>
              </div>
            </div>
          </div>
        </HelpSection>

        <HelpSection title="Viewing Your Analysis" icon={BarChart3}>
          <div className="space-y-4 text-sm">
            <p>The Analysis page shows your bowling performance statistics:</p>
            
            <div className="space-y-3">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Bowl Effectiveness</h4>
                <p className="text-muted-foreground">Percentage of bowls that finished in the "Effective" zone (center of the grid).</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">First Bowl Effectiveness</h4>
                <p className="text-muted-foreground">How effective your first bowl of each end is - a key consistency metric.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Weight Control</h4>
                <p className="text-muted-foreground">Breakdown of Short, Good, and Heavy weight percentages.</p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Line Control</h4>
                <p className="text-muted-foreground">Breakdown of Narrow, Good, and Wide line percentages.</p>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Stats Breakdown:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>All Bowls</strong> - Overall statistics across all recorded bowls</li>
                <li><strong>Forehand</strong> - Stats for forehand deliveries only</li>
                <li><strong>Backhand</strong> - Stats for backhand deliveries only</li>
              </ul>
            </div>
            
            <p className="text-muted-foreground">
              Use the <strong>Filters</strong> to narrow down by game type, surface, position, venue, opponent, or format.
            </p>
          </div>
        </HelpSection>

        <HelpSection title="Sharing Your Stats" icon={Share2}>
          <div className="space-y-4 text-sm">
            <p>Share your game performance as an image on social media:</p>
            
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Go to <strong>My Games</strong></li>
              <li>Find a completed game</li>
              <li>Tap the <strong>Share</strong> button</li>
              <li>The app will create an image with your game score and All Bowls stats</li>
              <li>On mobile: Use the share menu to post to your preferred app</li>
              <li>On desktop: The image will download for you to upload manually</li>
            </ol>
            
            <p className="bg-muted/50 rounded-lg p-3">
              <strong>The share image includes:</strong> Final score, opponent, venue, bowl effectiveness, weight control, and line control stats.
            </p>
          </div>
        </HelpSection>

        <HelpSection title="Editing Game Details" icon={Pencil}>
          <div className="space-y-4 text-sm">
            <p>You can edit game information at any time:</p>
            
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Go to <strong>My Games</strong></li>
              <li>Find the game you want to edit</li>
              <li>Tap the <strong>Edit</strong> button</li>
              <li>Modify any game details, end information, or notes</li>
              <li>Tap <strong>Save Changes</strong></li>
            </ol>
            
            <p className="text-muted-foreground">
              You can also add or update game report details (green speed, mental state, performance rating) for completed games.
            </p>
          </div>
        </HelpSection>

        <HelpSection title="Tips for Better Tracking" icon={Target}>
          <div className="space-y-4 text-sm">
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Be Consistent</h4>
                <p className="text-muted-foreground">Record every bowl immediately after delivery for the most accurate data.</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Be Honest</h4>
                <p className="text-muted-foreground">Accurate recording leads to meaningful insights. Don't inflate your effectiveness!</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Review Regularly</h4>
                <p className="text-muted-foreground">Check your analysis after each game to identify patterns and areas for improvement.</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Add Notes</h4>
                <p className="text-muted-foreground">Game notes help you remember conditions and context when reviewing later.</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Compare Hands</h4>
                <p className="text-muted-foreground">Use the Forehand vs Backhand stats to see which hand needs more practice.</p>
              </div>
            </div>
          </div>
        </HelpSection>
      </div>

      <div className="text-center text-sm text-muted-foreground pt-4">
        Need more help? Contact support or visit our website for additional resources.
      </div>
    </div>
  );
}
