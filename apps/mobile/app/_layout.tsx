import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { AuthProvider } from '../src/contexts/AuthContext';
import { OfflineProvider } from '../src/contexts/OfflineContext';
import { PushNotificationProvider } from '../src/contexts/PushNotificationContext';
import { initErrors } from '@wrelik/errors/react-native';
import { PostHogProvider } from 'posthog-react-native';

// Initialize Sentry for mobile error tracking
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  initErrors({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export default function RootLayout() {
  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY!}
      options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
        enableSessionReplay: false,
      }}
    >
      <AuthProvider>
        <PushNotificationProvider>
          <OfflineProvider>
            <View style={styles.container}>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#0A0A0A' },
                  animation: 'slide_from_right',
                }}
              />
            </View>
          </OfflineProvider>
        </PushNotificationProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
});
