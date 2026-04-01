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
    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center pointer-events-auto">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 bg-[#1a1a1a] border-white/5 focus-visible:ring-[#4ADE80]"
          aria-label="Search customers"
        />
      </div>
      <Button
        variant="outline"
        className="w-full sm:w-auto border-white/10 hover:bg-white/5 hover:text-white"
        onClick={onOpenPayment}
      >
        <DollarSign className="h-4 w-4 mr-2" />
        Record Payment
      </Button>
      <Button
        className="w-full sm:w-auto bg-[#4ADE80] text-black hover:bg-[#4ADE80]/90"
        onClick={onOpenExtension}
      >
        <Plus className="h-4 w-4 mr-2" />
        Extend Credit
      </Button>
    </div>
  );
}
