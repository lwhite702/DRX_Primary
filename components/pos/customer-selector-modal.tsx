"use client";

import { useState } from "react";
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

interface Customer {
  id: string;
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

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName =
      `${customer.first_name} ${customer.last_name}`.toLowerCase();
    const phone = customer.phone_number?.toLowerCase() || "";
    const email = customer.email?.toLowerCase() || "";

    return (
      fullName.includes(searchLower) ||
      phone.includes(searchLower) ||
      email.includes(searchLower)
    );
  });

  const handleSelect = (customerId: string) => {
    onSelect(customerId);
    onOpenChange(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onSelect("");
    onOpenChange(false);
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
          <DialogDescription>
            Search and select a customer for this sale
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Customer List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No customers found
              </p>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={`p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                    selectedCustomerId === customer.id
                      ? "border-primary bg-primary/5"
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
                          {customer.first_name} {customer.last_name}
                        </p>
                      </div>

                      {/* Contact Info */}
                      <div className="text-sm text-muted-foreground space-y-1">
                        {customer.phone_number && (
                          <p>📱 {customer.phone_number}</p>
                        )}
                        {customer.email && <p>✉️ {customer.email}</p>}
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
                            <span className="text-yellow-600 font-medium flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              Credit: ${customer.credit_balance.toFixed(2)}
                            </span>
                          )}
                      </div>
                    </div>

                    <Button
                      size="sm"
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
                        ? "Selected"
                        : "Select"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClear} className="flex-1">
              Clear Customer
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
