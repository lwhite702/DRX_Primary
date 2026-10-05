"use client";

import { useOnboarding } from "@/components/providers/onboarding-context";
import {
  CheckCircle2,
  Circle,
  X,
  ShoppingBag,
  Users,
  CreditCard,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function SetupGuide() {
  const {
    steps,
    progress,
    isComplete,
    dismissGuide,
    isGuideDismissed,
    isLoading,
    error,
    refreshOnboarding,
  } = useOnboarding();

  if (isLoading || isGuideDismissed || isComplete) return null;

  if (error) {
    return (
      <div
        role="status"
        className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-white/80"
      >
        <span>Setup progress couldn’t be refreshed.</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refreshOnboarding()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const checklist = [
    {
      key: "profile",
      label: "Complete Business Profile",
      description: "Set up your business details",
      href: "/settings/profile",
      icon: Building2,
      isDone: steps.profile,
    },
    {
      key: "product",
      label: "Add your first product",
      description: "Choose whole or fractional sales, units, and suggested amounts",
      href: "/inventory?create=1",
      icon: ShoppingBag,
      isDone: steps.product,
    },
    {
      key: "customer",
      label: "Add a customer",
      description: "Create your first customer profile",
      href: "/customers",
      icon: Users,
      isDone: steps.customer,
    },
    {
      key: "sale",
      label: "Make a sale",
      description: "Process your first transaction",
      href: "/sales",
      icon: CreditCard,
      isDone: steps.sale,
    },
  ];

  return (
    <Card className="mb-6 relative overflow-hidden border-primary/20 bg-primary/5">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={dismissGuide}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            🚀 Getting Started
            <span className="text-xs font-normal text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
              {progress}% Complete
            </span>
          </CardTitle>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {checklist.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex flex-col gap-3 p-4 rounded-lg border transition-all hover:bg-background/80 hover:shadow-sm",
                item.isDone
                  ? "bg-background/50 border-transparent opacity-60"
                  : "bg-background border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "p-2 rounded-md",
                    item.isDone
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                {item.isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <div
                  className={cn(
                    "font-medium",
                    item.isDone && "line-through text-muted-foreground"
                  )}
                >
                  {item.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {item.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
