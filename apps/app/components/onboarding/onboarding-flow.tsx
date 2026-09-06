"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "Welcome to DRX",
    description: "Keep customers, stock, sales, and money straight.",
    icon: <Sparkles className="h-12 w-12 text-accent" />,
    features: [
      "Add sales",
      "Keep customer details together",
      "Check stock counts",
      "Record payments and balances due",
    ],
  },
  {
    title: "Home",
    description: "Check today’s numbers at a glance.",
    icon: <BarChart3 className="h-12 w-12 text-accent" />,
    features: [
      "Sales totals",
      "Low-stock alerts",
      "Customer balances",
      "What you made",
    ],
  },
  {
    title: "New sale",
    description: "Find it, add it, take payment, done.",
    icon: <ShoppingCart className="h-12 w-12 text-accent" />,
    features: [
      "Find or scan products",
      "Choose a payment type",
      "Update stock after a sale",
      "Add a balance due",
    ],
  },
  {
    title: "Products",
    description: "Know what you have and what is running low.",
    icon: <Package className="h-12 w-12 text-accent" />,
    features: [
      "Add stock with cost history",
      "Low-stock alerts",
      "Product codes",
      "Whole or partial units",
    ],
  },
  {
    title: "Customers",
    description: "Keep each person’s details and history together.",
    icon: <Users className="h-12 w-12 text-accent" />,
    features: [
      "Customer profiles",
      "Purchase history",
      "Balance limits",
      "Payment history",
    ],
  },
];

export function OnboardingFlow() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem(
      "drx_onboarding_complete",
    );
    if (!hasCompletedOnboarding) {
      // Small delay to let the app render first
      setTimeout(() => setOpen(true), 500);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem("drx_onboarding_complete", "true");
    setOpen(false);
    router.push("/pos/sale");
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex justify-center mb-4">{currentStepData.icon}</div>
          <DialogTitle className="text-2xl text-center">
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "w-8 bg-accent"
                    : index < currentStep
                      ? "w-2 bg-accent/50"
                      : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Features list */}
          <div className="space-y-3">
            {currentStepData.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20"
              >
                <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" onClick={handleSkip}>
            Not now
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {ONBOARDING_STEPS.length}
            </span>
            <Button
              onClick={handleNext}
              className="bg-accent hover:bg-accent-dark text-black"
            >
              {currentStep === ONBOARDING_STEPS.length - 1 ? (
                "Open DRX"
              ) : (
                <>
                  See next <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
