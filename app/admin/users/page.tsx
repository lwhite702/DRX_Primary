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
  DialogTrigger,
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
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { updateUserRole } from "@/app/actions/user-management";
import { Role, ROLES } from "@/lib/auth/permissions";

// Helper for badge colors
const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "super_admin":
      return "bg-purple-600 hover:bg-purple-700";
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<Role | "">("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    fetchUsers();
  }, [supabase]);

  const fetchUsers = async () => {
    if (!supabase) return;

    try {
      // Fetch user roles with business info
      const { data, error } = await supabase
        .from("user_roles")
        .select(
          `
          *,
          business_profile:business_id(business_name, id)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Handle legacy/admin_users table if needed, but primarily use user_roles now
      // merging logic

      const formattedUsers = (data || []).map((role) => ({
        id: role.id, // role entry id
        user_id: role.user_id,
        role: role.role,
        business_name: role.business_profile?.business_name || "N/A",
        business_id: role.business_profile?.id || null,
        created_at: role.created_at,
      }));

      setUsers(formattedUsers);
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: any) => {
    setSelectedUser(user);
    setNewRole((user.role as Role) || "cashier");
    setIsDialogOpen(true);
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser || !newRole) return;

    setIsUpdating(true);
    try {
      const result = await updateUserRole(
        selectedUser.user_id,
        newRole as Role
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User role updated successfully");
        setIsDialogOpen(false);
        fetchUsers(); // Refresh list
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center h-48">
        <Loader2 className="animate-spin mr-2" /> Loading users...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage staff roles and access levels.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No users found
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {user.user_id}
                        </TableCell>
                        <TableCell>{user.business_name}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(user)}
                          >
                            <Pencil className="w-4 h-4 mr-1" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards equivalent (simplified for brevity) */}
              <div className="md:hidden space-y-4">
                {users.map((u) => (
                  <div key={u.id} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm truncate w-1/2">
                        {u.user_id}
                      </span>
                      <Badge className={getRoleBadgeColor(u.role)}>
                        {u.role}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      {u.business_name}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleEditClick(u)}
                    >
                      Edit Role
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Assign a new role to this user. This determines their permissions
              across the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={newRole}
                onValueChange={(val) => setNewRole(val as Role)}
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.CASHIER}>Cashier</SelectItem>
                  <SelectItem value={ROLES.SUPERVISOR}>Supervisor</SelectItem>
                  <SelectItem value={ROLES.MANAGER}>Manager</SelectItem>
                  <SelectItem value={ROLES.SUPER_ADMIN}>Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newRole === "cashier" && "Sales, payments, shift view only."}
                {newRole === "supervisor" &&
                  "Cashier + Voids, Discounts, Reports."}
                {newRole === "manager" &&
                  "Supervisor + Inventory, Pricing, Staff Management."}
                {newRole === "super_admin" && "Full System Access."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleUpdate}
              disabled={isUpdating || !newRole}
            >
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
