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
import { AlertTriangle } from "lucide-react";

export function AdminAIClient() {
  const [failures, setFailures] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [supabase]);

  const fetchData = async () => {
    if (!supabase) return;

    try {
      const [failuresData, insightsData] = await Promise.all([
        supabase
          .from("ai_insights_failures")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("ai_insights")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (failuresData.error) throw failuresData.error;
      if (insightsData.error) throw insightsData.error;

      setFailures(failuresData.data || []);
      setInsights(insightsData.data || []);
    } catch (error) {
      toast.error("Failed to load AI data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Management</h1>
        <p className="text-muted-foreground mt-2">
          Configure AI systems and view failures
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Failures</p>
            <p className="text-3xl font-bold text-destructive">
              {failures.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Insights</p>
            <p className="text-3xl font-bold">{insights.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Failures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            AI Failures ({failures.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failures.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No failures recorded
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Business ID</TableHead>
                    <TableHead>Error Message</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failures.map((failure) => (
                    <TableRow key={failure.id}>
                      <TableCell className="text-sm">
                        {new Date(failure.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {failure.function_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {failure.business_id
                          ? failure.business_id.substring(0, 8) + "..."
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm text-destructive truncate">
                          {failure.error_message}
                        </p>
                      </TableCell>
                      <TableCell>
                        {failure.error_stack ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-muted-foreground">
                              Stack Trace
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-w-md">
                              {failure.error_stack}
                            </pre>
                          </details>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Insights ({insights.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No insights generated yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insights.map((insight) => (
                    <TableRow key={insight.id}>
                      <TableCell className="text-sm">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="capitalize">
                        {insight.insight_type}
                      </TableCell>
                      <TableCell className="font-medium">
                        {insight.insight_title}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            insight.priority === "critical"
                              ? "text-red-600 font-bold"
                              : insight.priority === "high"
                                ? "text-orange-600 font-medium"
                                : insight.priority === "medium"
                                  ? "text-yellow-600"
                                  : "text-gray-600"
                          }
                        >
                          {insight.priority}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize">
                        {insight.status}
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
