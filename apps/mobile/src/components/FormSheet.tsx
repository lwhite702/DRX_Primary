import React from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";
import { BORDER_RADIUS, COLORS, SPACING } from "../constants/theme";

/** Shared form surface: Android Back, keyboard clearance, safe areas and large text. */
export function FormSheet({ visible, onClose, children }: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? "none" : "slide"} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.backdrop, { paddingTop: insets.top + SPACING.md }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, SPACING.md) + SPACING.md }]}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", alignItems: "center", backgroundColor: "rgba(0,0,0,0.72)" },
  sheet: { width: "100%", maxWidth: 640, maxHeight: "100%", backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.xxl, borderTopRightRadius: BORDER_RADIUS.xxl, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  content: { padding: SPACING.lg, gap: SPACING.sm },
});
