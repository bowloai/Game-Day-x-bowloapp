import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Search, UserX, UserCheck, Trash2, Shield, Activity } from "lucide-react";
import { format } from "date-fns";
import type { User, AuditLog } from "@shared/schema";

type UserWithStats = User & { stats?: { gameCount: number; bowlCount: number } };

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");

  const { data: users, isLoading: usersLoading } = useQuery<UserWithStats[]>({
    queryKey: ["/api/admin/users", searchQuery],
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/admin/users?q=${encodeURIComponent(searchQuery)}`
        : "/api/admin/users";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit-logs?limit=50", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    enabled: activeTab === "logs",
  });

  const suspendUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to suspend user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({ title: "User suspended" });
    },
    onError: () => {
      toast({ title: "Failed to suspend user", variant: "destructive" });
    },
  });

  const activateUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/activate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to activate user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({ title: "User activated" });
    },
    onError: () => {
      toast({ title: "Failed to activate user", variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({ title: "User deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  if (!user?.isAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have admin privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary" data-testid="heading-admin">Admin</h1>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("users")}
            data-testid="tab-users"
          >
            Users
          </Button>
          <Button
            variant={activeTab === "logs" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("logs")}
            data-testid="tab-logs"
          >
            <Activity className="w-4 h-4 mr-1" />
            Audit Log
          </Button>
        </div>
      </div>

      {activeTab === "users" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or club..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>

          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : users?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No users found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {users?.map((u) => (
                <Card key={u.id} className={u.isSuspended ? "opacity-60" : ""} data-testid={`card-user-${u.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold" data-testid={`text-user-name-${u.id}`}>
                            {u.firstName || u.lastName 
                              ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
                              : "No name"}
                          </span>
                          {u.isAdmin && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {u.isSuspended && (
                            <Badge variant="destructive" className="text-xs">Suspended</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-user-email-${u.id}`}>
                          {u.email || "No email"}
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          {u.club && <span>Club: {u.club}</span>}
                          <span>Joined: {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "Unknown"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {u.id !== user.id && (
                          <>
                            {u.isSuspended ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => activateUser.mutate(u.id)}
                                disabled={activateUser.isPending}
                                data-testid={`button-activate-${u.id}`}
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Activate
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => suspendUser.mutate(u.id)}
                                disabled={suspendUser.isPending}
                                data-testid={`button-suspend-${u.id}`}
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Suspend
                              </Button>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  data-testid={`button-delete-${u.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {u.email || "this user"}? 
                                    This will permanently remove their account and all associated game data. 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUser.mutate(u.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-${u.id}`}
                                  >
                                    Delete User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            {users?.length || 0} user{users?.length !== 1 ? "s" : ""} total
          </div>
        </>
      )}

      {activeTab === "logs" && (
        <>
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
          ) : auditLogs?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No audit logs yet. Admin actions will be recorded here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {auditLogs?.map((log) => (
                <Card key={log.id} className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-sm">{log.details}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {log.createdAt ? format(new Date(log.createdAt), "MMM d, h:mm a") : ""}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
