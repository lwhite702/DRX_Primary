"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DayNavigatorProps {
  currentDateStr: string;
  timeZone: string;
}

export function DayNavigator({ currentDateStr, timeZone }: DayNavigatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Shift day by offset (-1 for previous, +1 for next)
  const shiftDay = (dateStr: string, offsetDays: number) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + offsetDays));
    return date.toISOString().split("T")[0];
  };

  // Compute today's date in business timeZone
  const getTodayStr = () => {
    try {
      const dtf = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return dtf.format(new Date());
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  };

  const todayStr = getTodayStr();
  const isToday = currentDateStr === todayStr;

  const navigateToDate = (targetDate: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("from", targetDate);
    params.set("to", targetDate);
    router.push(`/reports?${params.toString()}`);
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return new Intl.DateTimeFormat("en-US", {
        timeZone,
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={() => navigateToDate(shiftDay(currentDateStr, -1))}
          aria-label="Previous Day"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous Day
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={() => navigateToDate(shiftDay(currentDateStr, 1))}
          aria-label="Next Day"
        >
          Next Day
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        {!isToday && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-primary"
            onClick={() => navigateToDate(todayStr)}
          >
            Today
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>{formatDisplayDate(currentDateStr)}</span>
          {isToday && (
            <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
              Today
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          <Clock className="h-3 w-3" />
          <span>{timeZone}</span>
        </div>
      </div>
    </div>
  );
}
