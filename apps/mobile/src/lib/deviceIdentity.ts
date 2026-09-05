import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";

const INSTALLATION_ID_KEY = "drx.android.installation-id.v1";

export async function getInstallationId() {
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
