"use client";

import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBusiness } from "@/lib/hooks/use-business";
import { useCustomerContext } from "@/components/providers/customer-provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Plus, Edit, Search, User, UserX } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { customerSchema, type Customer } from "@/lib/validations/schemas";
import { formatPhoneNumber } from "@/lib/utils/format-phone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Tour } from "@/components/ui/tour";

export default function CustomersPage() {
  const { business, loading: businessLoading } = useBusiness();
  const { customers } = useCustomerContext();
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = getSupabaseClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Customer>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      business_id: business?.id || "",
      is_active: true,
    },
  });

  const onSubmit = async (data: Customer) => {
    if (!business?.id || !supabase) {
      toast.error("Business not found");
      return;
    }

    const promise = async () => {
      if (editingCustomer?.id) {
        const { error } = await supabase
          .from("customers")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCustomer.id);
        if (error) throw error;
        return "Customer updated successfully";
      } else {
        const { error } = await supabase.from("customers").insert({
          ...data,
          business_id: business.id,
        });
        if (error) throw error;
        return "Customer added successfully";
      }
    };

    toast.promise(promise(), {
      loading: editingCustomer ? "Updating customer..." : "Adding customer...",
      success: (message) => {
        setShowDialog(false);
        setEditingCustomer(null);
        reset();
        return message;
      },
      error: (error) => {
        // Handle Supabase errors which differ from standard Error objects
        if (typeof error === "object" && error !== null && "message" in error) {
          return (error as any).message;
        }
        return error instanceof Error
          ? error.message
          : "Failed to save customer";
      },
    });
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    reset(customer);
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingCustomer(null);
    reset({
      business_id: business?.id || "",
      is_active: true,
    });
    setShowDialog(true);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (businessLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground mt-2">
              Manage customer profiles and data
            </p>
          </div>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8">
        No business found. Please set up your business first.
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 page-transition">
      <div className="noise-overlay" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
        <div>
          <h1 className="headline-text text-3xl tracking-widest text-muted-foreground">
            CUSTOMERS
          </h1>
          <p className="technical-label text-xs text-muted-foreground/60 mt-1">
            MANAGEMENT CONSOLE • {filteredCustomers.length} PROFILES
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={handleNew}
              id="tour-customer-add-btn"
              className="laser-button bg-[#FFD700] text-black hover:bg-[#FFD700]/90 shadow-[0_0_15px_rgba(255,215,0,0.4)] border-none font-bold tracking-wider"
            >
              <Plus className="h-4 w-4 mr-2" />
              ADD CUSTOMER
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? "Update customer information"
                  : "Add a new customer to your database"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" {...register("first_name")} />
                  {errors.first_name && (
                    <p className="text-sm text-destructive">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" {...register("last_name")} />
                  {errors.last_name && (
                    <p className="text-sm text-destructive">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alias">Alias (Optional)</Label>
                <Input id="alias" {...register("alias")} />
                {errors.alias && (
                  <p className="text-sm text-destructive">
                    {errors.alias.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">
                    Phone Number
                    <HelpTooltip content="Primary contact number. Format: (XXX) XXX-XXXX" />
                  </Label>
                  <Input
                    id="phone_number"
                    {...register("phone_number")}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      e.target.value = formatted;
                      register("phone_number").onChange(e);
                    }}
                  />
                  {errors.phone_number && (
                    <p className="text-sm text-destructive">
                      {errors.phone_number.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email
                    <HelpTooltip content="Used for digital receipts and account notifications." />
                  </Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                * Either phone number or email is required
              </p>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register("address")} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register("city")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" {...register("state")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">Zip Code</Label>
                  <Input id="zip_code" {...register("zip_code")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_type">
                  Customer Type
                  <HelpTooltip content="Categorize customers for reporting (e.g., Medical, Recreational)." />
                </Label>
                <Input id="customer_type" {...register("customer_type")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixed_price_per_gram">
                  Fixed Price / Gram ($)
                  <HelpTooltip content="Override base price for weight-based products for this customer." />
                </Label>
                <Input
                  id="fixed_price_per_gram"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("fixed_price_per_gram")}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingCustomer(null);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : editingCustomer
                      ? "Update"
                      : "Add"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#FFD700] h-4 w-4" />
          <Input
            placeholder="SEARCH CUSTOMERS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 bg-secondary/30 border-white/10 focus:border-[#FFD700]/50 text-foreground rounded-lg tracking-wider"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border relative z-10">
        <div className="p-6 border-b border-white/5 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#FFD700] shadow-[0_0_10px_#FFD700]" />
          <h2 className="headline-text text-lg tracking-wider text-[#FFD700]">
            CUSTOMER LIST
          </h2>
        </div>
        <CardContent className="p-0">
          {filteredCustomers.length === 0 ? (
            <EmptyState
              icon={UserX}
              title="No customers found"
              description={
                searchTerm
                  ? "Try adjusting your search terms."
                  : "Add your first customer to get started."
              }
              actionLabel={!searchTerm ? "Add Customer" : undefined}
              onAction={!searchTerm ? handleNew : undefined}
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-4 border-b border-white/5 last:border-0 hover:bg-[#FFD700]/5 transition-colors"
                  >
                    <CardContent className="p-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {customer.first_name} {customer.last_name}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1 break-words">
                            {customer.email ||
                              customer.phone_number ||
                              "No contact info"}
                          </p>
                          {customer.alias && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Alias: {customer.alias}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(customer)}
                          aria-label="Edit customer"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            Total Purchases
                          </p>
                          <p className="font-medium">
                            ${Number(customer.total_purchases || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            Credit Used
                          </p>
                          <p className="font-medium">
                            $
                            {Number(customer.total_credit_used || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">
                            Address
                          </p>
                          <p className="text-sm text-foreground break-words">
                            {customer.address
                              ? `${customer.address}, ${customer.city || ""} ${
                                  customer.state || ""
                                }`
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/10">
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Name
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Phone
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Email
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Address
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Purchases
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Credit
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="border-white/5 hover:bg-[#FFD700]/5 transition-colors group"
                      >
                        <TableCell className="font-medium">
                          <div>
                            <Link
                              href={`/customers/${customer.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {customer.first_name} {customer.last_name}
                            </Link>
                            {customer.alias && (
                              <p className="text-xs text-muted-foreground">
                                ({customer.alias})
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{customer.phone_number || "-"}</TableCell>
                        <TableCell>{customer.email || "-"}</TableCell>
                        <TableCell>
                          {customer.address
                            ? `${customer.address}, ${customer.city || ""} ${
                                customer.state || ""
                              }`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          ${Number(customer.total_purchases || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          ${Number(customer.total_credit_used || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </div>

      <Tour
        tourId="customers_v1"
        steps={[
          {
            targetId: "tour-customer-add-btn",
            title: "Add your first customer",
            description:
              "Create customer profiles to track purchase history, loyalty points, and preferences.",
          },
        ]}
        onComplete={() => {}}
      />
    </div>
  );
}
