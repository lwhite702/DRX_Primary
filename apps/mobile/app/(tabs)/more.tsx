import MotionTouchableOpacity from "../../src/components/MotionTouchableOpacity";
import React from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from "../../src/constants/theme";
import { OfflineControlCard } from "../../src/components/OfflineControlCard";

export default function More() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signOut, businessId } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const menuItems = [
    {
      title: "Sales",
      items: [
        {
          icon: "car-outline",
          label: "Deliveries",
          route: "/deliveries",
          disabled: false,
        },
        {
          icon: "receipt-outline",
          label: "Sales",
          route: "/sales-history",
          disabled: false,
        },
        {
          icon: "cash-outline",
          label: "Open drawer",
          route: "/no-sale",
          disabled: false,
        },
        {
          icon: "leaf-outline",
          label: "Record shrinkage",
          route: "/shrinkage",
          disabled: false,
        },
        {
          icon: "clipboard-outline",
          label: "Check stock",
          route: "/inventory-check",
          disabled: false,
        },
      ],
    },
    {
      title: "Reports",
      items: [
        {
          icon: "stats-chart-outline",
          label: "Today’s numbers",
          route: "/daily-summary",
          disabled: false,
        },
        {
          icon: "calendar-outline",
          label: "End of day",
          route: "/end-of-shift",
          disabled: false,
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: "person-outline",
          label: "Profile",
          route: "/settings",
          disabled: false,
        },
        {
          icon: "settings-outline",
          label: "Settings",
          route: "/settings",
          disabled: false,
        },
        {
          icon: "chatbubbles-outline",
          label: "Feedback & Roadmap",
          route: "/feedback",
          disabled: false,
        },
        {
          icon: "help-circle-outline",
          label: "Help",
          route: "/help",
          disabled: false,
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color={COLORS.accent} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>
              {session?.email || session?.displayName || "Operator"}
            </Text>
            <Text style={styles.userRole}>
              {session?.roles.join(", ") || "operator"}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        {/* Business Info */}
        {businessId && (
          <View style={styles.businessCard}>
            <Ionicons name="storefront" size={20} color={COLORS.accent} />
            <Text style={styles.businessLabel}>
              {session?.businessName || "Connected to business"}
            </Text>
          </View>
        )}

        <OfflineControlCard />

        {/* Menu Sections */}
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <MotionTouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 &&
                      styles.menuItemBorder,
                    item.disabled && styles.menuItemDisabled,
                  ]}
                  disabled={item.disabled}
                  onPress={() => {
                    if (item.route) {
                      router.push(item.route as any);
                    }
                  }}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={item.disabled ? COLORS.textMuted : COLORS.text}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      item.disabled && styles.menuItemTextDisabled,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.disabled ? (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Soon</Text>
                    </View>
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={COLORS.textMuted}
                    />
                  )}
                </MotionTouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <MotionTouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </MotionTouchableOpacity>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            {`DRX ${Application.applicationName ?? "Mobile"} v${
              Application.nativeApplicationVersion ?? "unknown"
            } (${Application.nativeBuildVersion ?? "unknown build"})`}
          </Text>
          <Text style={styles.versionSubtext}>
            Secured and synchronized by Convex
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { color: COLORS.text, fontSize: FONT_SIZES.xxl, fontWeight: "700" },
  content: { flex: 1, padding: SPACING.md },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  userInfo: { flex: 1 },
  userEmail: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: "600" },
  userRole: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  statusText: { color: COLORS.success, fontSize: FONT_SIZES.xs },
  businessCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.accent + "15",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  businessLabel: { color: COLORS.accent, fontSize: FONT_SIZES.sm },
  menuSection: { marginBottom: SPACING.md },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuItemDisabled: { opacity: 0.6 },
  menuItemText: { flex: 1, color: COLORS.text, fontSize: FONT_SIZES.md },
  menuItemTextDisabled: { color: COLORS.textSecondary },
  comingSoonBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  comingSoonText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.error + "15",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  signOutText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  versionContainer: { alignItems: "center", paddingVertical: SPACING.xl },
  versionText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
  versionSubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
});
