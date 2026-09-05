import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
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

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert("Missing info", "Enter your username or email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(identifier.trim(), password);
      if (error) {
        Alert.alert("Couldn't sign in", error.message);
      } else {
        router.replace("/");
      }
    } catch (error: any) {
      console.error("Login exception:", error);
      Alert.alert("Couldn't sign in", error.message || "Check your info and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
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
          <Text style={styles.tagline}>Keep the count right.</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Pick up where you left off.</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Username or email"
              placeholderTextColor={COLORS.textMuted}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              cursorColor={COLORS.accent}
              selectionColor={COLORS.accent}
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
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              cursorColor={COLORS.accent}
              selectionColor={COLORS.accent}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
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
                  name="arrow-forward-outline"
                  size={20}
                  color={COLORS.background}
                />
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => router.push("/signup")}
            accessibilityRole="link"
          >
            <Text style={styles.signupText}>Create an owner account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>DRX</Text>
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
    letterSpacing: 1,
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
    borderColor: COLORS.borderLight,
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
  signupLink: {
    alignItems: "center",
    paddingTop: SPACING.lg,
  },
  signupText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: SPACING.xxl,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
});
