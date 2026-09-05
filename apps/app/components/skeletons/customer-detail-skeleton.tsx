import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditPanelSkeleton } from "./credit-panel-skeleton";

export function CustomerDetailSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-20" /> {/* Back button */}
          <div className="min-w-0">
            <Skeleton className="h-8 w-64 mb-2" /> {/* Name */}
            <Skeleton className="h-4 w-32" /> {/* ID */}
          </div>
        </div>
        <Skeleton className="h-10 w-32 lg:hidden" /> {/* Mobile action */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div>
                    <Skeleton className="h-3 w-12 mb-1" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div>
                    <Skeleton className="h-3 w-12 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-[#161616] p-4 rounded-xl border border-white/10"
                  >
                    <Skeleton className="h-3 w-32 mb-2" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Skeleton (Credit Panel) */}
        <div className="hidden lg:block">
          <CreditPanelSkeleton />
        </div>
      </div>
    </div>
  );
}
