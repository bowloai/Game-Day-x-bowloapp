import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Search, UserX, UserCheck, Trash2, Shield, Activity, Users, Trophy, CircleDot, Timer, Info, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { User, AuditLog } from "@shared/schema";

type UserWithStats = Omit<User, "password"> & {
  gameCount: number;
  bowlCount: number;
  lastGameAt: string | null;
};

type Analytics = {
  periodDays: number;
  totals: {
    users: number;
    completedGames: number;
    inProgressGames: number;
    bowls: number;
    activeUsers: number;
  };
  trends: Array<{ date: string; signups: number; games: number }>;
  gameTypes: Array<{ label: string; count: number }>;
  gameFormats: Array<{ label: string; count: number }>;
  playCategories: Array<{ label: string; count: number }>;
};

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: number; detail: string; icon: typeof Users }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold">{value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className="rounded-full bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function Breakdown({ title, data }: { title: string; data: Analytics["gameTypes"] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? <p className="text-sm text-muted-foreground">No game data yet.</p> : data.map(item => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="capitalize">{item.label.replace(/_/g, " ")}</span>
              <span className="font-medium">{item.count.toLocaleString()}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (item.count / total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "logs">("overview");
  const [periodDays, setPeriodDays] = useState(30);

  const analyticsQuery = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics", periodDays],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?days=${periodDays}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch usage analytics");
      return res.json();
    },
    enabled: activeTab === "overview" && Boolean(user?.isAdmin),
  });

  const usersQuery = useQuery<UserWithStats[]>({
    queryKey: ["/api/admin/users", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/admin/users?q=${encodeURIComponent(searchQuery)}` : "/api/admin/users";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: activeTab === "users" && Boolean(user?.isAdmin),
  });

  const logsQuery = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit-logs?limit=50", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    enabled: activeTab === "logs" && Boolean(user?.isAdmin),
  });

  const accountMutation = (action: "suspend" | "activate") => useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(`Failed to ${action} user`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({ title: `User ${action === "suspend" ? "suspended" : "activated"}` });
    },
    onError: () => toast({ title: `Failed to ${action} user`, variant: "destructive" }),
  });
  const suspendUser = accountMutation("suspend");
  const activateUser = accountMutation("activate");

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({ title: "User deleted" });
    },
    onError: () => toast({ title: "Failed to delete user", variant: "destructive" }),
  });

  if (!user?.isAdmin) {
    return (
      <div className="py-12 text-center">
        <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have admin privileges.</p>
      </div>
    );
  }

  const analytics = analyticsQuery.data;
  const chartData = analytics?.trends.map(item => ({
    ...item,
    label: format(new Date(`${item.date}T00:00:00`), periodDays <= 7 ? "EEE" : "MMM d"),
  })) ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-primary" data-testid="heading-admin">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage accounts and understand how Game Day is being used.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-1">
        {([
          ["overview", BarChart3, "Overview"],
          ["users", Users, "Users"],
          ["logs", Activity, "Audit Log"],
        ] as const).map(([tab, Icon, label]) => (
          <Button key={tab} variant={activeTab === tab ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(tab)}>
            <Icon className="mr-1.5 h-4 w-4" /><span className="truncate">{label}</span>
          </Button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Usage overview</h2>
              <p className="text-sm text-muted-foreground">Account growth and recorded game activity.</p>
            </div>
            <div className="flex rounded-md border p-1">
              {[7, 30, 90].map(days => (
                <Button key={days} size="sm" variant={periodDays === days ? "secondary" : "ghost"} onClick={() => setPeriodDays(days)}>
                  {days} days
                </Button>
              ))}
            </div>
          </div>

          {analyticsQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)}</div>
          ) : analyticsQuery.isError ? (
            <Card><CardContent className="py-8 text-center"><p className="font-medium">Usage data could not be loaded.</p><Button className="mt-3" variant="outline" onClick={() => analyticsQuery.refetch()}>Try again</Button></CardContent></Card>
          ) : analytics && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <MetricCard title="Users" value={analytics.totals.users} detail="Registered accounts" icon={Users} />
                <MetricCard title="Completed games" value={analytics.totals.completedGames} detail="All time" icon={Trophy} />
                <MetricCard title="In progress" value={analytics.totals.inProgressGames} detail="Games currently open" icon={Timer} />
                <MetricCard title="Bowls recorded" value={analytics.totals.bowls} detail="All time" icon={CircleDot} />
                <MetricCard title="Active users" value={analytics.totals.activeUsers} detail={`Recorded a game in ${periodDays} days`} icon={Activity} />
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Growth and game activity</CardTitle></CardHeader>
                <CardContent>
                  {chartData.every(item => item.games === 0 && item.signups === 0) ? (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No activity in this period.</div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ left: -20, right: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={periodDays === 90 ? 13 : periodDays === 30 ? 4 : 0} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="games" name="Games" fill="#16a34a" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="signups" name="New users" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Breakdown title="Game type" data={analytics.gameTypes} />
                <Breakdown title="Format" data={analytics.gameFormats} />
                <Breakdown title="Play category" data={analytics.playCategories} />
              </div>

              <div className="flex gap-2 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p><strong className="text-foreground">Metric definition:</strong> An active user is someone who created a game during the selected period. Login activity and time spent in the app are not tracked.</p>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users by name, email, or club..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          {usersQuery.isLoading ? <div className="py-8 text-center text-muted-foreground">Loading users...</div>
          : usersQuery.isError ? <Card><CardContent className="py-8 text-center">Users could not be loaded.</CardContent></Card>
          : usersQuery.data?.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No users found.</CardContent></Card>
          : <div className="space-y-3">{usersQuery.data?.map(u => (
            <Card key={u.id} className={u.isSuspended ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "No name"}</span>
                      {u.isAdmin && <Badge variant="secondary"><Shield className="mr-1 h-3 w-3" />Admin</Badge>}
                      {u.isSuspended && <Badge variant="destructive">Suspended</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{u.email || "No email"}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {u.club && <span>Club: {u.club}</span>}
                      <span>Joined: {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "Unknown"}</span>
                      <span>{u.gameCount} games</span><span>{u.bowlCount} bowls</span>
                      <span>Last game: {u.lastGameAt ? format(new Date(u.lastGameAt), "MMM d, yyyy") : "Never"}</span>
                    </div>
                  </div>
                  {u.id !== user.id && <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => u.isSuspended ? activateUser.mutate(u.id) : suspendUser.mutate(u.id)}>
                      {u.isSuspended ? <UserCheck className="mr-1 h-4 w-4" /> : <UserX className="mr-1 h-4 w-4" />}{u.isSuspended ? "Activate" : "Suspend"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete User</AlertDialogTitle><AlertDialogDescription>Delete {u.email || "this user"} and all associated game data? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteUser.mutate(u.id)} className="bg-destructive text-destructive-foreground">Delete User</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>}
                </div>
              </CardContent>
            </Card>
          ))}</div>}
          <p className="text-center text-sm text-muted-foreground">{usersQuery.data?.length || 0} users shown</p>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-2">
          {logsQuery.isLoading ? <div className="py-8 text-center text-muted-foreground">Loading audit logs...</div>
          : logsQuery.isError ? <Card><CardContent className="py-8 text-center">Audit logs could not be loaded.</CardContent></Card>
          : logsQuery.data?.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No audit logs yet.</CardContent></Card>
          : logsQuery.data?.map(log => (
            <Card key={log.id} className="bg-muted/30"><CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2"><Badge variant="outline" className="shrink-0">{log.action.replace(/_/g, " ")}</Badge><span className="text-sm">{log.details}</span></div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">{log.createdAt ? format(new Date(log.createdAt), "MMM d, h:mm a") : ""}</span>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}