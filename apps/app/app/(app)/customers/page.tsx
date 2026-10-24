"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { usePermission } from "@/lib/hooks/use-permission";
import { Archive, Plus, Edit, RotateCcw, Search, UserX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { customerSchema, type Customer } from "@/lib/validations/schemas";
import { formatPhoneNumber } from "@/lib/utils/format-phone";
import { toTitleCase } from "@/lib/utils/format-text";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Tour } from "@/components/ui/tour";
import {
  getCustomerDisplayName,
  maskPII,
  PrivacyPreset,
} from "@/lib/utils/privacy";
import { DataSyncStatus } from "@/components/ui/data-sync-status";
import {
  getDefaultPrivacyProtocol,
  canWritePrivacyField,
  PRIVACY_PROFILE_OPTIONS,
} from "@/lib/privacy/profiles";
import type { PrivacyProtocolSettings } from "@/lib/privacy/types";
import { ShieldAlert } from "lucide-react";
import { ProgressiveSection } from "@/components/ui/progressive-section";

type CustomerRecord = Customer & {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone_number?: string | null;
  alias?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  total_purchases?: number;
  total_credit_used?: number;
  is_active?: boolean;
};

export default function CustomersPage() {
  const router = useRouter();
  const { business, settings, loading: businessLoading } = useBusiness();
  const {
    customers,
    loading: customersLoading,
    syncStatus,
    refresh,
  } = useCustomerContext();
  const { hasPermission, loading: permissionLoading } = usePermission(
    business?.id,
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewStatus, setViewStatus] = useState<"active" | "archived">("active");
  const [archivedCustomers, setArchivedCustomers] = useState<CustomerRecord[]>(
    [],
  );
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [lifecycleCustomerId, setLifecycleCustomerId] = useState<string | null>(
    null,
  );
  const [privacyProtocol, setPrivacyProtocol] =
    useState<PrivacyProtocolSettings>(getDefaultPrivacyProtocol());
  const [availableProducts, setAvailableProducts] = useState<
    Array<{ id: string; name: string; price?: number }>
  >([]);
  const [customPrices, setCustomPrices] = useState<
    Array<{ productId: string; productName: string; pricePerUnit: number }>
  >([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");

  useEffect(() => {
    if (!business?.id) return;
    fetch("/api/pos/products", {
      headers: { "X-Business-Id": business.id },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const items = data?.items || data?.data || [];
        setAvailableProducts(
          items.map((i: any) => ({
            id: String(i.id || i.productId),
            name: String(i.name || i.productName || "Product"),
            price: Number(i.price ?? i.sellingPrice ?? 0),
          }))
        );
      })
      .catch(() => {});
  }, [business?.id]);

  useEffect(() => {
    fetch("/api/business/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((settingsData) => {
        if (!settingsData) return;
        setPrivacyProtocol(
          settingsData.privacy_protocol ||
            settingsData.privacyProtocol ||
            getDefaultPrivacyProtocol(),
        );
      })
      .catch((error) => {
        console.error("Failed to load business privacy settings:", error);
      });
  }, []);

  const canWriteAddress = canWritePrivacyField(privacyProtocol, "address");
  const currentProfileOption =
    PRIVACY_PROFILE_OPTIONS.find((opt) => opt.id === privacyProtocol.profile) ||
    PRIVACY_PROFILE_OPTIONS.find((opt) => opt.id === "standard_mode");

  const canManageCustomers =
    !permissionLoading && hasPermission("customers.manage");

  const loadArchived = useCallback(async () => {
    if (!business?.id || !canManageCustomers) return;

    setArchivedLoading(true);
    try {
      const response = await fetch("/api/customers?status=archived", {
        credentials: "same-origin",
        headers: {
          "X-Business-Id": business.id,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load archived customers");
      }
      const payload = await response.json();
      setArchivedCustomers(Array.isArray(payload.data) ? payload.data : []);
    } catch {
      toast.error("Failed to load archived customers");
    } finally {
      setArchivedLoading(false);
    }
  }, [business?.id, canManageCustomers]);

  useEffect(() => {
    if (viewStatus === "archived") {
      void loadArchived();
    }
  }, [loadArchived, viewStatus]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Customer>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      business_id: business?.id || "",
      is_active: true,
    },
  });

  const onInvalid = (fieldErrors: any) => {
    console.error("Customer form validation errors:", fieldErrors);
    const errEntries = Object.entries(fieldErrors);
    if (errEntries.length > 0) {
      const [field, err]: [string, any] = errEntries[0];
      toast.error(`${err?.message || `Invalid value for ${field}`}`);
    } else {
      toast.error("Please verify all customer fields");
    }
  };

  const onSubmit = async (data: Customer) => {
    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    const payload: Record<string, unknown> = {
      ...data,
      business_id: business.id,
      custom_product_prices: customPrices,
    };

    if (!canWriteAddress) {
      delete payload.address;
      delete payload.city;
      delete payload.state;
      delete payload.zip_code;
    } else {
      if (!data.address?.trim()) delete payload.address;
      if (!data.city?.trim()) delete payload.city;
      if (!data.state?.trim()) delete payload.state;
      if (!data.zip_code?.trim()) delete payload.zip_code;
    }

    if (privacyProtocol.alias_only_mode) {
      delete payload.first_name;
      delete payload.last_name;
      delete payload.phone_number;
      delete payload.email;
      delete payload.notes;
    }

    const promise = async () => {
      const url = editingCustomer?.id
        ? `/api/customers/${editingCustomer.id}`
        : "/api/customers";
      const method = editingCustomer?.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Business-Id": business.id,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save customer");
      }

      await refresh();
      if (viewStatus === "archived") {
        await loadArchived();
      }

      return editingCustomer?.id ? "Customer updated." : "Customer added.";
    };

    const savePromise = promise();
    toast.promise(savePromise, {
      loading: editingCustomer ? "Updating customer..." : "Adding customer...",
      success: (message) => {
        setShowDialog(false);
        setEditingCustomer(null);
        reset();
        return message;
      },
      error: (error) => {
        return error instanceof Error
          ? error.message
          : "Failed to save customer";
      },
    });

    try {
      await savePromise;
    } catch {
      // The toast presents the API error while the submit control remains
      // disabled until the request settles.
    }
  };

  const handleEdit = (customer: CustomerRecord) => {
    setEditingCustomer(customer);
    const existingPrices =
      (customer as any).custom_product_prices ||
      (customer as any).customProductPrices ||
      [];
    setCustomPrices(
      existingPrices.map((p: any) => ({
        productId: String(p.productId),
        productName: String(p.productName),
        pricePerUnit:
          typeof p.pricePerUnit === "number"
            ? p.pricePerUnit
            : Number(p.pricePerUnitCents || 0) / 100,
      }))
    );
    setSelectedProductId("");
    setNewProductPrice("");
    reset(customer);
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingCustomer(null);
    setCustomPrices([]);
    setSelectedProductId("");
    setNewProductPrice("");
    reset({
      business_id: business?.id || "",
      is_active: true,
    });
    setShowDialog(true);
  };

  const handleAddCustomPrice = () => {
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }
    const numPrice = Number(newProductPrice);
    if (!Number.isFinite(numPrice) || numPrice < 0) {
      toast.error("Please enter a valid price per unit");
      return;
    }
    const product = availableProducts.find((p) => p.id === selectedProductId);
    if (!product) return;

    setCustomPrices((prev) => {
      const filtered = prev.filter((p) => p.productId !== selectedProductId);
      return [
        ...filtered,
        {
          productId: product.id,
          productName: product.name,
          pricePerUnit: numPrice,
        },
      ];
    });
    setSelectedProductId("");
    setNewProductPrice("");
  };

  const handleRemoveCustomPrice = (productId: string) => {
    setCustomPrices((prev) => prev.filter((p) => p.productId !== productId));
  };

  const handleLifecycleChange = async (
    customer: CustomerRecord,
    isActive: boolean,
  ) => {
    if (lifecycleCustomerId) return;
    setLifecycleCustomerId(customer.id);
    const action = isActive ? "reactivate" : "archive";
    const promise = async () => {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Business-Id": business?.id || "",
        },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Failed to ${action} customer`);
      }

      await Promise.all([refresh(), loadArchived()]);
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
      // The toast presents the error without exposing profile data.
    } finally {
      setLifecycleCustomerId(null);
    }
  };

  const displayedCustomers =
    viewStatus === "active"
      ? ((Array.isArray(customers) ? customers : []) as CustomerRecord[])
      : archivedCustomers;
  const normalizedSearch = searchTerm.toLowerCase();
  const filteredCustomers = displayedCustomers.filter((customer) =>
    [
      customer?.first_name,
      customer?.last_name,
      customer?.alias,
      customer?.phone_number,
      customer?.email,
    ].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(normalizedSearch),
    ),
  );

  if (businessLoading || customersLoading) {
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
        <EmptyState
          icon={UserX}
          title="No business found"
          description="Complete onboarding first so customer profiles can be attached to a business."
          actionLabel="Go to onboarding"
          onAction={() => router.push("/onboarding")}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 page-transition">
      <div className="noise-overlay" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredCustomers.length} customer{" "}
            {filteredCustomers.length === 1 ? "profile" : "profiles"}
          </p>
        </div>
        <DataSyncStatus status={syncStatus} onRefresh={() => void refresh()} />
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          {canManageCustomers ? (
            <DialogTrigger asChild>
              <Button
                onClick={handleNew}
                id="tour-customer-add-btn"
                className="laser-button bg-accent text-black hover:bg-accent/90 shadow-[0_0_15px_rgba(204,255,0,0.3)] border-none font-bold tracking-wider h-11 px-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add customer
              </Button>
            </DialogTrigger>
          ) : null}
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
            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name (Optional)</Label>
                  <Input
                    id="first_name"
                    {...register("first_name")}
                    onBlur={(e) => {
                      const titled = toTitleCase(e.target.value);
                      if (titled !== e.target.value) {
                        setValue("first_name", titled);
                      }
                      register("first_name").onBlur(e);
                    }}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-destructive">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    {...register("last_name")}
                    onBlur={(e) => {
                      const titled = toTitleCase(e.target.value);
                      if (titled !== e.target.value) {
                        setValue("last_name", titled);
                      }
                      register("last_name").onBlur(e);
                    }}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-destructive">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alias">Alias (Optional)</Label>
                <Input
                  id="alias"
                  {...register("alias")}
                  onBlur={(e) => {
                    const titled = toTitleCase(e.target.value);
                    if (titled !== e.target.value) {
                      setValue("alias", titled);
                    }
                    register("alias").onBlur(e);
                  }}
                />
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
                Use an alias, name, phone, or email. Collect only what the
                business needs.
              </p>

              <ProgressiveSection
                title="Additional Details & Custom Pricing"
                description="Address, customer type, and price overrides"
                defaultOpen={false}
              >
                {canWriteAddress ? (
                  <>
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
                  </>
                ) : (
                  <div className="rounded-md border border-white/10 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-accent shrink-0" />
                    <span>
                      Address collection is disabled under your{" "}
                      <strong className="text-foreground font-semibold">
                        {currentProfileOption?.label || "current"}
                      </strong>{" "}
                      privacy policy. To store customer addresses, switch to &quot;Keep details&quot; in Business Settings.
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="customer_type">
                    Customer Type
                    <HelpTooltip content="Categorize customers for reporting (e.g., Medical, Recreational)." />
                  </Label>
                  <Input id="customer_type" {...register("customer_type")} />
                </div>

                <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-accent">
                      Product-Specific Fixed Pricing
                    </Label>
                    <HelpTooltip content="Set custom fixed price per unit for specific catalog products for this customer." />
                  </div>

                  {/* Add product price row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-7 space-y-1">
                      <Label htmlFor="custom_product_select" className="text-[11px] text-white/70">
                        Select Product
                      </Label>
                      <select
                        id="custom_product_select"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full h-9 rounded-md bg-secondary/30 border border-white/10 px-2 text-xs text-white focus:border-accent"
                      >
                        <option value="">-- Choose a product --</option>
                        {availableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.price ? `(Reg. $${p.price.toFixed(2)})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <Label htmlFor="custom_price_input" className="text-[11px] text-white/70">
                        Price/Unit ($)
                      </Label>
                      <Input
                        id="custom_price_input"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                        className="h-9 text-xs bg-secondary/30 border-white/10"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomPrice}
                        className="w-full h-9 text-xs border-accent text-accent hover:bg-accent hover:text-black font-semibold"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* List of custom prices */}
                  {customPrices.length > 0 ? (
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <p className="text-[11px] text-white/50 font-medium">Configured Product Prices:</p>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {customPrices.map((cp) => (
                          <div
                            key={cp.productId}
                            className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white"
                          >
                            <span className="font-medium text-white/90">{cp.productName}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-300">
                                ${cp.pricePerUnit.toFixed(2)}/unit
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveCustomPrice(cp.productId)}
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      No product-specific prices configured. Customer will pay standard product pricing.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fixed_price_per_gram">
                    General Fixed Price / Gram ($) (Optional)
                    <HelpTooltip content="Override base price for weight-based products without a product-specific rule above." />
                  </Label>
                  <Input
                    id="fixed_price_per_gram"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("fixed_price_per_gram")}
                  />
                </div>

                <div className="space-y-4 pt-2 border-t border-white/5">
                  <div className="space-y-2">
                    <Label htmlFor="credit_limit">
                      Credit Limit ($)
                      <HelpTooltip content="Set customer credit limit ($20 - $200). Leave blank or 0 for default." />
                    </Label>
                    <Input
                      id="credit_limit"
                      placeholder="e.g. 50.00"
                      {...register("credit_limit")}
                    />
                    {errors.credit_limit && (
                      <p className="text-sm text-destructive">
                        {errors.credit_limit.message}
                      </p>
                    )}
                  </div>
                </div>
              </ProgressiveSection>

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
                      ? "Save Changes"
                      : "Add Customer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {canManageCustomers ? (
        <div className="relative z-10 flex gap-2" aria-label="Customer status">
          <Button
            variant={viewStatus === "active" ? "default" : "outline"}
            onClick={() => setViewStatus("active")}
          >
            Active
          </Button>
          <Button
            variant={viewStatus === "archived" ? "default" : "outline"}
            onClick={() => setViewStatus("archived")}
          >
            Archived
          </Button>
        </div>
      ) : null}

      {/* Search */}
      <div className="relative z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="SEARCH CUSTOMERS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 bg-secondary/30 border-white/10 focus:border-accent text-foreground rounded-lg tracking-wider"
            aria-label="Search customers"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border relative z-10">
        <div className="p-6 border-b border-white/5 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(204,255,0,0.4)]" />
          <h2 className="headline-text text-lg tracking-wider text-accent">
            CUSTOMER LIST
          </h2>
        </div>
        <CardContent className="p-0">
          {archivedLoading && viewStatus === "archived" ? (
            <TableSkeleton />
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={UserX}
              title={
                viewStatus === "archived"
                  ? "No archived customers"
                  : "No customers found"
              }
              description={
                searchTerm
                  ? "Try adjusting your search terms."
                  : viewStatus === "archived"
                    ? "Archived profiles remain available here for authorized operators."
                    : "Add your first customer to get started."
              }
              actionLabel={
                !searchTerm && viewStatus === "active" && canManageCustomers
                  ? "Add Customer"
                  : undefined
              }
              onAction={
                !searchTerm && viewStatus === "active" && canManageCustomers
                  ? handleNew
                  : undefined
              }
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-4 border-b border-white/5 last:border-0 hover:bg-accent/5 transition-colors"
                  >
                    <CardContent className="p-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {getCustomerDisplayName(
                              customer,
                              settings?.privacy_preset as PrivacyPreset,
                            )}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1 break-words">
                            {maskPII(
                              customer.email,
                              "email",
                              settings?.privacy_preset as PrivacyPreset,
                            ) === "- " &&
                            maskPII(
                              customer.phone_number,
                              "phone",
                              settings?.privacy_preset as PrivacyPreset,
                            ) === "-"
                              ? "No contact info"
                              : `${maskPII(customer.email, "email", settings?.privacy_preset as PrivacyPreset)} • ${maskPII(customer.phone_number, "phone", settings?.privacy_preset as PrivacyPreset)}`}
                          </p>
                          {customer.alias && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Alias: {customer.alias}
                            </p>
                          )}
                        </div>
                        {canManageCustomers ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              onClick={() => handleEdit(customer)}
                              aria-label="Edit customer"
                              className="h-11 w-11"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              disabled={lifecycleCustomerId === customer.id}
                              onClick={() =>
                                void handleLifecycleChange(
                                  customer,
                                  viewStatus === "archived",
                                )
                              }
                              aria-label={
                                viewStatus === "archived"
                                  ? "Reactivate customer"
                                  : "Archive customer"
                              }
                              className="h-11 w-11"
                            >
                              {viewStatus === "archived" ? (
                                <RotateCcw className="h-4 w-4" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : null}
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
                        {canWriteAddress ? (
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
                        ) : null}
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
                      {canWriteAddress ? (
                        <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Address
                        </TableHead>
                      ) : null}
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
                        className="border-white/5 hover:bg-accent/5 transition-colors group"
                      >
                        <TableCell className="font-medium">
                          <div>
                            <Link
                              href={`/customers/${customer.id}`}
                              className="text-foreground hover:text-accent hover:underline"
                            >
                              {getCustomerDisplayName(
                                customer,
                                settings?.privacy_preset as PrivacyPreset,
                              )}
                            </Link>
                            {customer.alias && (
                              <p className="text-xs text-muted-foreground">
                                ({customer.alias})
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {maskPII(
                            customer.phone_number,
                            "phone",
                            settings?.privacy_preset as PrivacyPreset,
                          )}
                        </TableCell>
                        <TableCell>
                          {maskPII(
                            customer.email,
                            "email",
                            settings?.privacy_preset as PrivacyPreset,
                          )}
                        </TableCell>
                        {canWriteAddress ? (
                          <TableCell>
                            {settings?.privacy_preset === "max_secure" ||
                            settings?.privacy_preset === "private"
                              ? "*** Redacted ***"
                              : customer.address
                                ? `${customer.address}, ${customer.city || ""} ${
                                    customer.state || ""
                                  }`
                                : "-"}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          ${Number(customer.total_purchases || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          ${Number(customer.total_credit_used || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {canManageCustomers ? (
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(customer)}
                                aria-label="Edit customer"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={lifecycleCustomerId === customer.id}
                                onClick={() =>
                                  void handleLifecycleChange(
                                    customer,
                                    viewStatus === "archived",
                                  )
                                }
                                aria-label={
                                  viewStatus === "archived"
                                    ? "Reactivate customer"
                                    : "Archive customer"
                                }
                              >
                                {viewStatus === "archived" ? (
                                  <RotateCcw className="h-4 w-4" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : null}
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
