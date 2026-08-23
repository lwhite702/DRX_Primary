import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@drx-convex/_generated/api";
import type { Id } from "@drx-convex/_generated/dataModel";
import { useAuth } from "./AuthContext";
import { getInstallationId } from "../lib/deviceIdentity";
import {
  parseDeliveryPushCancellation,
  parseDeliveryPushPayload,
  parseLocalDeliveryReminderPayload,
  setPushSignOutCleanup,
} from "../lib/pushNotifications";
import {
  cancelLocalDeliveryNotifications,
  clearLocalDeliveryNotifications,
} from "../lib/localDeliveryNotifications";
import { localDeliveryNotificationIdentifier } from "../lib/deliveryReminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function expoProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { businessId, isSignedIn, userId } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const registerDeviceToken = useMutation(api.push.registerDeviceToken);
  const unregisterDeviceToken = useMutation(api.push.unregisterDeviceToken);
  const acknowledgeDeliveryPush = useMutation(api.push.acknowledgeDeliveryPush);
  const registeredDeviceId = useRef<string | null>(null);
  const handledResponses = useRef(new Set<string>());

  const registerExpoToken = useCallback(async () => {
    if (Platform.OS !== "android" || !Device.isDevice) return;
    const projectId = expoProjectId();
    if (!projectId) return;

    await Notifications.setNotificationChannelAsync("delivery-reminders", {
      name: "Delivery reminders",
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      vibrationPattern: [0, 250, 150, 250],
    });
    const current = await Notifications.getPermissionsAsync();
    const permission = current.status === "granted"
      ? current
      : await Notifications.requestPermissionsAsync();
    if (permission.status !== "granted") return;

    const deviceId = await getInstallationId();
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerDeviceToken({
      deviceId,
      platform: "android",
      provider: "expo",
      token: token.data,
    });
    registeredDeviceId.current = deviceId;
  }, [registerDeviceToken]);

  const handleNotificationData = useCallback(async (data: unknown, shouldRoute: boolean) => {
    const cancellation = parseDeliveryPushCancellation(data);
    if (cancellation) {
      if (businessId && userId) {
        await clearLocalDeliveryNotifications(
          businessId,
          userId,
          cancellation.deliveryId,
        ).catch(() => cancelLocalDeliveryNotifications(cancellation.deliveryId));
      } else {
        await cancelLocalDeliveryNotifications(cancellation.deliveryId);
      }
      try {
        await acknowledgeDeliveryPush({
          outboxId: cancellation.outboxId as Id<"deliveryPushOutbox">,
        });
      } catch {
        // The next receipt of the durable cancellation can retry acknowledgement.
      }
      return;
    }

    const local = parseLocalDeliveryReminderPayload(data);
    if (local) {
      const responseKey = `local:${local.deliveryId}:${local.kind}:${local.scheduledFor}`;
      if (shouldRoute && !handledResponses.current.has(responseKey)) {
        handledResponses.current.add(responseKey);
        router.push("/deliveries");
      }
      return;
    }

    const payload = parseDeliveryPushPayload(data);
    if (!payload) return;
    if (["eta_warning", "eta_due", "overdue"].includes(payload.kind)) {
      await Notifications.cancelScheduledNotificationAsync(
        localDeliveryNotificationIdentifier(
          payload.deliveryId,
          payload.kind as "eta_warning" | "eta_due" | "overdue",
        ),
      ).catch(() => undefined);
    }
    try {
      await acknowledgeDeliveryPush({
        outboxId: payload.outboxId as Id<"deliveryPushOutbox">,
      });
    } catch {
      // The outbox acknowledgement is idempotent and will be retried if the
      // operator later opens the same notification response.
    }
    if (shouldRoute && !handledResponses.current.has(payload.outboxId)) {
      handledResponses.current.add(payload.outboxId);
      router.push("/deliveries");
    }
  }, [acknowledgeDeliveryPush, businessId, userId]);

  useEffect(() => {
    if (!isSignedIn || !isAuthenticated) return;
    void registerExpoToken().catch(() => undefined);
    const tokenListener = Notifications.addPushTokenListener(() => {
      void registerExpoToken().catch(() => undefined);
    });
    return () => tokenListener.remove();
  }, [isAuthenticated, isSignedIn, registerExpoToken]);

  useEffect(() => {
    if (!isSignedIn) return;
    const received = Notifications.addNotificationReceivedListener((notification) => {
      void handleNotificationData(notification.request.content.data, false);
    });
    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationData(response.notification.request.content.data, true);
    });
    void Notifications.getLastNotificationResponseAsync()
      .then(async (response) => {
        if (!response) return;
        await handleNotificationData(response.notification.request.content.data, true);
        await Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => undefined);
    return () => {
      received.remove();
      responded.remove();
    };
  }, [handleNotificationData, isSignedIn]);

  useEffect(() => {
    setPushSignOutCleanup(async () => {
      const deviceId = registeredDeviceId.current ?? await getInstallationId();
      await unregisterDeviceToken({ deviceId, provider: "expo" });
      registeredDeviceId.current = null;
    });
    return () => setPushSignOutCleanup(null);
  }, [unregisterDeviceToken]);

  return children;
}
