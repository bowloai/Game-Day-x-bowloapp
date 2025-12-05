import { useGames } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import * as api from "@/lib/api";
import type { GameWithDetails } from "@/lib/api";
import { format } from "date-fns";

export default function Analysis() {
  const { data: games, isLoading } = useGames();
  const [gamesWithDetails, setGamesWithDetails] = useState<GameWithDetails[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Filters
  const [filterGame, setFilterGame] = useState<string>("All");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterSurface, setFilterSurface] = useState<string>("All");
  const [filterPosition, setFilterPosition] = useState<string>("All");
  const [filterVenue, setFilterVenue] = useState<string>("All");
  const [filterOpponent, setFilterOpponent] = useState<string>("All");
  const [filterHand, setFilterHand] = useState<string>("All");

  // Fetch full game details for completed games
  useEffect(() => {
    async function fetchDetails() {
      if (!games) return;
      const completedGames = games.filter(g => g.status === 'COMPLETED');
      if (completedGames.length === 0) {
        setGamesWithDetails([]);
        return;
      }
      
      setLoadingDetails(true);
      try {
        const details = await Promise.all(
          completedGames.map(g => api.getGameFull(g.id))
        );
        setGamesWithDetails(details);
      } catch (err) {
        console.error('Failed to load game details', err);
      }
      setLoadingDetails(false);
    }
    fetchDetails();
  }, [games]);

  // Get unique values for filters
  const uniqueVenues = useMemo(() => {
    if (!gamesWithDetails) return [];
    return Array.from(new Set(gamesWithDetails.map(g => g.venue))).sort();
  }, [gamesWithDetails]);

  const uniqueOpponents = useMemo(() => {
    if (!gamesWithDetails) return [];
    return Array.from(new Set(gamesWithDetails.map(g => g.opponent))).sort();
  }, [gamesWithDetails]);

  const stats = useMemo(() => {
    if (!gamesWithDetails || gamesWithDetails.length === 0) return null;
    
    let filteredGames = [...gamesWithDetails];
    
    // Apply filters
    if (filterGame !== "All") {
      filteredGames = filteredGames.filter(g => g.id === filterGame);
    }
    if (filterType !== "All") {
      filteredGames = filteredGames.filter(g => g.type === filterType);
    }
    if (filterSurface !== "All") {
      filteredGames = filteredGames.filter(g => g.surface === filterSurface);
    }
    if (filterPosition !== "All") {
      filteredGames = filteredGames.filter(g => g.position === filterPosition);
    }
    if (filterVenue !== "All") {
      filteredGames = filteredGames.filter(g => g.venue === filterVenue);
    }
    if (filterOpponent !== "All") {
      filteredGames = filteredGames.filter(g => g.opponent === filterOpponent);
    }

    const totalGames = filteredGames.length;
    if (totalGames === 0) return null;

    // Get all bowls from filtered games
    let allBowls = filteredGames.flatMap(g => 
      g.ends?.flatMap(e => e.bowls || []) || []
    );

    // Filter by hand if specified
    if (filterHand !== "All") {
      allBowls = allBowls.filter(b => b.hand === filterHand);
    }

    const totalBowls = allBowls.length;
    if (totalBowls === 0) return { totalGames, totalBowls: 0, effectivePercent: 0, firstEffectivePercent: 0, weightData: [], lineData: [] };

    // Effectiveness
    const effectiveCount = allBowls.filter(b => b.result === 'Effective').length;
    const effectivePercent = Math.round((effectiveCount / totalBowls) * 100);

    // First Bowl Effectiveness
    let firstBowls = filteredGames.flatMap(g => 
      g.ends?.map(e => e.bowls?.find(b => b.bowlNumber === 1)).filter(Boolean) || []
    );
    if (filterHand !== "All") {
      firstBowls = firstBowls.filter(b => b?.hand === filterHand);
    }
    const firstEffectiveCount = firstBowls.filter(b => b?.result === 'Effective').length;
    const firstEffectivePercent = firstBowls.length > 0 
      ? Math.round((firstEffectiveCount / firstBowls.length) * 100) 
      : 0;

    // Weight Control
    const shortCount = allBowls.filter(b => b.result.includes('Short')).length;
    const heavyCount = allBowls.filter(b => b.result.includes('Heavy')).length;
    const goodWeightCount = totalBowls - shortCount - heavyCount;

    // Line Control
    const narrowCount = allBowls.filter(b => b.result.includes('Narrow')).length;
    const wideCount = allBowls.filter(b => b.result.includes('Wide')).length;
    const goodLineCount = totalBowls - narrowCount - wideCount;

    const weightData = [
      { name: 'Short', value: shortCount, color: 'hsl(0 84% 60%)' },
      { name: 'Good', value: goodWeightCount, color: 'hsl(142 76% 36%)' },
      { name: 'Heavy', value: heavyCount, color: 'hsl(215 25% 27%)' },
    ];

    const lineData = [
      { name: 'Narrow', value: narrowCount, color: 'hsl(0 84% 60%)' },
      { name: 'Good', value: goodLineCount, color: 'hsl(142 76% 36%)' },
      { name: 'Wide', value: wideCount, color: 'hsl(215 25% 27%)' },
    ];

    // Calculate percentages for display
    const shortPercent = Math.round((shortCount / totalBowls) * 100);
    const heavyPercent = Math.round((heavyCount / totalBowls) * 100);
    const narrowPercent = Math.round((narrowCount / totalBowls) * 100);
    const widePercent = Math.round((wideCount / totalBowls) * 100);

    return {
      totalGames,
      totalBowls,
      effectivePercent,
      firstEffectivePercent,
      weightData,
      lineData,
      shortPercent,
      heavyPercent,
      narrowPercent,
      widePercent,
    };
  }, [gamesWithDetails, filterGame, filterType, filterSurface, filterPosition, filterVenue, filterOpponent, filterHand]);

  if (isLoading || loadingDetails) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-muted-foreground">No data available yet</h2>
        <p>Play and finish some games to see analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold text-primary">Performance Analysis</h1>
      
      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {/* Specific Game */}
            <div className="space-y-1">
              <Label className="text-xs">Game</Label>
              <Select value={filterGame} onValueChange={setFilterGame}>
                <SelectTrigger className="h-9" data-testid="select-filter-game">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Games</SelectItem>
                  {gamesWithDetails.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      vs {g.opponent} ({format(new Date(g.createdAt), "MMM d")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Game Type */}
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9" data-testid="select-filter-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="Pennant">Pennant</SelectItem>
                  <SelectItem value="Tournament">Tournament</SelectItem>
                  <SelectItem value="Practice">Practice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Surface */}
            <div className="space-y-1">
              <Label className="text-xs">Surface</Label>
              <Select value={filterSurface} onValueChange={setFilterSurface}>
                <SelectTrigger className="h-9" data-testid="select-filter-surface">
                  <SelectValue placeholder="All Surfaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Surfaces</SelectItem>
                  <SelectItem value="Grass">Grass</SelectItem>
                  <SelectItem value="Plastic">Plastic</SelectItem>
                  <SelectItem value="Carpet">Carpet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Position */}
            <div className="space-y-1">
              <Label className="text-xs">Position</Label>
              <Select value={filterPosition} onValueChange={setFilterPosition}>
                <SelectTrigger className="h-9" data-testid="select-filter-position">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Positions</SelectItem>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Second">Second</SelectItem>
                  <SelectItem value="Third">Third</SelectItem>
                  <SelectItem value="Skip">Skip</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Venue */}
            <div className="space-y-1">
              <Label className="text-xs">Venue</Label>
              <Select value={filterVenue} onValueChange={setFilterVenue}>
                <SelectTrigger className="h-9" data-testid="select-filter-venue">
                  <SelectValue placeholder="All Venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Venues</SelectItem>
                  {uniqueVenues.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Opponent */}
            <div className="space-y-1">
              <Label className="text-xs">Opponent</Label>
              <Select value={filterOpponent} onValueChange={setFilterOpponent}>
                <SelectTrigger className="h-9" data-testid="select-filter-opponent">
                  <SelectValue placeholder="All Opponents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Opponents</SelectItem>
                  {uniqueOpponents.map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hand Filter */}
            <div className="space-y-1">
              <Label className="text-xs">Hand</Label>
              <Select value={filterHand} onValueChange={setFilterHand}>
                <SelectTrigger className="h-9" data-testid="select-filter-hand">
                  <SelectValue placeholder="All Hands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Bowls</SelectItem>
                  <SelectItem value="Forehand">Forehand</SelectItem>
                  <SelectItem value="Backhand">Backhand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary" data-testid="text-effectiveness">{stats.effectivePercent}%</div>
            <p className="text-xs text-muted-foreground">of all bowls delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">1st Bowl Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-accent-foreground" data-testid="text-first-effectiveness">{stats.firstEffectivePercent}%</div>
            <p className="text-xs text-muted-foreground">setting the head</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Games Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-total-games">{stats.totalGames}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bowls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-total-bowls">{stats.totalBowls}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weight Control</CardTitle>
            <CardDescription>
              Short {stats.shortPercent || 0}% | Good {100 - (stats.shortPercent || 0) - (stats.heavyPercent || 0)}% | Heavy {stats.heavyPercent || 0}%
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.weightData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                >
                  {stats.weightData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line Control</CardTitle>
            <CardDescription>
              Narrow {stats.narrowPercent || 0}% | Good {100 - (stats.narrowPercent || 0) - (stats.widePercent || 0)}% | Wide {stats.widePercent || 0}%
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={stats.lineData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={60} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stats.lineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
