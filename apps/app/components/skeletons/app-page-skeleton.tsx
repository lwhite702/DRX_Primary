import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AppPageSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-6 p-4 md:p-8", className)}
      aria-label="Loading page"
      aria-busy="true"
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 max-w-[70vw]" />
        <Skeleton className="h-4 w-80 max-w-[85vw]" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 max-w-[75vw]" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 rounded-lg border border-border/70 p-4"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-32 max-w-[70%]" />
              </div>
              <Skeleton className="h-8 w-20 shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
