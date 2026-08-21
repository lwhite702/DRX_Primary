import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="grid gap-6 p-4 md:grid-cols-[15rem_minmax(0,1fr)] md:p-8" aria-label="Loading settings" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-9 w-40" />
        {[0, 1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-10 w-full" />
        ))}
      </div>
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
