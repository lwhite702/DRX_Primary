import React, { useCallback } from "react";
import {
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MOTION_DURATION, MOTION_EASING } from "../constants/theme";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

/** Adds subtle, layout-safe press depth while preserving native touch and a11y behavior. */
export default function MotionTouchableOpacity({
  onPressIn,
  onPressOut,
  activeOpacity,
  style,
  ...props
}: TouchableOpacityProps) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduceMotion ? 0 : pressed.value * 1 },
      { scale: reduceMotion ? 1 : 1 - pressed.value * 0.018 },
    ],
  }), [reduceMotion]);

  const animatePressed = useCallback((next: 0 | 1) => {
    pressed.value = withTiming(next, {
      duration: next ? MOTION_DURATION.instant : MOTION_DURATION.fast,
      easing: Easing.bezier(...MOTION_EASING.standard),
    });
  }, [pressed]);

  return (
    <AnimatedTouchableOpacity
      {...props}
      activeOpacity={activeOpacity ?? 1}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        animatePressed(1);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animatePressed(0);
        onPressOut?.(event);
      }}
    />
  );
}
