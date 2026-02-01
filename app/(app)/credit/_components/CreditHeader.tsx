import React from "react";
import { Search, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreditHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenPayment: () => void;
  onOpenExtension: () => void;
}

export function CreditHeader({
  searchTerm,
  onSearchChange,
  onOpenPayment,
  onOpenExtension,
}: CreditHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold">Credit Management</h1>
        <p className="text-muted-foreground mt-2">
          Track credit transactions and fronts
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
            aria-label="Search customers"
          />
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onOpenPayment}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
        <Button className="w-full sm:w-auto" onClick={onOpenExtension}>
          <Plus className="h-4 w-4 mr-2" />
          Extend Credit
        </Button>
      </div>
    </div>
  );
}
