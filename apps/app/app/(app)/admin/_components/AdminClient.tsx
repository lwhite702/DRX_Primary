"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Building2, Users, FileText, Brain } from "lucide-react";
import Link from "next/link";

export default function AdminClient() {
  const [stats, setStats] = useState({
    businesses: 0,
    users: 0,
    auditLogs: 0,
    aiFailures: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    async function fetchStats() {
      try {
        // Check if user is admin
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: adminCheck } = await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (!adminCheck) {
          setLoading(false);
          return;
        }

        // Fetch stats
        const [businesses, users, auditLogs, aiFailures] = await Promise.all([
          supabase.from("business_profile").select("id", { count: "exact" }),
          supabase.from("user_roles").select("id", { count: "exact" }),
          supabase.from("system_audit_log").select("id", { count: "exact" }),
          supabase
            .from("ai_insights_failures")
            .select("id", { count: "exact" }),
        ]);

        setStats({
          businesses: businesses.count || 0,
          users: users.count || 0,
          auditLogs: auditLogs.count || 0,
          aiFailures: aiFailures.count || 0,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [supabase]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="text-sm text-muted-foreground">v0.3.3</p>
        </div>
        <p className="text-muted-foreground mt-2">
          Enterprise administration and management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin/businesses">
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Businesses</p>
                  <p className="text-3xl font-bold mt-2">{stats.businesses}</p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="text-3xl font-bold mt-2">{stats.users}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/audit">
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Audit Logs</p>
                  <p className="text-3xl font-bold mt-2">{stats.auditLogs}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/ai">
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Failures</p>
                  <p className="text-3xl font-bold mt-2">{stats.aiFailures}</p>
                </div>
                <Brain className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/businesses">
          <Card className="p-6 hover:bg-muted/50 cursor-pointer transition-colors">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Businesses
            </h3>
            <p className="text-muted-foreground mt-2">
              Manage connected businesses
            </p>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="p-6 hover:bg-muted/50 cursor-pointer transition-colors">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </h3>
            <p className="text-muted-foreground mt-2">
              Manage system users and roles
            </p>
          </Card>
        </Link>

        <Link href="/admin/audit">
          <Card className="p-6 hover:bg-muted/50 cursor-pointer transition-colors">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Logs
            </h3>
            <p className="text-muted-foreground mt-2">
              View system audit trails
            </p>
          </Card>
        </Link>

        <Link href="/admin/ai">
          <Card className="p-6 hover:bg-muted/50 cursor-pointer transition-colors">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Management
            </h3>
            <p className="text-muted-foreground mt-2">
              Configure AI systems and view failures
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
