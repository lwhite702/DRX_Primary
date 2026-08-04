"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/lib/hooks/use-business";
import { createAppClient } from "@/lib/data/client/supabase-client";
import { PermissionGuard } from "@/components/auth/role-guard";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface InventoryLog {
  id: string;
  created_at: string;
  transaction_type: string;
  quantity_change: number;
  reason: string;
  product_name: string; // Joined field
  sku: string; // Joined field
  created_by_email: string; // Joined field (or name)
  metadata: Record<string, unknown>;
}

export default function InventoryAuditPage() {
  const { business } = useBusiness();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;

    const fetchLogs = async () => {
      setLoading(true);
      const supabase = createAppClient();

      // Fetch logs joined with inventory details
      // Note: This assumes RLS policies allow reading inventory_log
      const { data, error } = await supabase
        .from("inventory_log")
        .select(
          `
          *,
          inventory:inventory_id (product_name, sku, unit_of_measure),
          user:created_by (email) 
        `,
        ) // Note: 'user' join depends on schema relation. often auth.users is not directly joinable via client sdk effectively without view.
        // Fallback: If 'created_by' is UUID, we might just show ID or fetch profiles if available.
        // Let's assume there is a public_profile or similar, or just show the ID/email if view exists.
        // For now, let's fetch raw log and inventory. 'user' might fail if not linked.
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching logs:", error);
      } else {
        // Transform data
        const formatted = (data || []).map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          transaction_type: item.transaction_type,
          quantity_change: item.quantity_change,
          reason: item.reason,
          product_name: item.inventory?.product_name || "Deleted Item",
          sku: item.inventory?.sku || "N/A",
          created_by_email: item.user?.email || "System", // item.created_by,
          metadata: item.metadata,
        }));
        setLogs(formatted);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [business?.id]);

  return (
    <PermissionGuard
      requiredPermission="audit.view"
      fallback={<div>Access Denied</div>}
    >
      <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 page-transition">
        <div className="noise-overlay" />
        <div className="relative z-10">
          <h1 className="headline-text text-3xl tracking-widest text-muted-foreground">
            INVENTORY AUDIT LOG
          </h1>
          <p className="technical-label text-xs text-muted-foreground/60 mt-1">
            TRANSACTION HISTORY & COMPLIANCE
          </p>
        </div>

        <div className="luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border">
          <div className="p-6 border-b border-white/5 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-info" />
            <h2 className="headline-text text-lg tracking-wider text-blue-500">
              RECENT ACTIVITY
            </h2>
          </div>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="border-white/5 hover:bg-white/[0.02]"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`
                             uppercase text-[10px] tracking-wider border-0
                             ${log.transaction_type === "intake" ? "bg-success/10 text-success" : ""}
                             ${log.transaction_type === "adjustment" ? "bg-warning/10 text-warning" : ""}
                             ${log.transaction_type === "sale" ? "bg-blue-500/10 text-blue-500" : ""}
                           `}
                        >
                          {log.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {log.product_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {log.sku}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-bold ${log.quantity_change > 0 ? "text-success" : "text-destructive"}`}
                      >
                        {log.quantity_change > 0 ? "+" : ""}
                        {log.quantity_change}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground max-w-[200px] truncate"
                        title={log.reason}
                      >
                        {log.reason}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {log.created_by_email?.split("@")[0] ||
                          log.created_by_email}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </div>
      </div>
    </PermissionGuard>
  );
}
