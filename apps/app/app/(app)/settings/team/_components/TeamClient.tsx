"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
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
import { Building2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

interface TeamMember {
  id: string;
  user_id: string;
  business_id: string;
  role: string;
  created_at: string;
  email?: string;
}

export default function TeamClient() {
  const router = useRouter();
  const { business, loading: businessLoading } = useBusiness();
  const { hasPermission, loading: permsLoading } = usePermission(business?.id);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedBusinessId, setLoadedBusinessId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{
    businessId: string;
    message: string;
  } | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("cashier");
  const [inviting, setInviting] = useState(false);
  const currentBusinessIdRef = useRef(business?.id);
  currentBusinessIdRef.current = business?.id;

  const fetchTeam = useCallback(
    async (signal?: AbortSignal) => {
      if (!business?.id) {
        setUsers([]);
        setLoadedBusinessId(null);
        setLoading(false);
        setLoadError(null);
        return;
      }

      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/team?business_id=${business.id}`, {
          signal,
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok)
          throw new Error(result.error || "Failed to load team members");

        if (!signal?.aborted && currentBusinessIdRef.current === business.id) {
          setUsers(result.data || []);
          setLoadedBusinessId(business.id);
        }
      } catch (error) {
        if (
          (error instanceof Error && error.name === "AbortError") ||
          currentBusinessIdRef.current !== business.id
        ) {
          return;
        }
        console.error("Error fetching team:", error);
        setLoadError({
          businessId: business.id,
          message:
            error instanceof Error
              ? error.message
              : "Failed to load team members",
        });
        toast.error("Failed to load team members");
      } finally {
        if (!signal?.aborted && currentBusinessIdRef.current === business.id) {
          setLoading(false);
        }
      }
    },
    [business?.id],
  );

  useEffect(() => {
    setUpdating(null);
    setInviting(false);
    setInviteEmail("");
    setInviteRole("cashier");
    const controller = new AbortController();
    void fetchTeam(controller.signal);
    return () => controller.abort();
  }, [fetchTeam]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!business?.id) return;
    const mutationBusinessId = business.id;

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
        `/api/team/members/${encodeURIComponent(userId)}/role?business_id=${encodeURIComponent(mutationBusinessId)}`,
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
      if (currentBusinessIdRef.current !== mutationBusinessId) return;

      toast.success("User role updated");
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.user_id === userId ? { ...user, role: newRole } : user,
        ),
      );
    } catch (error) {
      if (currentBusinessIdRef.current !== mutationBusinessId) return;
      console.error("Error updating role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update role",
      );
    } finally {
      if (currentBusinessIdRef.current === mutationBusinessId) {
        setUpdating(null);
      }
    }
  };

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!business?.id || !inviteEmail.trim()) return;
    const mutationBusinessId = business.id;

    setInviting(true);
    try {
      const response = await fetch(
        `/api/team/members?business_id=${encodeURIComponent(mutationBusinessId)}`,
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
      if (currentBusinessIdRef.current !== mutationBusinessId) return;

      setInviteEmail("");
      setInviteRole("cashier");
      toast.success("Invitation sent");
    } catch (error) {
      if (currentBusinessIdRef.current !== mutationBusinessId) return;
      console.error("Error inviting team member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation",
      );
    } finally {
      if (currentBusinessIdRef.current === mutationBusinessId) {
        setInviting(false);
      }
    }
  };

  if (businessLoading) {
    return <AppPageSkeleton rows={5} />;
  }

  if (!business) {
    return (
      <EmptyState
        icon={Building2}
        title="Finish business setup"
        description="Create your business profile before inviting or managing team members."
        actionLabel="Continue setup"
        onAction={() => router.push("/onboarding")}
        className="m-4 md:m-8"
      />
    );
  }

  const currentLoadError =
    loadError && loadError.businessId === business.id ? loadError : null;

  if (currentLoadError) {
    return (
      <div className="p-4 md:p-8">
        <ErrorState
          title="Team members could not be loaded"
          message={currentLoadError.message}
          onRetry={() => void fetchTeam()}
        />
      </div>
    );
  }

  if (permsLoading || loading || loadedBusinessId !== business.id) {
    return <AppPageSkeleton rows={5} />;
  }

  // Check permission
  const canManageUsers = hasPermission("staff.manage");
  const canManagePrivilegedRoles =
    hasPermission("system.manage") || hasPermission("users.manage_all");

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
                    {canManagePrivilegedRoles && (
                      <SelectItem value="admin">Administrator</SelectItem>
                    )}
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
              {!users.length ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No additional team members have been added yet.
                  </TableCell>
                </TableRow>
              ) : null}
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
                          updating === user.user_id ||
                          user.role === "owner" ||
                          (user.role === "admin" && !canManagePrivilegedRoles)
                        }
                      >
                        <SelectTrigger className="w-[140px] ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cashier">Cashier</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          {canManagePrivilegedRoles && (
                            <SelectItem value="admin">Administrator</SelectItem>
                          )}
                          <SelectItem value="staff">Staff</SelectItem>
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
