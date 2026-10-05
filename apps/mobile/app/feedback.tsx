import React from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Stack } from "expo-router";
import { COLORS } from "../src/constants/theme";

export default function FeedbackScreen() {
  const uri = "https://docs.deelrxcrm.com";

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Help & Documentation",
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
        }}
      />

      <WebView
        source={{ uri }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
