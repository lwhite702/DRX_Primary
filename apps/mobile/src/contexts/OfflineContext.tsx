import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import { useMutation } from "convex/react";
import type { Id } from "@drx-convex/_generated/dataModel";
import { api } from "@drx-convex/_generated/api";
import { useAuth } from "./AuthContext";
import {
  enqueueOfflineSale,
  getActiveAuthorization,
  getOfflineDatabase,
  getQueueSummary,
  listPendingSales,
  markSyncFailure,
  markSyncing,
  markSyncResult,
  saveAuthorization,
} from "../offline/database";
import type {
  OfflineAuthorizationSnapshot,
  OfflineQueueSummary,
  OfflineSaleEnvelope,
} from "../offline/types";

const INSTALLATION_ID_KEY = "drx.android.installation-id.v1";

type OfflineContextValue = {
  isOnline: boolean;
  authorization: OfflineAuthorizationSnapshot | null;
  queue: OfflineQueueSummary;
  isSyncing: boolean;
  refreshAuthorization: () => Promise<OfflineAuthorizationSnapshot>;
  queueSale: (sale: OfflineSaleEnvelope) => Promise<void>;
  syncPending: () => Promise<void>;
};

const EMPTY_QUEUE: OfflineQueueSummary = { pending: 0, quarantined: 0, totalCents: 0 };
const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

async function getInstallationId() {
  if (process.env.EXPO_OS === "android") {
    const androidId = Application.getAndroidId();
    if (androidId) return `android-${androidId}`;
  }
  const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const generated = `install-${globalThis.crypto.randomUUID()}`;
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, generated, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return generated;
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { businessId, userId, isSignedIn } = useAuth();
  const registerDevice = useMutation(api.offline.registerDevice);
  const issueAuthorization = useMutation(api.offline.issueAuthorization);
  const syncSale = useMutation(api.offline.syncSale);
  const [isOnline, setIsOnline] = useState(true);
  const [authorization, setAuthorization] = useState<OfflineAuthorizationSnapshot | null>(null);
  const [queue, setQueue] = useState<OfflineQueueSummary>(EMPTY_QUEUE);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncLock = useRef(false);

  const refreshQueue = useCallback(async () => {
    if (!businessId || !userId) {
      setQueue(EMPTY_QUEUE);
      return;
    }
    setQueue(await getQueueSummary(businessId, userId));
  }, [businessId, userId]);

  useEffect(() => {
    void getOfflineDatabase();
    return NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
  }, []);

  useEffect(() => {
    let active = true;
    if (!businessId || !userId || !isSignedIn) {
      setAuthorization(null);
      void refreshQueue();
      return () => {
        active = false;
      };
    }
    void Promise.all([
      getActiveAuthorization(businessId, userId),
      getQueueSummary(businessId, userId),
    ]).then(([storedAuthorization, summary]) => {
      if (!active) return;
      setAuthorization(storedAuthorization);
      setQueue(summary);
    });
    return () => {
      active = false;
    };
  }, [businessId, isSignedIn, refreshQueue, userId]);

  const refreshAuthorization = useCallback(async () => {
    if (!businessId || !userId || !isSignedIn || !isOnline) {
      throw new Error("ONLINE_AUTHENTICATION_REQUIRED");
    }
    const deviceId = await getInstallationId();
    const registration = await registerDevice({
      deviceId,
      displayName: Application.applicationName ?? "Deelrx CRM Android",
      appVersion: Application.nativeApplicationVersion ?? "0.1.0",
    });
    if (registration.status !== "active") throw new Error("DEVICE_REVOKED");
    const issued = await issueAuthorization({ deviceId });
    const snapshot: OfflineAuthorizationSnapshot = {
      authorizationId: issued.authorizationId,
      businessId,
      userId,
      deviceId: issued.deviceId,
      issuedAt: issued.issuedAt,
      expiresAt: issued.expiresAt,
      policyVersion: issued.policyVersion,
      perSaleLimitCents: issued.perSaleLimitCents,
      sessionLimitCents: issued.sessionLimitCents,
      offlineCreditLimitCents: issued.offlineCreditLimitCents,
      maxQueuedSales: issued.maxQueuedSales,
      collectTax: issued.collectTax,
      taxRateBps: issued.taxRateBps,
    };
    await saveAuthorization(snapshot);
    setAuthorization(snapshot);
    return snapshot;
  }, [businessId, isOnline, isSignedIn, issueAuthorization, registerDevice, userId]);

  const queueSale = useCallback(
    async (sale: OfflineSaleEnvelope) => {
      if (!authorization) throw new Error("OFFLINE_AUTHORIZATION_REQUIRED");
      await enqueueOfflineSale(authorization, sale);
      await refreshQueue();
    },
    [authorization, refreshQueue],
  );

  const syncPending = useCallback(async () => {
    if (syncLock.current || !isOnline || !businessId || !userId || !isSignedIn) return;
    syncLock.current = true;
    setIsSyncing(true);
    try {
      const pending = await listPendingSales(businessId, userId);
      for (const row of pending) {
        await markSyncing(row.idempotencyKey);
        const envelope = row.envelope;
        try {
          const result = await syncSale({
            authorizationId: envelope.authorizationId as Id<"offlineAuthorizations">,
            deviceId: envelope.deviceId,
            idempotencyKey: envelope.idempotencyKey,
            sequence: envelope.sequence,
            occurredAt: envelope.occurredAt,
            customerId: envelope.customerId as Id<"customers"> | undefined,
            customerCreditAvailableCents: envelope.customerCreditAvailableCents,
            items: envelope.items.map((item) => ({
              productId: item.productId as Id<"products">,
              quantityGrams: item.quantityGrams,
              unitPriceCents: item.unitPriceCents,
            })),
            paymentMethod: envelope.paymentMethod,
            amountPaidCents: envelope.amountPaidCents,
          });
          await markSyncResult(row.idempotencyKey, {
            status: result.status,
            saleId: result.saleId,
          });
        } catch (error) {
          const code = error instanceof Error ? error.message.split(":", 1)[0] : "SYNC_FAILED";
          await markSyncFailure(row.idempotencyKey, code);
          break;
        }
      }
    } finally {
      syncLock.current = false;
      setIsSyncing(false);
      await refreshQueue();
    }
  }, [businessId, isOnline, isSignedIn, refreshQueue, syncSale, userId]);

  useEffect(() => {
    if (isOnline) void syncPending();
  }, [isOnline, syncPending]);

  const value = useMemo(
    () => ({
      isOnline,
      authorization,
      queue,
      isSyncing,
      refreshAuthorization,
      queueSale,
      syncPending,
    }),
    [authorization, isOnline, isSyncing, queue, queueSale, refreshAuthorization, syncPending],
  );
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const value = useContext(OfflineContext);
  if (!value) throw new Error("useOffline must be used within OfflineProvider");
  return value;
}
