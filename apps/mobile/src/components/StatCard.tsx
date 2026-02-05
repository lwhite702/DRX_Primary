import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function StatCard({ icon, label, value, color = COLORS.accent, trend, trendValue }: StatCardProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {trend && trendValue && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'} 
            size={14} 
            color={trend === 'up' ? COLORS.success : trend === 'down' ? COLORS.error : COLORS.textSecondary} 
          />
          <Text style={[
            styles.trendText,
            { color: trend === 'up' ? COLORS.success : trend === 'down' ? COLORS.error : COLORS.textSecondary }
          ]}>
            {trendValue}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flex: 1,
    minWidth: 140,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  value: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: 4,
  },
  trendText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
});
