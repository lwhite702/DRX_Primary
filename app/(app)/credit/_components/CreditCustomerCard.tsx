"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User, MoreVertical, DollarSign, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgingData } from "./CreditAgingTable"; // We'll move AgingData to types later, import for now
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CreditCustomerCardProps {
  data: AgingData; // We'll use the enriched type with last_payment_date
  limit: number;
  onRecordPayment: (customerId: string) => void;
  onViewHistory: (customerId: string) => void;
}

export function CreditCustomerCard({
  data,
  limit,
  onRecordPayment,
  onViewHistory,
}: CreditCustomerCardProps) {
  const balance = Number(data.total_outstanding);
  const utilization = limit > 0 ? (balance / limit) * 100 : 0;

  // Determine status (Overdue if 31+ bucket has balance)
  const isOverdue = Number(data.bucket_31_plus) > 0;

  // Last payment text
  const lastPaymentText = data.last_payment_date
    ? `Last payment: ${formatDistanceToNow(new Date(data.last_payment_date), { addSuffix: true })}`
    : "No recent payments";

  return (
    <Card
      className={cn(
        "border-l-4 transition-all duration-200",
        isOverdue
          ? "bg-[#1A0505] border-l-[#EF4444] border-t-white/5 border-r-white/5 border-b-white/5"
          : "bg-[#0A0A0A] border-l-[#4ADE80] border-t-white/5 border-r-white/5 border-b-white/5",
      )}
    >
      <CardContent className="p-0">
        <div className="p-4 md:p-5">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  isOverdue
                    ? "bg-[#EF4444]/20 text-[#EF4444]"
                    : "bg-[#4ADE80]/20 text-[#4ADE80]",
                )}
              >
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-lg tracking-tight">
                    {data.customer_name}
                  </h3>
                  {isOverdue ? (
                    <span className="text-[10px] font-bold bg-[#EF4444]/20 text-[#EF4444] px-1.5 py-0.5 rounded border border-[#EF4444]/20">
                      OVERDUE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-[#4ADE80]/10 text-[#4ADE80] px-1.5 py-0.5 rounded border border-[#4ADE80]/20">
                      GOOD STANDING
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-xs mt-0.5",
                    isOverdue ? "text-[#EF4444]/80" : "text-muted-foreground",
                  )}
                >
                  {lastPaymentText}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-[#151515] border-white/10 text-white"
              >
                <DropdownMenuItem
                  onClick={() => onRecordPayment(data.customer_id)}
                  className="cursor-pointer hover:bg-white/5"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onViewHistory(data.customer_id)}
                  className="cursor-pointer hover:bg-white/5"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p
                className={cn(
                  "text-[10px] font-bold uppercase mb-1",
                  isOverdue ? "text-[#EF4444]/70" : "text-[#4ADE80]",
                )}
              >
                Balance
              </p>
              <p
                className={cn(
                  "text-lg font-mono font-bold",
                  isOverdue ? "text-[#EF4444]" : "text-[#4ADE80]",
                )}
              >
                ${balance.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                Credit Limit
              </p>
              <p className="text-lg font-mono font-bold text-white">
                ${limit.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                Available
              </p>
              <p
                className={cn(
                  "text-lg font-mono font-bold",
                  limit - balance < 0 ? "text-red-500" : "text-[#4ADE80]",
                )}
              >
                ${(limit - balance).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <Progress
              value={utilization}
              className="h-1.5 bg-white/5"
              indicatorClassName={cn(
                isOverdue ? "bg-[#EF4444]" : "bg-[#4ADE80]",
                utilization > 100 && "bg-red-600",
              )}
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex border-t border-white/5 divide-x divide-white/5">
          <button
            onClick={() => onRecordPayment(data.customer_id)}
            className="flex-1 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <DollarSign className="h-3 w-3" />
            Record Payment
          </button>
          <button
            onClick={() => onViewHistory(data.customer_id)}
            className="flex-1 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="h-3 w-3" />
            View History
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
