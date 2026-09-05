"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";
import { updateUserRole } from "@/app/actions/user-management";
import { initiateRTBF } from "@/app/actions/rtbf";
import { Role, ROLES } from "@/lib/auth/permissions";
import {
  fetchAdminUsers,
  fetchMyRole,
  type AdminUserItem,
} from "@/app/actions/admin-users";
import { useUser } from "@/lib/adapters/auth/ui";

// Helper for badge colors
const getRoleBadgeColor = (role: string) => {
  switch (role?.toLowerCase()) {
    case "super_admin":
      return "bg-purple-600 hover:bg-purple-700";
    case "owner":
      return "bg-red-600 hover:bg-red-700";
    case "manager":
      return "bg-blue-600 hover:bg-blue-700";
    case "supervisor":
      return "bg-amber-600 hover:bg-amber-700";
    case "cashier":
      return "bg-green-600 hover:bg-green-700";
    default:
      return "bg-gray-500";
  }
};

export function UsersClient() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [newRole, setNewRole] = useState<Role | "">("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRTBFOpen, setIsRTBFOpen] = useState(false);

  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Redirect handled by middleware mostly, but just safe guard
      setLoading(false);
      return;
    }
    if (isLoaded && isSignedIn) {
      const init = async () => {
        await loadData();
      };
      init();
    }
  }, [isLoaded, isSignedIn]);

  const loadData = async () => {
    setLoading(true);
    const [usersRes, roleRes] = await Promise.all([
      fetchAdminUsers(),
      fetchMyRole(),
    ]);

    if (usersRes.error) {
      toast.error(usersRes.error);
    } else {
      setUsers(usersRes.data);
    }

    setCurrentUserRole(roleRes || "");
    setLoading(false);
  };

  const handleEditClick = (user: AdminUserItem) => {
    setSelectedUser(user);
    setNewRole((user.role as Role) || "cashier");
    setIsDialogOpen(true);
  };

  const handleRTBFClick = (user: AdminUserItem) => {
    setSelectedUser(user);
    setIsRTBFOpen(true);
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser || !newRole) return;

    setIsUpdating(true);
    try {
      const result = await updateUserRole(
        selectedUser.user_id,
        newRole as Role,
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Team member role updated.");
        setIsDialogOpen(false);
        loadData();
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRTBFPermanentDelete = async () => {
    if (!selectedUser || !selectedUser.business_id) return;
    setIsUpdating(true);
    try {
      const result = await initiateRTBF(
        selectedUser.business_id,
        selectedUser.user_id,
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User data removal initiated (RTBF)");
        setIsRTBFOpen(false);
        loadData();
      }
    } catch (error) {
      toast.error("Failed to process RTBF");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return <AppPageSkeleton rows={5} />;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage staff roles, access levels, and privacy compliance (RTBF).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No users found in this context
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Identification</TableHead>
                    <TableHead>Business/Tenant</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Access Granted</TableHead>
                    <TableHead className="text-right">Administration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="group">
                      <TableCell className="font-mono text-xs">
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">
                            {user.user_id.substring(0, 8)}...
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {user.user_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{user.business_name}</TableCell>
                      <TableCell>
                        <Badge
                          className={`${getRoleBadgeColor(user.role || "")} text-[10px] uppercase px-2 py-0.5`}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => handleEditClick(user)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRTBFClick(user)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> RTBF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Role Assignment</DialogTitle>
            <DialogDescription>
              Assign a new role level. Note: You cannot assign roles higher than
              your own.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Hierarchy Level</label>
              <Select
                value={newRole}
                onValueChange={(val) => setNewRole(val as Role)}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Identify Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.CASHIER}>
                    Cashier (Tier 1)
                  </SelectItem>
                  <SelectItem value={ROLES.SUPERVISOR}>
                    Supervisor (Tier 2)
                  </SelectItem>
                  <SelectItem value={ROLES.MANAGER}>
                    Manager (Tier 3)
                  </SelectItem>
                  {/* Only super_admin can assign super_admin */}
                  {currentUserRole === "super_admin" && (
                    <SelectItem value={ROLES.SUPER_ADMIN}>
                      Super Admin (Tier 4)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <div className="bg-muted p-3 rounded-md mt-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">
                    Hierarchy Rule:
                  </span>
                  {currentUserRole === "manager"
                    ? " As a Manager, you can assign levels up to Tier 3."
                    : " You have administrative override permissions."}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              disabled={isUpdating}
            >
              Discard
            </Button>
            <Button
              onClick={handleRoleUpdate}
              disabled={isUpdating || !newRole}
            >
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apply Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RTBF Confirmation Dialog */}
      <Dialog open={isRTBFOpen} onOpenChange={setIsRTBFOpen}>
        <DialogContent className="sm:max-w-[425px] border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" /> Right to be Forgotten
            </DialogTitle>
            <DialogDescription>
              This is a permanent compliance action. The user's PII will be
              masked and all tenant associations revoked. This action is logged
              for audit trails.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-md space-y-2 my-2">
            <p className="text-xs font-bold text-destructive underline">
              IRREVERSIBLE ACTION
            </p>
            <p className="text-[11px] text-muted-foreground">
              User ID:{" "}
              <span className="font-mono">{selectedUser?.user_id}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Tenant:{" "}
              <span className="font-semibold">
                {selectedUser?.business_name}
              </span>
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsRTBFOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRTBFPermanentDelete}
              disabled={isUpdating}
            >
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Shredding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
