"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/lib/hooks/use-business";
import { usePermission } from "@/lib/hooks/use-permission";
import {
  Archive,
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { AICreditPanel } from "@/components/credit/AICreditPanel";
import { toast } from "sonner";
import { CustomerDetailSkeleton } from "@/components/skeletons/customer-detail-skeleton";
import { getDefaultPrivacyProtocol } from "@/lib/privacy/profiles";
import type { PrivacyProtocolSettings } from "@/lib/privacy/types";
import {
  maskAlias,
  maskSensitiveText,
  shouldMaskFromProtocol,
} from "@/lib/privacy/masking";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";

interface CustomerTransaction {
  id: string;
  order_number: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string | null;
  created_by: string | null;
  created_at: string;
}

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
  const { hasPermission, loading: permissionLoading } = usePermission(
    business?.id,
  );
  const [customer, setCustomer] = useState<any>(null);
  const [metrics, setMetrics] = useState<CreditMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyProtocol, setPrivacyProtocol] =
    useState<PrivacyProtocolSettings>(getDefaultPrivacyProtocol());
  const [manualScreenPrivacyEnabled, setManualScreenPrivacyEnabled] =
    useState(false);
  const [lifecyclePending, setLifecyclePending] = useState(false);

  useEffect(() => {
    if (!business?.id) return;

    const fetchData = async () => {
      try {
        // Fetch customer details via API
        const res = await fetch(`/api/customers/${customerId}`);
        if (!res.ok) throw new Error("Failed to load customer");
        const data = await res.json();

        setCustomer(data);

        if (data.metrics) {
          setMetrics({
            sales_30d: Number(data.metrics.sales_30d || 0),
            sales_90d: Number(data.metrics.sales_90d || 0),
            sales_all_time: Number(data.metrics.sales_all_time || 0),
            credit_issued_30d: Number(data.metrics.credit_issued_30d || 0),
            credit_issued_90d: Number(data.metrics.credit_issued_90d || 0),
            current_credit_balance: Number(
              data.metrics.current_credit_balance || 0,
            ),
            on_time_repayment_ratio: Number(
              data.metrics.on_time_repayment_ratio || 0,
            ),
            late_payment_count: data.metrics.late_payment_count || 0,
          });
        }

        const [settingsRes, preferenceRes] = await Promise.all([
          fetch("/api/business/settings"),
          fetch("/api/privacy/protexion/preferences"),
        ]);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setPrivacyProtocol(
            settingsData.privacy_protocol ||
              settingsData.privacyProtocol ||
              getDefaultPrivacyProtocol(),
          );
        }
        if (preferenceRes.ok) {
          const preferenceData = await preferenceRes.json();
          setManualScreenPrivacyEnabled(!!preferenceData?.manual_enabled);
        }
      } catch (error) {
        toast.error("Failed to load customer details");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [business?.id, customerId]);

  const can_apply_changes =
    !permissionLoading && hasPermission("customers.manage");

  const handleLifecycleChange = async (isActive: boolean) => {
    if (lifecyclePending) return;
    setLifecyclePending(true);
    const action = isActive ? "reactivate" : "archive";
    const promise = async () => {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Failed to ${action} customer`);
      }

      const updated = await response.json();
      setCustomer((current: any) => ({ ...current, ...updated }));
      return `Customer ${isActive ? "reactivated" : "archived"}`;
    };

    const lifecyclePromise = promise();
    toast.promise(lifecyclePromise, {
      loading: `${isActive ? "Reactivating" : "Archiving"} customer...`,
      success: (message) => message,
      error: (error) =>
        error instanceof Error ? error.message : `Failed to ${action} customer`,
    });

    try {
      await lifecyclePromise;
    } catch {
      // The toast presents the API error without exposing profile data.
    } finally {
      setLifecyclePending(false);
    }
  };

  if (businessLoading || loading) {
    return <CustomerDetailSkeleton />;
  }

  if (!business || !customer) {
    return <div className="p-4 md:p-8">Customer not found</div>;
  }

  const shouldMask = shouldMaskFromProtocol(
    privacyProtocol,
    manualScreenPrivacyEnabled,
    false,
  );

  const displayName =
    customer.alias ||
    [
      customer.firstName || customer.first_name,
      customer.lastName || customer.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Customer";
  const isActive = customer.isActive ?? customer.is_active ?? true;
  const transactions = (
    Array.isArray(customer.transaction_history)
      ? customer.transaction_history
      : []
  ) as CustomerTransaction[];

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/customers")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold break-words">
              {shouldMask ? maskAlias(displayName) : displayName}
            </h1>
          </div>
        </div>

        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Credit Panel
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle>AI Credit Panel</SheetTitle>
              </SheetHeader>
              <div className="p-4 overflow-y-auto">
                <AICreditPanel
                  customer_id={customer.id}
                  current_limit={Number(
                    customer.creditLimit || customer.credit_limit || 0,
                  )}
                  ai_recommended_limit={Number(
                    customer.creditLimitAiRecommended ||
                      customer.credit_limit_ai_recommended ||
                      0,
                  )}
                  risk_score={Number(
                    customer.creditRiskScore || customer.credit_risk_score || 0,
                  )}
                  last_reviewed_at={
                    customer.creditLimitLastReviewedAt ||
                    customer.credit_limit_last_reviewed_at
                  }
                  can_apply={can_apply_changes}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {!permissionLoading && hasPermission("customers.manage") ? (
          <Button
            variant="outline"
            disabled={lifecyclePending}
            onClick={() => void handleLifecycleChange(!isActive)}
          >
            {isActive ? (
              <Archive className="h-4 w-4 mr-2" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            {isActive ? "Archive Customer" : "Reactivate Customer"}
          </Button>
        ) : null}
      </div>

      {!isActive ? (
        <div
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          This customer is archived. Transaction history remains available, and
          authorized operators can reactivate the profile.
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {privacyProtocol.fields.email.visible ? (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm">
                        {shouldMask
                          ? maskSensitiveText()
                          : customer.email || "N/A"}
                      </p>
                    </div>
                  </div>
                ) : null}
                {privacyProtocol.fields.phone.visible ? (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm">
                        {shouldMask
                          ? maskSensitiveText()
                          : customer.phoneNumber ||
                            customer.phone_number ||
                            "N/A"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
              {privacyProtocol.fields.address.visible ? (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm">
                      {shouldMask
                        ? maskSensitiveText()
                        : `${customer.address || "N/A"}${customer.city ? `, ${customer.city}` : ""}${
                            customer.state ? `, ${customer.state}` : ""
                          }${
                            customer.zipCode || customer.zip_code
                              ? ` ${customer.zipCode || customer.zip_code}`
                              : ""
                          }`}
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Sales & Credit Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Sales & Credit Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#161616] border border-white/10 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Sales (30 Days)
                  </p>
                  <p className="text-xl font-bold font-mono text-white mt-1">
                    ${(metrics?.sales_30d || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#161616] border border-white/10 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Sales (90 Days)
                  </p>
                  <p className="text-xl font-bold font-mono text-white mt-1">
                    ${(metrics?.sales_90d || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#161616] border border-white/10 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Sales
                  </p>
                  <p className="text-xl font-bold font-mono text-white mt-1">
                    $
                    {(
                      customer.totalPurchases ||
                      customer.total_purchases ||
                      0
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#161616] border border-white/10 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Credit Used
                  </p>
                  <p className="text-xl font-bold font-mono text-white mt-1">
                    $
                    {(
                      customer.totalCreditUsed ||
                      customer.total_credit_used ||
                      0
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#161616] border border-white/10 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Current Balance
                  </p>
                  <p className="text-xl font-bold font-mono text-white mt-1">
                    ${(metrics?.current_credit_balance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#161616] border border-white/10 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    On-Time Ratio
                  </p>
                  <p className="text-xl font-bold font-mono text-[#4ADE80] mt-1">
                    {((metrics?.on_time_repayment_ratio || 0) * 100).toFixed(0)}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No customer transactions have been recorded.
                </p>
              ) : (
                <div className="divide-y">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <Link
                          href={`/sales/${transaction.id}`}
                          className="font-medium hover:underline"
                        >
                          {transaction.order_number || "Sale"}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(transaction.created_at))}
                          {transaction.payment_method
                            ? ` • ${transaction.payment_method}`
                            : ""}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="font-semibold">
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: "USD",
                          }).format(transaction.total_amount)}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {transaction.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {privacyProtocol.fields.notes.visible ? (
            <Card>
              <CardHeader>
                <CardTitle>Credit Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {shouldMask
                    ? maskSensitiveText()
                    : customer.notes || customer.credit_notes || "No notes"}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Sidebar - AI Credit Panel */}
        <div className="hidden lg:block">
          <AICreditPanel
            customer_id={customer.id}
            current_limit={Number(
              customer.creditLimit || customer.credit_limit || 0,
            )}
            ai_recommended_limit={Number(
              customer.creditLimitAiRecommended ||
                customer.credit_limit_ai_recommended ||
                0,
            )}
            risk_score={Number(
              customer.creditRiskScore || customer.credit_risk_score || 0,
            )}
            last_reviewed_at={
              customer.creditLimitLastReviewedAt ||
              customer.credit_limit_last_reviewed_at
            }
            can_apply={can_apply_changes}
          />
        </div>
      </div>
    </div>
  );
}
