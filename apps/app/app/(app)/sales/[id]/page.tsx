"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerSelectorModal } from "@/components/pos/customer-selector-modal";
import { useBusiness } from "@/lib/hooks/use-business";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { toast } from "sonner";
import { ArrowLeft, User, Calendar, CreditCard, Package } from "lucide-react";
import { useCustomerContext } from "@/components/providers/customer-provider";

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const saleId = params.id as string;
  const { business } = useBusiness();
  const { isManager } = useUserRole(business?.id);

  const [sale, setSale] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const { customers } = useCustomerContext();
  const [loading, setLoading] = useState(true);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Payment Editing State
  const [showPaymentEdit, setShowPaymentEdit] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>("");
  const [newPaymentRef, setNewPaymentRef] = useState<string>("");
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // Initialize edit state when sale loads
  useEffect(() => {
    if (sale) {
      setNewPaymentMethod(sale.paymentMethod || sale.payment_method || "cash");
      setNewPaymentRef(sale.paymentRef || sale.payment_ref || "");
    }
  }, [sale]);

  const handleUpdatePayment = async () => {
    if (!business?.id) return;

    setUpdatingPayment(true);
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: newPaymentMethod,
          paymentRef: newPaymentMethod === "zelle" ? newPaymentRef : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update payment");

      toast.success("Payment method updated");

      // Update local state
      setSale({
        ...sale,
        paymentMethod: newPaymentMethod,
        paymentRef: newPaymentMethod === "zelle" ? newPaymentRef : null,
      });
      setShowPaymentEdit(false);
    } catch (error: any) {
      console.error("Error updating payment:", error);
      toast.error(error.message || "Failed to update payment");
    } finally {
      setUpdatingPayment(false);
    }
  };

  useEffect(() => {
    if (!saleId || !business?.id) return;

    const loadSaleDetails = async () => {
      try {
        const res = await fetch(`/api/sales/${saleId}`);
        if (!res.ok) throw new Error("Failed to load sale details");
        const data = await res.json();

        setSale(data);
        setLineItems(data.items || []);
        if (data.customer) setCustomer(data.customer);
      } catch (error) {
        console.error("Error loading sale details:", error);
        toast.error("Failed to load sale details");
      } finally {
        setLoading(false);
      }
    };

    loadSaleDetails();
  }, [saleId, business?.id]);

  const handleAssignCustomer = async (customerId: string) => {
    if (!business?.id) return;

    // Check if credit sale requires manager override
    const currentPaymentMethod = sale?.paymentMethod || sale?.payment_method;
    if (currentPaymentMethod === "credit" && !isManager) {
      toast.error("Manager or owner role required to reassign credit sales");
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to assign customer");
      const data = await res.json();

      if (data.success) {
        toast.success("Customer assigned successfully!");

        // Reload details
        const reloadRes = await fetch(`/api/sales/${saleId}`);
        if (reloadRes.ok) {
          const updatedData = await reloadRes.json();
          setSale(updatedData);
          setCustomer(updatedData.customer);
        }
      } else {
        toast.error(data.message || "Failed to assign customer");
      }
    } catch (error: any) {
      console.error("Error assigning customer:", error);
      toast.error(error.message || "Failed to assign customer");
    } finally {
      setAssigning(false);
      setShowCustomerSelector(false);
    }
  };

  if (loading) {
    return <div className="p-4 md:p-8">Loading sale details...</div>;
  }

  if (!sale) {
    return (
      <div className="p-4 md:p-8">
        <p>Sale not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold">Sale Details</h1>
            <p className="text-muted-foreground mt-1 break-words">
              Order #{sale.orderNumber || sale.order_number}
            </p>
          </div>
        </div>
        <Badge
          variant={
            (sale.orderStatus || sale.order_status) === "completed"
              ? "default"
              : "secondary"
          }
        >
          {sale.orderStatus || sale.order_status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sale Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {new Date(
                        sale.createdAt || sale.created_at,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Payment Method
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium capitalize">
                        {sale.paymentMethod || sale.payment_method}
                      </p>
                      {isManager && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowPaymentEdit(true)}
                        >
                          <span className="sr-only">Edit</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </Button>
                      )}
                    </div>
                    {(sale.paymentRef || sale.payment_ref) && (
                      <p className="text-xs text-muted-foreground">
                        Ref: {sale.paymentRef || sale.payment_ref}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Order Type</p>
                    <p className="font-medium capitalize">
                      {sale.orderType || sale.order_type}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${Number(sale.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>
                    ${Number(sale.taxAmount || sale.tax_amount || 0).toFixed(2)}
                  </span>
                </div>
                {Number(sale.deliveryPrice || sale.delivery_price || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery:</span>
                    <span>
                      $
                      {Number(
                        sale.deliveryPrice || sale.delivery_price,
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>
                    $
                    {Number(sale.totalAmount || sale.total_amount || 0).toFixed(
                      2,
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Edit Dialog */}
          <Dialog open={showPaymentEdit} onOpenChange={setShowPaymentEdit}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Payment Method</DialogTitle>
                <DialogDescription>
                  Change the payment method for this completed sale.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={newPaymentMethod}
                    onValueChange={setNewPaymentMethod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="zelle">Zelle</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newPaymentMethod === "zelle" && (
                  <div className="space-y-2 anim-slide-in">
                    <Label>Reference / Note</Label>
                    <Input
                      value={newPaymentRef}
                      onChange={(e) => setNewPaymentRef(e.target.value)}
                      placeholder="Zelle confirmation phone # or code"
                    />
                  </div>
                )}

                {newPaymentMethod === "credit" &&
                  (sale.paymentMethod || sale.payment_method) !== "credit" && (
                    <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200">
                      Warning: Switching to Credit will not automatically update
                      the customer's credit balance. Please ensure you manually
                      adjust the credit ledger if necessary.
                    </div>
                  )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentEdit(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdatePayment}
                  disabled={updatingPayment}
                >
                  {updatingPayment ? "Updating..." : "Update Payment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="md:hidden space-y-3">
                {lineItems.map((item) => (
                  <Card key={item.id} className="border-border/80">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium break-words">
                            {item.inventory?.productName ||
                              item.inventory?.product_name ||
                              "Unknown Product"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            SKU:{" "}
                            <span className="font-mono">
                              {item.inventory?.sku || "N/A"}
                            </span>
                          </p>
                        </div>
                        <p className="font-bold">
                          $
                          {Number(item.lineTotal || item.line_total).toFixed(2)}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Qty</p>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Unit Price
                          </p>
                          <p className="font-medium">
                            $
                            {Number(item.unitPrice || item.unit_price).toFixed(
                              2,
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.inventory?.productName ||
                            item.inventory?.product_name ||
                            "Unknown Product"}
                        </TableCell>
                        <TableCell>{item.inventory?.sku || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          $
                          {Number(item.unitPrice || item.unit_price).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          $
                          {Number(item.lineTotal || item.line_total).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {customer.firstName || customer.first_name}{" "}
                    {customer.lastName || customer.last_name}
                  </p>
                </div>
                {(customer.phoneNumber || customer.phone_number) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {customer.phoneNumber || customer.phone_number}
                    </p>
                  </div>
                )}
                {customer.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{customer.email}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCustomerSelector(true)}
                  disabled={assigning}
                >
                  Change Customer
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No customer assigned to this sale
                </p>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => setShowCustomerSelector(true)}
                  disabled={assigning}
                >
                  <User className="h-4 w-4 mr-2" />
                  Assign Customer
                </Button>
              </div>
            )}

            {(sale.paymentMethod || sale.payment_method) === "credit" && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800">
                  ⚠️ This is a credit sale. Manager or owner role required to
                  reassign customer.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerSelectorModal
        open={showCustomerSelector}
        onOpenChange={setShowCustomerSelector}
        customers={customers}
        onSelect={handleAssignCustomer}
        selectedCustomerId={customer?.id}
      />
    </div>
  );
}
