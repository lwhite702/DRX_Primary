import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";

export default function Help() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleEmailSupport = () => {
    Linking.openURL("mailto:support@deelrxcrm.com?subject=Mobile App Support Request");
  };

  const handleOpenDocs = () => {
    Linking.openURL("https://docs.deelrxcrm.com");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Ionicons name="book-outline" size={48} color={COLORS.accent} style={{ marginBottom: SPACING.md }} />
          <Text style={styles.cardTitle}>Documentation & Support</Text>
          <Text style={styles.cardText}>
            Access operator runbooks, setup guides, and troubleshooting in the DRX documentation hub.
          </Text>
          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenDocs}>
            <Ionicons name="open-outline" size={20} color={COLORS.background} />
            <Text style={styles.actionBtnText}>Open Documentation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginTop: SPACING.sm }]}
            onPress={handleEmailSupport}
          >
            <Ionicons name="mail-outline" size={20} color={COLORS.text} />
            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>Email Help Scout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How do I record a No Sale?</Text>
          <Text style={styles.faqAnswer}>
            Go to the &quot;More&quot; tab and select &quot;No Sale / Open Drawer&quot;. This will record the event in the system and send a signal to open the connected cash drawer.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How does Shrinkage work?</Text>
          <Text style={styles.faqAnswer}>
            Use the &quot;Personal Use / Shrinkage&quot; option to account for damaged, spilled, or personal-use inventory. It adjusts your inventory levels accordingly.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>What is End of Shift?</Text>
          <Text style={styles.faqAnswer}>
            The End of Shift report reconciles your recorded sales against changes in your inventory. It flags any discrepancies so you can investigate before closing out.
          </Text>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: "700" },
  content: { padding: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  cardText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    gap: SPACING.sm,
  },
  actionBtnText: { color: COLORS.background, fontSize: FONT_SIZES.md, fontWeight: "700" },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    marginBottom: SPACING.md,
  },
  faqItem: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  faqQuestion: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    marginBottom: SPACING.xs,
  },
  faqAnswer: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  }
});
