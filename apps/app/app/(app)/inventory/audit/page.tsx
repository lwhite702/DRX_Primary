"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/components/auth/role-guard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InventoryLog {
  id: string;
  created_at: string;
  transaction_type: string;
  quantity_change: number;
  reason: string;
  product_name: string;
  sku: string;
  created_by_email: string;
}

export default function InventoryAuditPage() {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/inventory/audit", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Failed to load audit log");
        setLogs(Array.isArray(body.data) ? body.data : []);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error("Failed to load inventory audit log", error);
          setLogs([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <PermissionGuard requiredPermission="audit.view" fallback={<div>Access Denied</div>}>
      <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 page-transition">
        <div className="noise-overlay" />
        <div className="relative z-10">
          <h1 className="headline-text text-3xl tracking-widest text-muted-foreground">
            INVENTORY AUDIT LOG
          </h1>
          <p className="technical-label text-xs text-muted-foreground/60 mt-1">
            TRANSACTION HISTORY &amp; COMPLIANCE
          </p>
        </div>

        <div className="luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border">
          <div className="p-6 border-b border-white/5 flex items-center gap-2">
<<<<<<< HEAD
            <div className="h-2 w-2 rounded-full bg-info" />
            <h2 className="headline-text text-lg tracking-wider text-blue-500">
              RECENT ACTIVITY
            </h2>
=======
            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3B82F6]" />
            <h2 className="headline-text text-lg tracking-wider text-blue-500">RECENT ACTIVITY</h2>
>>>>>>> origin/main
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
                    <TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Product</TableHead>
                    <TableHead className="text-right">Change</TableHead><TableHead>Reason</TableHead>
                    <TableHead className="text-right">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, HH:mm")}
                      </TableCell>
<<<<<<< HEAD
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
=======
                      <TableCell><Badge variant="outline" className="uppercase text-[10px] tracking-wider border-0">{log.transaction_type}</Badge></TableCell>
                      <TableCell><div className="flex flex-col"><span className="font-medium text-sm">{log.product_name}</span><span className="text-[10px] text-muted-foreground">{log.sku}</span></div></TableCell>
                      <TableCell className={`text-right font-mono font-bold ${log.quantity_change > 0 ? "text-green-500" : "text-red-500"}`}>
                        {log.quantity_change > 0 ? "+" : ""}{log.quantity_change}
>>>>>>> origin/main
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={log.reason}>{log.reason}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{log.created_by_email?.split("@")[0] || log.created_by_email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </div>
      </div>
    </PermissionGuard>
  );
}
