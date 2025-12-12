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
import { CustomerSelectorModal } from "@/components/pos/customer-selector-modal";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useBusiness } from "@/lib/hooks/use-business";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { toast } from "sonner";
import { ArrowLeft, User, Calendar, CreditCard, Package } from "lucide-react";

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const saleId = params.id as string;
  const { business } = useBusiness();
  const { isManager } = useUserRole(business?.id);
  const supabase = getSupabaseClient();

  const [sale, setSale] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!saleId || !business?.id || !supabase) return;

    const loadSaleDetails = async () => {
      try {
        // Load sale
        const { data: saleData, error: saleError } = await supabase
          .from("sales")
          .select("*")
          .eq("id", saleId)
          .eq("business_id", business.id)
          .single();

        if (saleError) throw saleError;
        setSale(saleData);

        // Load line items
        const { data: itemsData, error: itemsError } = await supabase
          .from("sales_line_items")
          .select(
            `
            *,
            inventory:inventory_id (
              product_name,
              sku
            )
          `
          )
          .eq("sale_id", saleId);

        if (itemsError) throw itemsError;
        setLineItems(itemsData || []);

        // Load customer if assigned
        if (saleData.customer_id) {
          const { data: customerData } = await supabase
            .from("customers")
            .select("*")
            .eq("id", saleData.customer_id)
            .single();

          if (customerData) setCustomer(customerData);
        }

        // Load all customers for assignment
        const { data: customersData } = await supabase
          .from("customers")
          .select("*")
          .eq("business_id", business.id)
          .eq("is_active", true)
          .order("first_name");

        if (customersData) setCustomers(customersData);
      } catch (error) {
        console.error("Error loading sale details:", error);
        toast.error("Failed to load sale details");
      } finally {
        setLoading(false);
      }
    };

    loadSaleDetails();
  }, [saleId, business?.id, supabase]);

  const handleAssignCustomer = async (customerId: string) => {
    if (!supabase || !business?.id) return;

    // Check if credit sale requires manager override
    if (sale?.payment_method === "credit" && !isManager) {
      toast.error("Manager or owner role required to reassign credit sales");
      return;
    }

    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc("assign_customer_to_sale", {
        p_sale_id: saleId,
        p_new_customer_id: customerId || null,
        p_reason: "Customer assigned via sales detail page",
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        toast.success("Customer assigned successfully!");

        // Reload sale details
        const { data: saleData } = await supabase
          .from("sales")
          .select("*")
          .eq("id", saleId)
          .single();

        if (saleData) setSale(saleData);

        // Reload customer
        if (customerId) {
          const { data: customerData } = await supabase
            .from("customers")
            .select("*")
            .eq("id", customerId)
            .single();

          if (customerData) setCustomer(customerData);
        } else {
          setCustomer(null);
        }
      } else {
        toast.error(data?.[0]?.message || "Failed to assign customer");
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
              Order #{sale.order_number}
            </p>
          </div>
        </div>
        <Badge
          variant={sale.order_status === "completed" ? "default" : "secondary"}
        >
          {sale.order_status}
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
                      {new Date(sale.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Payment Method
                    </p>
                    <p className="font-medium capitalize">
                      {sale.payment_method}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Order Type</p>
                    <p className="font-medium capitalize">{sale.order_type}</p>
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
                  <span>${Number(sale.tax_amount || 0).toFixed(2)}</span>
                </div>
                {sale.delivery_price > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery:</span>
                    <span>${Number(sale.delivery_price).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>${Number(sale.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {lineItems.map((item) => (
                  <Card key={item.id} className="border-border/80">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium break-words">
                            {item.inventory?.product_name || "Unknown Product"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            SKU: <span className="font-mono">{item.inventory?.sku || "N/A"}</span>
                          </p>
                        </div>
                        <p className="font-bold">${Number(item.line_total).toFixed(2)}</p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Qty</p>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Unit Price</p>
                          <p className="font-medium">${Number(item.unit_price).toFixed(2)}</p>
                          {item.overridden_price && item.original_price && (
                            <p className="text-xs text-muted-foreground line-through">
                              ${Number(item.original_price).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>

                      {item.overridden_price && (
                        <div className="mt-3">
                          <Badge variant="outline" className="text-xs">
                            Price Override
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop table */}
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
                          {item.inventory?.product_name || "Unknown Product"}
                          {item.overridden_price && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Price Override
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{item.inventory?.sku || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(item.unit_price).toFixed(2)}
                          {item.overridden_price && item.original_price && (
                            <span className="block text-xs text-muted-foreground line-through">
                              ${Number(item.original_price).toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(item.line_total).toFixed(2)}
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
                    {customer.first_name} {customer.last_name}
                  </p>
                </div>
                {customer.phone_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{customer.phone_number}</p>
                  </div>
                )}
                {customer.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{customer.email}</p>
                  </div>
                )}
                {customer.loyalty_tier && customer.loyalty_tier !== "none" && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Loyalty Tier
                    </p>
                    <Badge className="capitalize">
                      {customer.loyalty_tier}
                    </Badge>
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

            {sale.payment_method === "credit" && (
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

      {/* Customer Selector Modal */}
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
