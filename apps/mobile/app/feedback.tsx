import React from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Stack } from "expo-router";
import { COLORS } from "../src/constants/theme";

export default function FeedbackScreen() {
  const [jwt, setJwt] = React.useState<string | null>(null);
  const [loadingToken, setLoadingToken] = React.useState(true);

  React.useEffect(() => {
    // In production, this URL should be your deployed backend URL.
    // For local dev on iOS Simulator, localhost:3000 works.
    // For Android Emulator, use 10.0.2.2:3000.
    const API_URL = "http://localhost:3000/api/featurebase/auth";

    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setJwt(data.token);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch Featurebase SSO token:", err);
      })
      .finally(() => {
        setLoadingToken(false);
      });
  }, []);

  if (loadingToken) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const uri = `https://deelrxcrm.featurebase.app/?hideMenu=true&theme=dark${
    jwt ? `&jwt=${jwt}` : ""
  }`;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Feedback & Roadmap",
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
