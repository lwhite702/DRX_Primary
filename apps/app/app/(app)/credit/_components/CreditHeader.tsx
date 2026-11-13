import React from "react";
import { Search, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreditHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenPayment: () => void;
  onOpenExtension: () => void;
  disabled?: boolean;
}

export function CreditHeader({
  searchTerm,
  onSearchChange,
  onOpenPayment,
  onOpenExtension,
  disabled,
}: CreditHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center pointer-events-auto">
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search all customers by name or alias"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
          aria-label="Search all customers by name or alias"
        />
      </div>
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        disabled={disabled}
        onClick={onOpenPayment}
      >
        <DollarSign className="h-4 w-4 mr-2" />
        Record a payment
      </Button>
      <Button
        className="w-full sm:w-auto"
        disabled={disabled}
        onClick={onOpenExtension}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add to a balance
      </Button>
    </div>
  );
}
