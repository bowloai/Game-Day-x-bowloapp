import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, User, Building2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [club, setClub] = useState(user?.club || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateProfile = useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string; club?: string }) => {
      const response = await fetch("/api/auth/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfile.mutate({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      club: club || undefined,
    });
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };

  const deleteAllData = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/data", {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete data");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      setShowDeleteDialog(false);
      toast({
        title: "Data deleted",
        description: "All your game data has been permanently deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete data. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary" data-testid="heading-account">Account</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Manage your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-16 h-16 rounded-full object-cover"
                data-testid="img-profile"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold" data-testid="text-email">{user?.email || "No email"}</p>
              <p className="text-sm text-muted-foreground">Signed in account</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  data-testid="input-last-name"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Club
          </CardTitle>
          <CardDescription>
            Your lawn bowls club affiliation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="club">Club Name</Label>
            <Input
              id="club"
              value={club}
              onChange={(e) => setClub(e.target.value)}
              placeholder="Enter your club name"
              data-testid="input-club"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button 
          onClick={handleSave} 
          disabled={updateProfile.isPending}
          data-testid="button-save-profile"
        >
          {updateProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>

        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="text-destructive hover:text-destructive"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>

        <Button 
          variant="destructive" 
          onClick={() => setShowDeleteDialog(true)}
          data-testid="button-delete-all-data"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete All Data
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Data?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your games, ends, and bowl records. Your account will remain active. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteAllData.mutate()}
              disabled={deleteAllData.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteAllData.isPending ? "Deleting..." : "Delete Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
