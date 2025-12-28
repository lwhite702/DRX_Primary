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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    fetchBusinesses();
  }, [supabase]);

  const fetchBusinesses = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("business_profile")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      toast.error("Failed to load businesses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (
    businessId: string,
    currentStatus: boolean
  ) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("business_profile")
        .update({ is_active: !currentStatus })
        .eq("id", businessId);

      if (error) throw error;
      toast.success(`Business ${!currentStatus ? "activated" : "deactivated"}`);
      fetchBusinesses();
    } catch (error) {
      toast.error("Failed to update business status");
      console.error(error);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      toast.error("Supabase not available");
      return;
    }

    if (!businessName || !ownerEmail) {
      toast.error("Business name and owner email are required");
      return;
    }

    setCreateLoading(true);

    try {
      // Get the owner user ID from their email
      const {
        data: { users },
      } = await supabase.auth.admin.listUsers();

      let ownerId: string | null = null;
      if (users) {
        const owner = users.find((u: any) => u.email === ownerEmail);
        ownerId = owner?.id || null;
      }

      if (!ownerId) {
        toast.error(
          "User with this email not found. Please ensure the user has signed up."
        );
        setCreateLoading(false);
        return;
      }

      // Create business
      const { data: business, error: businessError } = await supabase
        .from("business_profile")
        .insert({
          business_name: businessName,
          business_type: businessType || null,
          owner_id: ownerId,
          is_active: true,
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // Create user role
      const { error: roleError } = await supabase.from("user_roles").insert({
        business_id: business.id,
        user_id: ownerId,
        role: "owner",
        permissions: {},
      });

      if (roleError) throw roleError;

      // Create business settings
      const { error: settingsError } = await supabase
        .from("business_settings")
        .insert({
          business_id: business.id,
          default_tax_rate: 0.08,
          currency: "USD",
          timezone: "America/New_York",
        });

      if (settingsError) throw settingsError;

      toast.success(`Business "${businessName}" created successfully`);
      setShowCreateDialog(false);
      setBusinessName("");
      setBusinessType("");
      setOwnerEmail("");
      fetchBusinesses();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create business"
      );
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Businesses</h1>
          <p className="text-muted-foreground mt-2">
            Manage all businesses in the system
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Business
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Business</DialogTitle>
              <DialogDescription>
                Create a new business and assign it to an owner
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Acme Dispensary"
                  disabled={createLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Input
                  id="businessType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="e.g., Retail, Wholesale"
                  disabled={createLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Owner Email *</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  disabled={createLoading}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={createLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? "Creating..." : "Create Business"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Businesses ({businesses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {businesses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No businesses found
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {businesses.map((business) => (
                  <Card key={business.id} className="border-border/80">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium break-words">
                            {business.business_name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {business.business_type || "-"}
                            {business.city && business.state
                              ? ` • ${business.city}, ${business.state}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={
                            "text-xs font-medium mt-1 " +
                            (business.is_active
                              ? "text-green-600"
                              : "text-muted-foreground")
                          }
                        >
                          {business.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {(business.phone_number || business.email) && (
                        <div className="mt-3 text-sm">
                          {business.phone_number && (
                            <p>{business.phone_number}</p>
                          )}
                          {business.email && (
                            <p className="text-muted-foreground break-words">
                              {business.email}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Created{" "}
                          {new Date(business.created_at).toLocaleDateString()}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleToggleActive(business.id, business.is_active)
                          }
                        >
                          {business.is_active ? "Deactivate" : "Activate"}
                        </Button>
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
                      <TableHead>Business Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businesses.map((business) => (
                      <TableRow key={business.id}>
                        <TableCell className="font-medium">
                          {business.business_name}
                        </TableCell>
                        <TableCell>{business.business_type || "-"}</TableCell>
                        <TableCell>
                          {business.city && business.state
                            ? `${business.city}, ${business.state}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {business.phone_number && (
                              <p className="text-sm">{business.phone_number}</p>
                            )}
                            {business.email && (
                              <p className="text-sm text-muted-foreground">
                                {business.email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(business.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              business.is_active
                                ? "text-green-600 font-medium"
                                : "text-gray-500"
                            }
                          >
                            {business.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleActive(
                                business.id,
                                business.is_active
                              )
                            }
                          >
                            {business.is_active ? "Deactivate" : "Activate"}
                          </Button>
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
