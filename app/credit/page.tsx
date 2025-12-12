"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBusiness } from "@/lib/hooks/use-business";
import { useRealtimeCredit } from "@/lib/hooks/use-realtime";
import { creditSystem } from "@/lib/utils/credit-system";
import { getSupabaseClient } from "@/lib/supabase/client";
import { CreditExposureDashboard } from "@/components/credit/CreditExposureDashboard";
import { Plus, DollarSign, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const creditExtensionSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
  due_date: z.string().date(),
});

const creditPaymentSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
});

export default function CreditPage() {
  const { business, loading: businessLoading } = useBusiness();
  const creditTransactions = useRealtimeCredit(business?.id || null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [creditLimits, setCreditLimits] = useState<Map<string, any>>(new Map());
  const [agingData, setAgingData] = useState<any[]>([]);
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const supabase = getSupabaseClient();

  const extensionForm = useForm({
    resolver: zodResolver(creditExtensionSchema),
    defaultValues: {
      customer_id: "",
      amount: 0,
      description: "",
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
  });

  const paymentForm = useForm({
    resolver: zodResolver(creditPaymentSchema),
    defaultValues: {
      customer_id: "",
      amount: 0,
      description: "",
    },
  });

  useEffect(() => {
    if (!business?.id || !supabase) return;

    fetchCustomers();
    fetchCreditLimits();
    fetchAgingData();
  }, [business?.id, supabase]);

  const fetchCustomers = async () => {
    if (!business?.id || !supabase) return;

    const { data } = await supabase
      .from("customers")
      .select("id, first_name, last_name")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("first_name");

    if (data) setCustomers(data);
  };

  const fetchCreditLimits = async () => {
    if (!business?.id || !supabase) return;

    const { data } = await supabase
      .from("credit_limits")
      .select("customer_id, max_credit_limit, current_balance")
      .eq("business_id", business.id);

    if (data) {
      const map = new Map();
      data.forEach((limit) => {
        map.set(limit.customer_id, limit);
      });
      setCreditLimits(map);
    }
  };

  const fetchAgingData = async () => {
    if (!business?.id) return;

    const result = await creditSystem.getCreditAging(business.id);
    if (result.success && result.data) {
      setAgingData(result.data);
    }
  };

  const handleExtension = async (data: any) => {
    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    const result = await creditSystem.extendCredit(
      business.id,
      data.customer_id,
      data.amount,
      data.description || "",
      data.due_date
    );

    if (result.success) {
      toast.success("Credit extended successfully");
      setShowExtensionDialog(false);
      extensionForm.reset();
      fetchCreditLimits();
      fetchAgingData();
    } else {
      toast.error(result.error || "Failed to extend credit");
    }
  };

  const handlePayment = async (data: any) => {
    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    const result = await creditSystem.processPayment(
      business.id,
      data.customer_id,
      data.amount,
      data.description || ""
    );

    if (result.success) {
      toast.success("Payment processed successfully");
      setShowPaymentDialog(false);
      paymentForm.reset();
      fetchCreditLimits();
      fetchAgingData();
    } else {
      toast.error(result.error || "Failed to process payment");
    }
  };

  const pendingTransactions = creditTransactions.filter(
    (tx) => tx.status === "pending"
  );
  const delinquentCount = agingData.filter(
    (a) => a.bucket_31_plus > 0 || a.bucket_15_30 > 0
  ).length;

  if (businessLoading) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8">
        No business found. Please set up your business first.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credit Management</h1>
          <p className="text-muted-foreground mt-2">
            Track credit transactions and fronts
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <DollarSign className="h-4 w-4 mr-2" />
                Process Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Process Credit Payment</DialogTitle>
                <DialogDescription>
                  Record a payment against a credit account
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={paymentForm.handleSubmit(handlePayment)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select
                    value={paymentForm.watch("customer_id")}
                    onValueChange={(value) =>
                      paymentForm.setValue("customer_id", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.first_name} {customer.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...paymentForm.register("amount", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input {...paymentForm.register("description")} />
                </div>
                <div className="flex justify-end gap-2">
                   <Button
                     type="button"
                     variant="outline"
                     onClick={() => setShowPaymentDialog(false)}
                     disabled={paymentForm.formState.isSubmitting}
                   >
                     Cancel
                   </Button>
                   <Button type="submit" disabled={paymentForm.formState.isSubmitting}>
                     {paymentForm.formState.isSubmitting ? "Processing..." : "Process Payment"}
                   </Button>
                 </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog
            open={showExtensionDialog}
            onOpenChange={setShowExtensionDialog}
          >
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Extend Credit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Extend Credit (Front)</DialogTitle>
                <DialogDescription>
                  Extend credit to a customer
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={extensionForm.handleSubmit(handleExtension)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select
                    value={extensionForm.watch("customer_id")}
                    onValueChange={(value) =>
                      extensionForm.setValue("customer_id", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => {
                        const limit = creditLimits.get(customer.id);
                        return (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.first_name} {customer.last_name}
                            {limit &&
                              ` (Balance: $${Number(
                                limit.current_balance
                              ).toFixed(2)} / $${Number(
                                limit.max_credit_limit
                              ).toFixed(2)})`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...extensionForm.register("amount", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input type="date" {...extensionForm.register("due_date")} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input {...extensionForm.register("description")} />
                </div>
                <div className="flex justify-end gap-2">
                   <Button
                     type="button"
                     variant="outline"
                     onClick={() => setShowExtensionDialog(false)}
                     disabled={extensionForm.formState.isSubmitting}
                   >
                     Cancel
                   </Button>
                   <Button type="submit" disabled={extensionForm.formState.isSubmitting}>
                     {extensionForm.formState.isSubmitting ? "Processing..." : "Extend Credit"}
                   </Button>
                 </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI Credit Exposure Dashboard */}
      <CreditExposureDashboard business_id={business.id} />

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Pending Transactions
            </p>
            <p className="text-2xl font-bold">{pendingTransactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Delinquent Accounts</p>
            <p className="text-2xl font-bold text-destructive">
              {delinquentCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
            <p className="text-2xl font-bold">
              $
              {agingData
                .reduce((sum, a) => sum + Number(a.total_outstanding || 0), 0)
                .toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Aging */}
      {agingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Credit Aging Report</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {agingData.map((aging) => {
                const hasDelinquent = Number(aging.bucket_31_plus) > 0
                return (
                  <Card key={aging.customer_id} className="border-border/80">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium break-words">{aging.customer_name}</p>
                        <p className="font-bold">${Number(aging.total_outstanding).toFixed(2)}</p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">1–7 Days</p>
                          <p className="font-medium">${Number(aging.bucket_1_7).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">8–14 Days</p>
                          <p className="font-medium">${Number(aging.bucket_8_14).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">15–30 Days</p>
                          <p className="font-medium">${Number(aging.bucket_15_30).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">31+ Days</p>
                          <p className={hasDelinquent ? "font-bold text-destructive" : "font-medium"}>
                            ${Number(aging.bucket_31_plus).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>1-7 Days</TableHead>
                    <TableHead>8-14 Days</TableHead>
                    <TableHead>15-30 Days</TableHead>
                    <TableHead>31+ Days</TableHead>
                    <TableHead>Total Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingData.map((aging) => (
                    <TableRow key={aging.customer_id}>
                      <TableCell className="font-medium">
                        {aging.customer_name}
                      </TableCell>
                      <TableCell>${Number(aging.bucket_1_7).toFixed(2)}</TableCell>
                      <TableCell>${Number(aging.bucket_8_14).toFixed(2)}</TableCell>
                      <TableCell>${Number(aging.bucket_15_30).toFixed(2)}</TableCell>
                      <TableCell
                        className={
                          aging.bucket_31_plus > 0
                            ? "text-destructive font-bold"
                            : ""
                        }
                      >
                        ${Number(aging.bucket_31_plus).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-bold">
                        ${Number(aging.total_outstanding).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Credit Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {creditTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No transactions yet
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {creditTransactions.slice(0, 20).map((tx) => (
                  <Card key={tx.id} className="border-border/80">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium capitalize">
                            {tx.transaction_type}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(tx.created_at).toLocaleDateString()}
                            {tx.due_date
                              ? ` • Due ${new Date(tx.due_date).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${Number(tx.amount).toFixed(2)}</p>
                          <p
                            className={
                              "text-xs mt-1 capitalize " +
                              (tx.status === "completed"
                                ? "text-green-600"
                                : tx.status === "pending"
                                ? "text-yellow-600"
                                : "text-muted-foreground")
                            }
                          >
                            {tx.status}
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
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditTransactions.slice(0, 20).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {new Date(tx.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="capitalize">
                          {tx.transaction_type}
                        </TableCell>
                        <TableCell>${Number(tx.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          {tx.due_date
                            ? new Date(tx.due_date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              tx.status === "completed"
                                ? "text-green-600"
                                : tx.status === "pending"
                                ? "text-yellow-600"
                                : "text-gray-600"
                            }
                          >
                            {tx.status}
                          </span>
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
