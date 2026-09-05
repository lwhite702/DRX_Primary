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
        "flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-8",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 -ml-2 rounded-full text-muted-foreground hover:text-white hover:bg-white/10"
          onClick={handleBack}
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Go back</span>
        </Button>
        <div className="space-y-1 py-0.5">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight uppercase">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 pl-12 md:pl-0 mt-2 md:mt-0">
        {children}
      </div>
    </div>
  );
}
