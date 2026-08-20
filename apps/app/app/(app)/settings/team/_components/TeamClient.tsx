"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusiness } from "@/lib/hooks/use-business";
import { usePermission } from "@/lib/hooks/use-permission";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TeamMember {
  id: string;
  user_id: string;
  business_id: string;
  role: string;
  created_at: string;
  email?: string;
}

export default function TeamClient() {
  const { business } = useBusiness();
  const { hasPermission, loading: permsLoading } = usePermission(business?.id);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("cashier");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (business?.id) {
      fetchTeam();
    }
  }, [business?.id]);

  const fetchTeam = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/team?business_id=${business.id}`);
      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setUsers(result.data || []);
    } catch (error) {
      console.error("Error fetching team:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!business?.id) return;

    // confirm
    if (
      !confirm(
        `Are you sure you want to change this user's role to ${newRole}?`,
      )
    )
      return;

    setUpdating(userId);
    try {
      const response = await fetch(
        `/api/team/members/${encodeURIComponent(userId)}/role?business_id=${encodeURIComponent(business.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update role");
      }

      toast.success("User role updated");
      // Update local state
      setUsers(
        users.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)),
      );
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update role",
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!business?.id || !inviteEmail.trim()) return;

    setInviting(true);
    try {
      const response = await fetch(
        `/api/team/members?business_id=${encodeURIComponent(business.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to send invitation");
      }

      setInviteEmail("");
      setInviteRole("cashier");
      toast.success("Invitation sent");
    } catch (error) {
      console.error("Error inviting team member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation",
      );
    } finally {
      setInviting(false);
    }
  };

  if (permsLoading || loading) {
    return <div className="p-8">Loading...</div>;
  }

  // Check permission
  const canManageUsers = hasPermission("staff.manage");

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage staff roles and permissions
        </p>
      </div>

      {!canManageUsers && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6 flex items-center gap-4">
            <ShieldAlert className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Access Restricted</p>
              <p className="text-sm text-yellow-700">
                You do not have permission to manage team members.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {canManageUsers && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a Team Member</CardTitle>
            <CardDescription>
              DRX sends a one-time invitation. Passwords are created privately
              by the invited user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end"
              onSubmit={handleInvite}
            >
              <div className="space-y-2">
                <Label htmlFor="team-invite-email">Email address</Label>
                <Input
                  id="team-invite-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="operator@example.com"
                  disabled={inviting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-invite-role">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={setInviteRole}
                  disabled={inviting}
                >
                  <SelectTrigger id="team-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviting}>
                {inviting ? "Sending…" : "Send Invitation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Roles define what actions users can perform in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">
                      {user.email || "Unknown User"}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {user.user_id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManageUsers && (
                      <Select
                        value={user.role}
                        onValueChange={(val) =>
                          handleRoleChange(user.user_id, val)
                        }
                        disabled={
                          updating === user.user_id || user.role === "owner"
                        }
                      >
                        <SelectTrigger className="w-[140px] ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cashier">Cashier</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          {/* Owner cannot be assigned via UI usually, but displayed */}
                          {user.role === "owner" && (
                            <SelectItem value="owner">Owner</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Descriptions Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h3 className="font-medium">Cashier</h3>
              <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                <li>Create sales & process payments</li>
                <li>View product catalog</li>
                <li>View own shift data</li>
                <li>View customer profiles (limited)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Supervisor</h3>
              <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                <li>All Cashier permissions</li>
                <li>Void transactions & discounts</li>
                <li>Manage customers</li>
                <li>View daily reports</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Manager</h3>
              <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                <li>All Supervisor permissions</li>
                <li>Full inventory management</li>
                <li>Staff management</li>
                <li>System settings & Tax</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
