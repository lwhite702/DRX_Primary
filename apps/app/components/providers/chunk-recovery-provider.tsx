"use client";

import { useEffect } from "react";

const CHUNK_RECOVERY_FLAG = "__drx_chunk_recovery_attempted";

function isChunkLoadFailure(reason: unknown): boolean {
  if (!reason) {
    return false;
  }

  if (reason instanceof Event && reason.type === "error") {
    return true;
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
    normalized.includes("load failed") ||
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
  useEffect(() => {
    unregisterLegacyServiceWorkers().catch(() => {
      // Keep startup resilient even if browser blocks SW/cache access.
    });

    const handleChunkFailure = (reason: unknown) => {
      if (!isChunkLoadFailure(reason) || hasAlreadyRetried()) {
        return;
      }

      markRetried();
      reloadWithCacheBust();
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

  return null;
}
