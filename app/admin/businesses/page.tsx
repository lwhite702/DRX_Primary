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
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Toggle } from "@/components/ui/toggle";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleToggleActive = async (businessId: string, currentStatus: boolean) => {
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

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Businesses</h1>
        <p className="text-muted-foreground mt-2">Manage all businesses in the system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Businesses ({businesses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {businesses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No businesses found</p>
          ) : (
            <div className="overflow-x-auto">
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
                      <TableCell className="font-medium">{business.business_name}</TableCell>
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
                            <p className="text-sm text-muted-foreground">{business.email}</p>
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
                          onClick={() => handleToggleActive(business.id, business.is_active)}
                        >
                          {business.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
