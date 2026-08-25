"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHUNK_RECOVERY_FLAG = "__drx_chunk_recovery_attempted";

function isChunkLoadFailure(reason: unknown): boolean {
  if (!reason) {
    return false;
  }

  if (reason instanceof Event && reason.type === "error") {
    const target = reason.target;
    return (
      target instanceof HTMLScriptElement &&
      target.src.includes("/_next/static/chunks/")
    );
  }

  const message =
    typeof reason === "string"
      ? reason
      : typeof reason === "object" && reason !== null && "message" in reason
        ? String((reason as { message?: unknown }).message)
        : "";

  const normalized = message.toLowerCase();

  return (
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk") ||
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed")
  );
}

function hasAlreadyRetried(): boolean {
  return sessionStorage.getItem(CHUNK_RECOVERY_FLAG) === "1";
}

function markRetried(): void {
  sessionStorage.setItem(CHUNK_RECOVERY_FLAG, "1");
}

function reloadWithCacheBust(): void {
  const url = new URL(window.location.href);
  url.searchParams.set("_chunk_retry", Date.now().toString());
  window.location.replace(url.toString());
}

async function unregisterLegacyServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all(
    registrations.map(async (registration) => {
      try {
        await registration.unregister();
      } catch {
        // No-op: best effort cleanup for stale clients.
      }
    }),
  );

  if (!("caches" in window)) {
    return;
  }

  try {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  } catch {
    // No-op: cache API is not always available in every browser mode.
  }
}

export function ChunkRecoveryProvider() {
  const [chunkFailure, setChunkFailure] = useState(false);

  useEffect(() => {
    const handleChunkFailure = (reason: unknown) => {
      if (isChunkLoadFailure(reason)) setChunkFailure(true);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleChunkFailure(event.reason);
    };

    const onWindowError = (event: ErrorEvent) => {
      handleChunkFailure(event.error ?? event.message);
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onWindowError);
    };
  }, []);

  if (!chunkFailure) return null;

  const retry = async () => {
    if (hasAlreadyRetried()) {
      sessionStorage.removeItem(CHUNK_RECOVERY_FLAG);
    }
    markRetried();
    await unregisterLegacyServiceWorkers();
    reloadWithCacheBust();
  };

  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-[100] mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-background p-4 shadow-2xl"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">This screen could not finish loading</p>
        <p className="text-sm text-muted-foreground">
          Your saved data is unchanged. Reload DRX to download the latest screen files.
        </p>
      </div>
      <Button type="button" size="sm" onClick={() => void retry()}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        Reload DRX
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Dismiss loading error"
        onClick={() => setChunkFailure(false)}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
