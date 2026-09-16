"use client";

import { useEffect } from "react";

type SentryBrowserClient = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
  ) => void;
};

function reportErrorToMonitoring(error: Error & { digest?: string }) {
  if (typeof window !== "undefined") {
    const sentry = (window as Window & { Sentry?: SentryBrowserClient }).Sentry;
    sentry?.captureException?.(error, {
      tags: { digest: error.digest },
      extra: { digest: error.digest },
    });
  }
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    console.error("Root application error:", error);
    reportErrorToMonitoring(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full p-8 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center text-xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">This page could not load</h1>
            <p className="text-sm text-neutral-400">
              Reload the page or return to the dashboard and try again.
            </p>
          </div>

          {error.digest && (
            <div className="px-3 py-2 bg-neutral-950/60 rounded-lg border border-neutral-800 text-xs font-mono text-neutral-400">
              Error Reference: <span className="text-neutral-200 select-all">{error.digest}</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                if (typeof reset === "function") {
                  reset();
                } else if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-white text-black font-medium text-sm hover:bg-neutral-200 transition-colors"
            >
              Reload Page
            </button>
            <a
              href="/"
              className="w-full py-2.5 px-4 rounded-lg border border-neutral-700 font-medium text-sm text-neutral-300 hover:bg-neutral-800 transition-colors inline-block text-center"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
