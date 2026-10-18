"use client";

import { useState } from "react";
import { usePrivacyContext } from "@/lib/privacy/use-privacy-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, User, CreditCard, Award } from "lucide-react";
import { LoyaltyBadge } from "./loyalty-badge";
import {
  maskAlias,
  maskSensitiveText,
  shouldMaskFromProtocol,
} from "@/lib/privacy/masking";

interface Customer {
  id: string;
  alias?: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email?: string;
  loyalty_tier?: string;
  discount_rate?: number;
  purchase_count?: number;
  credit_balance?: number;
  total_purchases?: number;
}

interface CustomerSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onSelect: (customerId: string) => void;
  selectedCustomerId?: string;
}

export function CustomerSelectorModal({
  open,
  onOpenChange,
  customers,
  onSelect,
  selectedCustomerId,
}: CustomerSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const privacy = usePrivacyContext(open);
  const shouldMask = privacy.protocol ? shouldMaskFromProtocol(privacy.protocol, privacy.manualEnabled, true) : true;

  const [creating, setCreating] = useState(false);
  const [secondaryField, setSecondaryField] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  if (open && !privacy.protocol) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>{privacy.error ?? "Loading customer privacy settings…"}</DialogDescription>
          </DialogHeader>
          {privacy.error && (
            <Button type="button" onClick={privacy.retry} className="mt-2">
              Retry privacy settings
            </Button>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  const searchTrimmed = searchTerm.trim();
  const searchDigits = searchTrimmed.replace(/[^0-9]/g, "");
  const isPhoneSearch = searchDigits.length >= 3 && searchTrimmed.replace(/[^a-zA-Z]/g, "").length === 0;

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTrimmed.toLowerCase();
    if (!searchLower) return true;
    const fullName = (
      customer.alias ||
      `${customer.first_name} ${customer.last_name}`.trim() ||
      "customer"
    ).toLowerCase();
    const phone = customer.phone_number?.toLowerCase() || "";
    const phoneDigits = phone.replace(/[^0-9]/g, "");
    const email = customer.email?.toLowerCase() || "";

    return (
      fullName.includes(searchLower) ||
      phone.includes(searchLower) ||
      (searchDigits.length >= 3 && phoneDigits.includes(searchDigits)) ||
      email.includes(searchLower)
    );
  });

  const handleSelect = (customerId: string) => {
    onSelect(customerId);
    onOpenChange(false);
    setSearchTerm("");
    setSecondaryField("");
    setCreateError(null);
  };

  const handleClear = () => {
    onSelect("");
    onOpenChange(false);
    setSearchTerm("");
    setSecondaryField("");
    setCreateError(null);
  };

  const handleQuickCreate = async () => {
    if (!searchTrimmed && !secondaryField.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const phone = isPhoneSearch ? searchTrimmed : secondaryField.trim();
      const alias = isPhoneSearch ? secondaryField.trim() : searchTrimmed;
      const res = await fetch("/api/pos/customers/quick-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(privacy.businessId ? { "X-Business-Id": privacy.businessId } : {}),
        },
        body: JSON.stringify({
          ...(phone ? { phone } : {}),
          ...(alias ? { alias } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) {
        setCreateError(data.error || "Could not create customer");
        return;
      }
      handleSelect(String(data.id));
    } catch {
      setCreateError("Could not create customer");
    } finally {
      setCreating(false);
    }
  };

  const attachedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Customer Lookup &amp; Quick Add</DialogTitle>
          <DialogDescription>
            Search by customer name or phone number, or quick-create a new customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {attachedCustomer && (
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Currently Attached
                </p>
                <p className="text-sm font-bold">
                  {shouldMask
                    ? maskAlias(
                        attachedCustomer.alias ||
                          `${attachedCustomer.first_name} ${attachedCustomer.last_name}`.trim() ||
                          "Customer",
                      )
                    : attachedCustomer.alias ||
                      `${attachedCustomer.first_name} ${attachedCustomer.last_name}`.trim() ||
                      "Customer"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleClear}>
                Detach Customer
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              autoComplete="off"
              placeholder="Search by customer name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 text-base md:text-sm"
            />
          </div>

          {/* Customer List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-center space-y-3">
                <p className="font-semibold text-amber-200">
                  Customer not found{searchTrimmed ? ` for "${searchTrimmed}"` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Quick-create and attach this customer right now using their name or phone number.
                </p>
                <div className="max-w-xs mx-auto space-y-2">
                  <Input
                    type="text"
                    placeholder={
                      isPhoneSearch
                        ? "Customer name / alias (optional)"
                        : "Phone number (optional)"
                    }
                    value={secondaryField}
                    onChange={(e) => setSecondaryField(e.target.value)}
                    className="h-10 text-sm"
                  />
                  {createError && (
                    <p className="text-xs text-red-400">{createError}</p>
                  )}
                  <Button
                    type="button"
                    onClick={() => void handleQuickCreate()}
                    disabled={creating || (!searchTrimmed && !secondaryField.trim())}
                    className="w-full"
                  >
                    {creating
                      ? "Creating..."
                      : `+ Create & Attach "${searchTrimmed || secondaryField.trim()}"`}
                  </Button>
                </div>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={`p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                    selectedCustomerId === customer.id
                      ? "border-accent bg-accent/10"
                      : ""
                  }`}
                  onClick={() => handleSelect(customer.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Name */}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {shouldMask
                            ? maskAlias(
                                customer.alias ||
                                  `${customer.first_name} ${customer.last_name}`.trim() ||
                                  "Customer",
                              )
                            : customer.alias ||
                            `${customer.first_name} ${customer.last_name}`.trim() ||
                            "Customer"}
                        </p>
                      </div>

                      {/* Contact Info */}
                      <div className="text-sm text-muted-foreground space-y-1">
                        {customer.phone_number && (
                          <p>📱 {shouldMask ? maskSensitiveText() : customer.phone_number}</p>
                        )}
                        {customer.email && (
                          <p>✉️ {shouldMask ? maskSensitiveText() : customer.email}</p>
                        )}
                      </div>

                      {/* Loyalty Badge */}
                      {customer.loyalty_tier &&
                        customer.loyalty_tier !== "none" && (
                          <LoyaltyBadge
                            tier={customer.loyalty_tier}
                            discount_rate={customer.discount_rate || 0}
                            purchase_count={customer.purchase_count || 0}
                          />
                        )}

                      {/* Stats */}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {customer.total_purchases !== undefined && (
                          <span>
                            Total: ${customer.total_purchases.toFixed(2)}
                          </span>
                        )}
                        {customer.purchase_count !== undefined && (
                          <span>{customer.purchase_count} purchases</span>
                        )}
                        {customer.credit_balance !== undefined &&
                          customer.credit_balance > 0 && (
                            <span className="text-accent font-medium flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              Credit: ${customer.credit_balance.toFixed(2)}
                            </span>
                          )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="h-10 px-3"
                      variant={
                        selectedCustomerId === customer.id
                          ? "default"
                          : "outline"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(customer.id);
                      }}
                    >
                      {selectedCustomerId === customer.id
                        ? "Attached"
                        : "Attach"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClear} className="flex-1 h-11">
              Detach / Walk-in
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
