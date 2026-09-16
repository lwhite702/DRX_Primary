import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import { COLORS } from "../../src/constants/theme";
import { drxContent } from "@deelrx/content";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
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
          tabBarIcon: ({ color, size, focused }) => (
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
          tabBarIcon: ({ color, size, focused }) => (
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
          tabBarIcon: ({ color, size, focused }) => (
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
          tabBarIcon: ({ color, size, focused }) => (
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
    position: "absolute",
    bottom: Platform.OS === "ios" ? 24 : 16,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(12, 12, 12, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22, // Pops out above tab bar
    borderWidth: 3,
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
    transform: [{ scale: 1.05 }],
  },
});
