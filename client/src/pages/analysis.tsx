import { useGames } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import type { GameWithDetails } from "@/lib/api";

export default function Analysis() {
  const { data: games, isLoading } = useGames();
  
  const [filterType, setFilterType] = useState<string>("All");
  const [filterSurface, setFilterSurface] = useState<string>("All");

  const stats = useMemo(() => {
    if (!games) return null;
    
    let filteredGames = games.filter(g => g.status === 'COMPLETED');
    
    if (filterType !== "All") {
      filteredGames = filteredGames.filter(g => g.type === filterType);
    }
    if (filterSurface !== "All") {
      filteredGames = filteredGames.filter(g => g.surface === filterSurface);
    }

    const totalGames = filteredGames.length;
    if (totalGames === 0) return null;

    const totalBowls = filteredGames.reduce((sum, g) => sum, 0);

    return {
      totalGames,
      totalBowls,
      effectivePercent: 0,
      firstEffectivePercent: 0,
      weightData: [
        { name: 'Short', value: 0, color: 'hsl(0 84% 60%)' },
        { name: 'Good', value: 1, color: 'hsl(142 76% 36%)' },
        { name: 'Heavy', value: 0, color: 'hsl(215 25% 27%)' },
      ],
      lineData: [
        { name: 'Narrow', value: 0, color: 'hsl(0 84% 60%)' },
        { name: 'Good', value: 1, color: 'hsl(142 76% 36%)' },
        { name: 'Wide', value: 0, color: 'hsl(215 25% 27%)' },
      ]
    };
  }, [games, filterType, filterSurface]);

  if (isLoading) {
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-primary">Performance Analysis</h1>
        
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]" data-testid="select-filter-type">
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
             <SelectTrigger className="w-[140px]" data-testid="select-filter-surface">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
