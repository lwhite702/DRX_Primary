import React, { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { COLORS, MOTION_DURATION, MOTION_EASING, SPACING } from "../constants/theme";

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 0.72 : 1);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = 0.72;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.62, {
        duration: MOTION_DURATION.deliberate * 3,
        easing: Easing.bezier(...MOTION_EASING.standard),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  return <Animated.View accessible={false} style={[styles.block, style, animatedStyle]} />;
}

/** Consistent, fixed-size placeholder rows for data-backed lists. */
export function SkeletonRows({ count = 4, style }: { count?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading content" style={[styles.rows, style]}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.row}>
          <SkeletonBlock style={styles.avatar} />
          <View style={styles.copy}>
            <SkeletonBlock style={styles.primaryLine} />
            <SkeletonBlock style={styles.secondaryLine} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonSummary({ style, accessibleStatus = true }: { style?: StyleProp<ViewStyle>; accessibleStatus?: boolean }) {
  return (
    <View accessible={accessibleStatus} accessibilityRole={accessibleStatus ? "progressbar" : undefined} accessibilityLabel={accessibleStatus ? "Loading summary" : undefined} style={[styles.summary, style]}>
      <SkeletonBlock style={styles.summaryHeading} />
      <SkeletonBlock style={styles.summaryValue} />
      <SkeletonBlock style={styles.summaryLine} />
      <SkeletonBlock style={styles.summaryLineShort} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: COLORS.surfaceLighter, borderRadius: 8 },
  rows: { padding: SPACING.md, gap: SPACING.sm },
  row: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  copy: { flex: 1, gap: 8 },
  primaryLine: { width: "58%", height: 13 },
  secondaryLine: { width: "82%", height: 10 },
  summary: { padding: SPACING.lg, gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  summaryHeading: { width: "42%", height: 14 },
  summaryValue: { width: "66%", height: 34, borderRadius: 10 },
  summaryLine: { width: "88%", height: 11 },
  summaryLineShort: { width: "58%", height: 11 },
});
