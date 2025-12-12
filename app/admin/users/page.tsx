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
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
        .select(`
          *,
          business_profile!inner(business_name, id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Also fetch admin users
      const { data: adminUsers } = await supabase
        .from("admin_users")
        .select("*");

      // Combine and format
      const formattedUsers = (data || []).map((role) => ({
        id: role.id,
        user_id: role.user_id,
        role: role.role,
        business_name: role.business_profile?.business_name || "N/A",
        business_id: role.business_profile?.id || null,
        permissions: role.permissions,
        created_at: role.created_at,
        is_admin: false,
      }));

      const adminFormatted = (adminUsers || []).map((admin) => ({
        id: admin.id,
        user_id: admin.user_id,
        role: admin.role,
        business_name: "System Admin",
        business_id: null,
        permissions: {},
        created_at: admin.created_at,
        is_admin: true,
      }));

      setUsers([...formattedUsers, ...adminFormatted]);
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-2">Manage system users and roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users found</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {users.map((user) => (
                  <Card key={user.id} className="border-border/80">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium break-all">{user.user_id}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {user.business_name}
                          </p>
                        </div>
                        <span
                          className={
                            "text-xs font-medium " +
                            (user.is_admin
                              ? "text-purple-600"
                              : "text-muted-foreground")
                          }
                        >
                          {user.is_admin ? "Admin" : "Business User"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Role</p>
                          <p className="font-medium capitalize">{user.role}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm">{user.user_id}</TableCell>
                      <TableCell>
                        <span className="capitalize">{user.role}</span>
                      </TableCell>
                      <TableCell>{user.business_name}</TableCell>
                      <TableCell>
                        <span
                          className={
                            user.is_admin
                              ? "text-purple-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {user.is_admin ? "Admin" : "Business User"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
