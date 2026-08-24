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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSignUp } from "../src/adapters/auth/client";
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from "../src/constants/theme";

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!isLoaded || !signUp) return;
    setLoading(true);
    try {
      if (!awaitingCode) {
        await signUp.create({ emailAddress: email.trim(), password });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setAwaitingCode(true);
        return;
      }
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status !== "complete" || !result.createdSessionId) {
        throw new Error("Verification is not complete yet.");
      }
      await setActive({ session: result.createdSessionId });
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Account setup", error.errors?.[0]?.message ?? error.message ?? "Unable to continue");
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
        <Text style={styles.eyebrow}>DRX OWNER SETUP</Text>
        <Text style={styles.title}>{awaitingCode ? "Verify your email" : "Create your account"}</Text>
        <Text style={styles.subtitle}>
          {awaitingCode ? `Enter the code sent to ${email.trim()}.` : "Use the owner email for this location."}
        </Text>
        {!awaitingCode ? (
          <>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Owner email"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              cursorColor={COLORS.accent}
              selectionColor={COLORS.accent}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoComplete="new-password"
              cursorColor={COLORS.accent}
              selectionColor={COLORS.accent}
            />
          </>
        ) : (
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Verification code"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            cursorColor={COLORS.accent}
            selectionColor={COLORS.accent}
          />
        )}
        <TouchableOpacity style={styles.primary} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryText}>CONTINUE</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => router.replace("/login")}>
          <Text style={styles.secondaryText}>Back to sign in</Text>
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
  input: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.borderLight, borderWidth: 1, borderRadius: BORDER_RADIUS.md, color: COLORS.text, fontSize: FONT_SIZES.md, marginBottom: SPACING.md, padding: SPACING.md },
  primary: { alignItems: "center", backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  primaryText: { color: COLORS.background, fontSize: FONT_SIZES.md, fontWeight: "800" },
  secondary: { alignItems: "center", paddingTop: SPACING.lg },
  secondaryText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
});
