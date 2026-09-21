import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { COLORS } from "../../src/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { drxContent } from "@deelrx/content";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 72 + Math.max(insets.bottom, 8) + Math.max(0, fontScale - 1) * 24, paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: "below-icon",
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
      }}
    >
      <Tabs.Screen
        name="customers"
        options={{
          title: drxContent.navigation.customers,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Ionicons
                name={focused ? "people" : "people-outline"}
                size={22}
                color={color}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: drxContent.navigation.more,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Ionicons
                name={focused ? "menu" : "menu-outline"}
                size={22}
                color={color}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: drxContent.navigation.newSale,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.posIconContainer,
                focused && styles.posIconContainerFocused,
              ]}
              accessibilityLabel="New sale cart"
            >
              <Ionicons
                name={focused ? "cart" : "cart-outline"}
                size={22}
                color={COLORS.background}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="credits"
        options={{
          title: drxContent.navigation.payments,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Ionicons
                name={focused ? "wallet" : "wallet-outline"}
                size={22}
                color={color}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: drxContent.navigation.products,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Ionicons
                name={focused ? "cube" : "cube-outline"}
                size={22}
                color={color}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
          href: "/inventory",
        }}
      />
      <Tabs.Screen
        name="inventory/add"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    elevation: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
  tabBarIcon: {
    marginBottom: 0,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: 28,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  posIconContainer: {
    backgroundColor: COLORS.accent,
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
    borderWidth: 0,
    borderColor: "#0c0c0c",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  posIconContainerFocused: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,

  },
});
