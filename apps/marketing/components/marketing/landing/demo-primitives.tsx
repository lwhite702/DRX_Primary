import type { DemoCardData, DemoRowStatus } from "./demo-types";

function statusClass(status?: DemoRowStatus) {
  if (status === "critical") return "bg-red-400";
  if (status === "warn") return "bg-amber-300";
  if (status === "done") return "bg-emerald-400";
  return "bg-neon-lime";
}

export function DemoStatusDot({ status }: { status?: DemoRowStatus }) {
  return (
    <span
      className={`demo-status-dot inline-block h-2 w-2 rounded-full ${statusClass(status)}`}
      aria-hidden
    />
  );
}

export function DemoCard({
  data,
  className = "",
}: {
  data: DemoCardData;
  className?: string;
}) {
  return (
    <div className={`glass-effect rounded-3xl p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="technical-label text-[10px] text-white/70">{data.title}</p>
        {data.subtitle ? (
          <p className="technical-label text-[10px] text-neon-lime">{data.subtitle}</p>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">
        {data.rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-white/60">{row.label}</span>
            <span className="flex items-center gap-2 font-mono text-white">
              <DemoStatusDot status={row.status} />
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
