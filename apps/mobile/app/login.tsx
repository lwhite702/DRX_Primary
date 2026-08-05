import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from "../src/constants/theme";

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    console.log("Attempting login with:", email.trim());
    try {
      const { error } = await signIn(email.trim(), password);
      console.log("Login result, error:", error);
      if (error) {
        console.error("Login error:", error.message);
        Alert.alert("Login Failed", error.message);
      } else {
        console.log("Login successful, navigating to tabs");
        // Small delay to allow auth state to update
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 500);
      }
    } catch (error: any) {
      console.error("Login exception:", error);
      Alert.alert("Error", error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Logo/Brand */}
        <View style={styles.brandContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/drx-wordmark.png")}
              style={styles.logoImage}
              resizeMode="contain"
              accessible
              accessibilityLabel="DRX logo"
            />
          </View>
          <Text style={styles.tagline}>Your front. Your numbers. Locked.</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>System Entry</Text>
          <Text style={styles.subtitle}>Secure Terminal Access</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Operator ID / Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="key-outline"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Passkey"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            testID="login-button"
            accessibilityRole="button"
            accessibilityLabel="Sign In"
          >
            {loading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Text style={styles.loginButtonText}>SIGN IN</Text>
                <Ionicons
                  name="finger-print-outline"
                  size={20}
                  color={COLORS.background}
                />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Mobile POS Terminal</Text>
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: "center",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: SPACING.xxl,
  },
  logoContainer: {
    width: 240,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  logoImage: {
    width: 240,
    height: 80,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    paddingLeft: SPACING.md,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  eyeIcon: {
    padding: SPACING.md,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginTop: SPACING.xxl,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
});
