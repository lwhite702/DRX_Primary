import { cn } from "@deelrx/ui";

export function SectionBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-white/15 bg-gradient-to-b from-surface-elevated to-surface p-6 md:p-8",
        className
      )}
    >
      <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>
      <div className="space-y-3 text-text-secondary">{children}</div>
    </section>
  );
}
