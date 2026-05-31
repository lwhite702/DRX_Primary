"use client";

import { useOnboarding } from "@/components/providers/onboarding-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function WelcomeModal() {
  const { steps, isLoading } = useOnboarding();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Show if profile is done (assumed true for auth user) but nothing else is done
    const isNewUser = !steps.product && !steps.customer && !steps.sale;

    // Check if previously seen/dismissed in local storage for this specific modal
    const hasSeenWelcome = localStorage.getItem("drx_welcome_seen");

    if (isNewUser && !hasSeenWelcome) {
      setIsOpen(true);
    }
  }, [isLoading, steps]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("drx_welcome_seen", "true");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <PartyPopper className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Welcome to Deelrx CRM! 🚀
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            We're excited to help you manage your medical retail business. Here
            is the best way to get started:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Link href="/inventory" onClick={handleClose}>
              <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors text-center h-full flex flex-col items-center justify-center gap-2 cursor-pointer">
                <span className="text-2xl">📦</span>
                <span className="font-medium text-sm">Add Inventory</span>
              </div>
            </Link>
            <Link href="/customers" onClick={handleClose}>
              <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors text-center h-full flex flex-col items-center justify-center gap-2 cursor-pointer">
                <span className="text-2xl">👥</span>
                <span className="font-medium text-sm">Add Customer</span>
              </div>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground text-center px-4">
            You can always track your progress with the setup guide on your
            dashboard.
          </p>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleClose} className="w-full sm:w-auto">
            Let's Go
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
