"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
          <div className="max-w-lg text-center">
            <h1 className="text-3xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-muted-foreground">
              Refresh the page to try again. If the issue continues, contact DRX support.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
