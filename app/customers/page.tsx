"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpTooltip } from "@/components/ui/help-tooltip";
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
import { useRealtimeCustomers } from "@/lib/hooks/use-realtime";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Plus, Edit, Search } from "lucide-react";
import { toast } from "sonner";
import { customerSchema, type Customer } from "@/lib/validations/schemas";
import { formatPhoneNumber } from "@/lib/utils/format-phone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

export default function CustomersPage() {
  const { business, loading: businessLoading } = useBusiness();
  const customers = useRealtimeCustomers(business?.id || null);
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
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-2">
            Manage customer profiles and data
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
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
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer List ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No customers found
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id} className="border-border/80">
                    <CardContent className="pt-4">
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
                  </Card>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Total Purchases</TableHead>
                      <TableHead>Credit Used</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
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
      </Card>
    </div>
  );
}
