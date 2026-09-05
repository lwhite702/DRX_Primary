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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createAppClient } from "@/lib/data/client/supabase-client";
import { toast } from "sonner";
import { Search, Download, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AuditClient() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createAppClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const init = async () => {
      await Promise.all([fetchAuditLogs(), fetchBusinesses()]);
      setLoading(false);
    };

    init();
  }, [supabase, selectedBusiness]);

  const fetchBusinesses = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("business_profile")
        .select("id, name")
        .order("name");
      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Failed to load businesses", error);
    }
  };

  const fetchAuditLogs = async () => {
    if (!supabase) return;

    try {
      let query = supabase
        .from("system_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (selectedBusiness !== "all") {
        query = query.eq("business_id", selectedBusiness);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      toast.error("Failed to load audit logs");
      console.error(error);
    }
  };

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_id?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const exportLogs = (format: "csv" | "json") => {
    if (filteredLogs.length === 0) {
      toast.error("No logs to export");
      return;
    }

    let content = "";
    let mimeType = "";
    let fileName = `audit_logs_${new Date().toISOString().split("T")[0]}`;

    if (format === "csv") {
      const headers = [
        "Timestamp",
        "Action",
        "Entity Type",
        "Entity ID",
        "User ID",
        "Business ID",
      ];
      const rows = filteredLogs.map((log) => [
        new Date(log.created_at).toLocaleString(),
        log.action,
        log.entity_type,
        log.entity_id,
        log.user_id,
        log.business_id,
      ]);
      content = [headers, ...rows]
        .map((row) =>
          row
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");
      mimeType = "text/csv";
      fileName += ".csv";
    } else {
      content = JSON.stringify(filteredLogs, null, 2);
      mimeType = "application/json";
      fileName += ".json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${format.toUpperCase()} exported.`);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            System Audit Trails
          </h1>
          <p className="text-muted-foreground mt-1">
            Locked audit logs for security and compliance checks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportLogs("csv")}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportLogs("json")}
          >
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by action, user, or entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground h-4 w-4" />
              <Select
                value={selectedBusiness}
                onValueChange={(val) => setSelectedBusiness(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Businesses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  {businesses.map((biz) => (
                    <SelectItem key={biz.id} value={biz.id}>
                      {biz.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Badge variant="secondary" className="h-10 px-4">
                {filteredLogs.length} Records Found
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Entity</TableHead>
                  <TableHead>Actor (User)</TableHead>
                  <TableHead>Business/Tenant</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No audit records found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize font-mono text-[10px]"
                        >
                          {log.action?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium capitalize">
                            {log.entity_type || "N/A"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                            {log.entity_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono truncate max-w-[150px]">
                        {log.user_id || "System"}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {businesses.find((b) => b.id === log.business_id)
                            ?.name ||
                            log.business_id ||
                            "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.new_values || log.old_values ? (
                          <details className="cursor-pointer group">
                            <summary className="text-xs text-primary hover:underline list-none">
                              View Payload
                            </summary>
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm pointer-events-none group-open:pointer-events-auto opacity-0 group-open:opacity-100 transition-opacity">
                              <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl scale-95 group-open:scale-100 transition-transform">
                                <CardHeader className="border-b">
                                  <CardTitle className="text-lg flex justify-between items-center">
                                    Audit Detail
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        const details =
                                          e.currentTarget.closest("details");
                                        if (details) {
                                          details.open = false;
                                        }
                                      }}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      ×
                                    </button>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 overflow-auto">
                                  <div className="space-y-4">
                                    {log.old_values && (
                                      <div>
                                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">
                                          Old Values
                                        </h4>
                                        <pre className="text-[11px] bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
                                          {JSON.stringify(
                                            log.old_values,
                                            null,
                                            2,
                                          )}
                                        </pre>
                                      </div>
                                    )}
                                    {log.new_values && (
                                      <div>
                                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">
                                          New Values / Payload
                                        </h4>
                                        <pre className="text-[11px] bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
                                          {JSON.stringify(
                                            log.new_values,
                                            null,
                                            2,
                                          )}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground italic truncate">
                            No payload
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
