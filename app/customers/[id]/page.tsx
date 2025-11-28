"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusiness } from "@/lib/hooks/use-business";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { AICreditPanel } from "@/components/credit/AICreditPanel";
import { toast } from "sonner";

interface CustomerDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  customer_type: string;
  total_purchases: number;
  total_credit_used: number;
  credit_limit: number;
  credit_limit_ai_recommended: number;
  credit_risk_score: number;
  credit_limit_last_reviewed_at: string;
  credit_notes: string;
  is_active: boolean;
  created_at: string;
}

interface CreditMetrics {
  sales_30d: number;
  sales_90d: number;
  sales_all_time: number;
  credit_issued_30d: number;
  credit_issued_90d: number;
  current_credit_balance: number;
  on_time_repayment_ratio: number;
  late_payment_count: number;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const { business, loading: businessLoading } = useBusiness();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [metrics, setMetrics] = useState<CreditMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [user_id, setUser_id] = useState<string>("");
  const [can_apply_changes, setCan_apply_changes] = useState(false);

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!business?.id) return;

    const fetchData = async () => {
      if (!supabase) return;

      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUser_id(user.id);
          // In a real app, check user role for can_apply_changes
          setCan_apply_changes(true);
        }

        // Fetch customer details
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("*")
          .eq("id", customerId)
          .eq("business_id", business.id)
          .single();

        if (customerError) throw customerError;
        setCustomer(customerData);

        // Fetch credit metrics from view
        const { data: metricsData, error: metricsError } = await supabase
          .from("v_credit_analytics")
          .select(
            "sales_30d, sales_90d, sales_all_time, credit_issued_30d, credit_issued_90d, current_credit_balance, on_time_repayment_ratio, late_payment_count"
          )
          .eq("customer_id", customerId)
          .single();

        if (!metricsError && metricsData) {
          setMetrics({
            sales_30d: Number(metricsData.sales_30d || 0),
            sales_90d: Number(metricsData.sales_90d || 0),
            sales_all_time: Number(metricsData.sales_all_time || 0),
            credit_issued_30d: Number(metricsData.credit_issued_30d || 0),
            credit_issued_90d: Number(metricsData.credit_issued_90d || 0),
            current_credit_balance: Number(metricsData.current_credit_balance || 0),
            on_time_repayment_ratio: Number(metricsData.on_time_repayment_ratio || 0),
            late_payment_count: metricsData.late_payment_count || 0,
          });
        }
      } catch (error) {
        toast.error("Failed to load customer details");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [business?.id, customerId, supabase]);

  if (businessLoading || loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!business || !customer) {
    return <div className="p-8">Customer not found</div>;
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/customers")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="text-muted-foreground mt-1">Customer ID: {customer.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{customer.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm">{customer.phone_number || "N/A"}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm">
                    {customer.address || "N/A"}
                    {customer.city && `, ${customer.city}`}
                    {customer.state && `, ${customer.state}`}
                    {customer.zip_code && ` ${customer.zip_code}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales & Credit Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Sales & Credit Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded">
                  <p className="text-xs text-muted-foreground">Sales (30 Days)</p>
                  <p className="text-xl font-bold">
                    ${(metrics?.sales_30d || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded">
                  <p className="text-xs text-muted-foreground">Sales (90 Days)</p>
                  <p className="text-xl font-bold">
                    ${(metrics?.sales_90d || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded">
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-xl font-bold">
                    ${(customer.total_purchases || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded">
                  <p className="text-xs text-muted-foreground">Total Credit Used</p>
                  <p className="text-xl font-bold">
                    ${(customer.total_credit_used || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded">
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="text-xl font-bold">
                    ${(metrics?.current_credit_balance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded">
                  <p className="text-xs text-muted-foreground">On-Time Ratio</p>
                  <p className="text-xl font-bold">
                    {((metrics?.on_time_repayment_ratio || 0) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{customer.credit_notes || "No notes"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - AI Credit Panel */}
        <div>
          <AICreditPanel
            customer_id={customer.id}
            business_id={business.id}
            current_limit={Number(customer.credit_limit || 0)}
            ai_recommended_limit={Number(customer.credit_limit_ai_recommended || 0)}
            risk_score={Number(customer.credit_risk_score || 0)}
            last_reviewed_at={customer.credit_limit_last_reviewed_at}
            can_apply={can_apply_changes}
            user_id={user_id}
          />
        </div>
      </div>
    </div>
  );
}
