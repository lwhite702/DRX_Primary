import {
  featureStatusLabels,
  type FeatureStatus,
} from "@/lib/feature-canon";

export function FeatureStatusChip({ status }: { status: FeatureStatus }) {
  if (status === "live") return null;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        status === "beta"
          ? "bg-amber-400/20 text-amber-300"
          : "bg-sky-400/20 text-sky-300"
      }`}
    >
      {featureStatusLabels[status]}
    </span>
  );
}
