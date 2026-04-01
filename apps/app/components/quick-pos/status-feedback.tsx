"use client";

export function StatusFeedback({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (!error && !success) return null;

  return (
    <div
      className={
        "rounded-md border px-4 py-3 text-base font-semibold " +
        (error
          ? "border-red-500 bg-red-950 text-red-100"
          : "border-emerald-500 bg-emerald-950 text-emerald-100")
      }
      role="status"
      aria-live="polite"
    >
      {error || success}
    </div>
  );
}
