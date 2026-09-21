"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  onBack?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  onBack,
  children,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 -ml-2 rounded-full text-muted-foreground hover:text-white hover:bg-white/10"
          onClick={handleBack}
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Go back</span>
        </Button>
        <div className="min-w-0 space-y-2 py-0.5">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground tracking-tight break-words">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 md:pl-0">
        {children}
      </div>
    </div>
  );
}
