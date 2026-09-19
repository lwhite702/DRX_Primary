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
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { Id } from "@drx-convex/_generated/dataModel";
import { api } from "@drx-convex/_generated/api";
import { useAuth } from "./AuthContext";
import {
  enqueueOfflineSale,
  getActiveAuthorization,
  getCachedCatalog,
  getOfflineDatabase,
  getQueueSummary,
  listPendingSales,
  markSyncFailure,
  markSyncing,
  markSyncResult,
  quarantineOfflineSale,
  saveAuthorization,
} from "../offline/database";
import type {
  OfflineAuthorizationSnapshot,
  OfflineQueueSummary,
  OfflineSaleEnvelope,
} from "../offline/types";
import {
  OfflineQuantityValidationError,
  validateOfflineSaleQuantities,
} from "../lib/offlineSaleValidation";
import { getInstallationId } from "../lib/deviceIdentity";

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

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { businessId, userId, isSignedIn } = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const registerDevice = useMutation(api.offline.registerDevice);
  const issueAuthorization = useMutation(api.offline.issueAuthorization);
  const syncSale = useMutation(api.offline.syncSale);
  const liveProducts = useQuery(
    api.products.listProducts,
    isSignedIn && isConvexAuthenticated ? {} : "skip",
  );
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
    let issued;
    try {
      issued = await issueAuthorization({ deviceId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("DEVICE_NOT_AUTHORIZED")) throw error;
      const registration = await registerDevice({
        deviceId,
        displayName: Application.applicationName ?? "DRX Android",
        appVersion: Application.nativeApplicationVersion ?? "unknown",
      });
      if (registration.status !== "active") throw new Error("DEVICE_REVOKED");
      issued = await issueAuthorization({ deviceId });
    }
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
      const catalog = await getCachedCatalog(sale.businessId, sale.userId);
      validateOfflineSaleQuantities(sale.items, catalog.products);
      await enqueueOfflineSale(authorization, sale);
      await refreshQueue();
    },
    [authorization, refreshQueue],
  );

  const syncPending = useCallback(async () => {
    if (
      syncLock.current ||
      !isOnline ||
      !businessId ||
      !userId ||
      !isSignedIn ||
      liveProducts === undefined
    ) return;
    syncLock.current = true;
    setIsSyncing(true);
    try {
      const pending = await listPendingSales(businessId, userId);
      for (const row of pending) {
        try {
          validateOfflineSaleQuantities(row.envelope.items, liveProducts);
        } catch (error) {
          if (!(error instanceof OfflineQuantityValidationError)) throw error;
          await quarantineOfflineSale(row.idempotencyKey, error.code);
          continue;
        }
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
            discountAmountCents: envelope.discountAmountCents,
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
  }, [businessId, isOnline, isSignedIn, liveProducts, refreshQueue, syncSale, userId]);

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
