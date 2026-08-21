import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-6 p-4 md:p-8" aria-label="Loading customers" aria-busy="true">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-11 w-full" />
      <TableSkeleton rowCount={7} columnCount={5} />
    </div>
  );
}
