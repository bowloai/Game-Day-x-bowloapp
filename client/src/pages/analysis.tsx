import { useGameStore, Game } from "@/lib/game-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function Analysis() {
  const { games } = useGameStore();
  
  const [filterType, setFilterType] = useState<string>("All");
  const [filterSurface, setFilterSurface] = useState<string>("All");

  // Process Data
  const stats = useMemo(() => {
    let filteredGames = games.filter(g => g.status === 'COMPLETED');
    
    if (filterType !== "All") {
      filteredGames = filteredGames.filter(g => g.type === filterType);
    }
    if (filterSurface !== "All") {
      filteredGames = filteredGames.filter(g => g.surface === filterSurface);
    }

    const allBowls = filteredGames.flatMap(g => g.ends.flatMap(e => e.bowls));
    const totalBowls = allBowls.length;

    if (totalBowls === 0) return null;

    // Effectiveness
    const effectiveCount = allBowls.filter(b => b.result === 'Effective').length;
    const effectivePercent = Math.round((effectiveCount / totalBowls) * 100);

    // First Bowl Effectiveness
    const firstBowls = allBowls.filter(b => b.bowlNumber === 1);
    const firstEffectiveCount = firstBowls.filter(b => b.result === 'Effective').length;
    const firstEffectivePercent = Math.round((firstEffectiveCount / (firstBowls.length || 1)) * 100);

    // Weight Control (Short vs Heavy vs Effective)
    // "Effective" usually implies good weight, so we count it as 'Good' for weight? 
    // Or do we strictly look for 'Short' and 'Heavy' keywords?
    // The prompt asks for "breakdown of short vs heavy as a percentage". 
    // We should probably include 'Good/Effective' as the remainder to make 100%.
    const shortCount = allBowls.filter(b => b.result.includes('Short')).length;
    const heavyCount = allBowls.filter(b => b.result.includes('Heavy')).length;
    const goodWeightCount = totalBowls - shortCount - heavyCount;

    // Line Control (Narrow vs Wide)
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

    return {
      totalGames: filteredGames.length,
      totalBowls,
      effectivePercent,
      firstEffectivePercent,
      weightData,
      lineData
    };
  }, [games, filterType, filterSurface]);

  if (!stats) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-muted-foreground">No data available yet</h2>
        <p>Play and finish some games to see analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-primary">Performance Analysis</h1>
        
        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Game Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Pennant">Pennant</SelectItem>
              <SelectItem value="Tournament">Tournament</SelectItem>
              <SelectItem value="Practice">Practice</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSurface} onValueChange={setFilterSurface}>
             <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Surface" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Surfaces</SelectItem>
              <SelectItem value="Grass">Grass</SelectItem>
              <SelectItem value="Plastic">Plastic</SelectItem>
              <SelectItem value="Carpet">Carpet</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{stats.effectivePercent}%</div>
            <p className="text-xs text-muted-foreground">of all bowls delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">1st Bowl Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-accent-foreground">{stats.firstEffectivePercent}%</div>
            <p className="text-xs text-muted-foreground">setting the head</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Games Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalGames}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bowls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalBowls}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Weight Control</CardTitle>
            <CardDescription>Short vs Heavy vs Good Length</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.weightData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
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
            <CardDescription>Narrow vs Wide vs Good Line</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={stats.lineData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
