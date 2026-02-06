"use client";

import { useBusiness } from "@/lib/hooks/use-business";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PlusCircle, Building2, Check } from "lucide-react";
import { useState } from "react";
import { BusinessSetupWizard } from "@/components/onboarding/business-setup-wizard";

export function BusinessSwitcher() {
  const { business, availableBusinesses, switchBusiness, refreshBusiness } =
    useBusiness();
  const [showWizard, setShowWizard] = useState(false);

  // If no business loaded yet, show nothing (skeleton handled by parent if needed)
  if (!business) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-label="Select a business"
            className="w-[200px] justify-between hidden md:flex"
          >
            <span className="truncate flex items-center gap-2">
              <Building2 className="mr-2 h-4 w-4" />
              {business.business_name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]">
          <DropdownMenuLabel>My Businesses</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableBusinesses.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onSelect={() => switchBusiness(b.id)} // b.id is Clerk Org ID
              className="flex items-center justify-between"
            >
              <span className="truncate">{b.business_name}</span>
              {/* Check if current business matches the dropdown item. 
                  business.clerk_org_id should match b.id (Clerk ID) */}
              {(business.clerkOrgId === b.id || business.id === b.id) && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setShowWizard(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Business
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showWizard && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <BusinessSetupWizard
            userId={business.owner_id || ""} // Fallback if owner_id missing
            onComplete={async () => {
              await refreshBusiness();
              setShowWizard(false);
            }}
          />
          {/* Note: The wizard component might need a close button if triggered manually */}
          <div className="absolute top-4 right-4">
            <Button variant="ghost" onClick={() => setShowWizard(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
