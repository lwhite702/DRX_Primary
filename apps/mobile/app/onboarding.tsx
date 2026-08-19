import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@drx-convex/_generated/api";
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from "../src/constants/theme";

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createBusiness = useMutation(api.onboarding.createBusinessOnboarding);
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!businessName.trim()) {
      Alert.alert("Business name required", "Enter the operating name for this location.");
      return;
    }
    setLoading(true);
    try {
      const result = await createBusiness({
        name: ownerName.trim() || undefined,
        businessName: businessName.trim(),
        businessType: "Regulated retail",
        currency: "USD",
        timezone: "America/New_York",
      });
      if (result.status === "BUSINESS_MISSING") throw new Error("The business record could not be loaded.");
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Setup could not finish", error.message ?? "Try again while online.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>SECURE BUSINESS SETUP</Text>
        <Text style={styles.title}>Name this DRX location</Text>
        <Text style={styles.subtitle}>This creates the isolated business workspace and your owner role.</Text>
        <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} placeholder="Your name (optional)" placeholderTextColor={COLORS.textMuted} autoCapitalize="words" />
        <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Business name" placeholderTextColor={COLORS.textMuted} autoCapitalize="words" />
        <TouchableOpacity style={styles.primary} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryText}>CREATE SECURE WORKSPACE</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center", padding: SPACING.lg },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg },
  eyebrow: { color: COLORS.accent, fontSize: FONT_SIZES.sm, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xxl, fontWeight: "700", marginTop: SPACING.sm },
  subtitle: { color: COLORS.textSecondary, fontSize: FONT_SIZES.md, marginTop: SPACING.sm, marginBottom: SPACING.lg },
  input: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border, borderWidth: 1, borderRadius: BORDER_RADIUS.md, color: COLORS.text, fontSize: FONT_SIZES.md, marginBottom: SPACING.md, padding: SPACING.md },
  primary: { alignItems: "center", backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  primaryText: { color: COLORS.background, fontSize: FONT_SIZES.sm, fontWeight: "800" },
});
