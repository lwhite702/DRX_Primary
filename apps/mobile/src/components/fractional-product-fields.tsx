import React, { useState } from "react";
import { View, Text, TextInput, Switch, TouchableOpacity } from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import type { ProductCommerceConfig } from "../../../app/lib/commerce/config";
import {
  commerceIssue,
  guidedCommerceProfile,
  parsePresetInput,
} from "../../../app/lib/commerce/product-creation";

export function FractionalProductFields({
  value,
  onChange,
}: {
  value: ProductCommerceConfig;
  onChange: (config: ProductCommerceConfig) => void;
}) {
  const [dollars, setDollars] = useState("");
  const [quantities, setQuantities] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const update = (patch: Partial<ProductCommerceConfig>) =>
    onChange({ ...value, ...patch });
  const inputStyle = {
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  };
  return (
    <View style={{ gap: SPACING.md, marginBottom: SPACING.lg }}>
      <Text style={{ color: COLORS.text, fontWeight: "700", fontSize: 18 }}>
        How this product is sold
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: COLORS.text }}>Allow fractional sales</Text>
        <Switch
          accessibilityLabel="Allow fractional sales"
          value={value.fractionalEnabled}
          onValueChange={(enabled) => {
            onChange({
              ...guidedCommerceProfile(value.sellingUnit, enabled),
              suggestedDollarAmounts: value.suggestedDollarAmounts,
            });
            setQuantities(guidedCommerceProfile(value.sellingUnit, enabled).suggestedQuantities.join(", "));
          }}
        />
      </View>
      <Text style={{ color: COLORS.textSecondary }}>
        Sell part of a unit, such as 0.5 g. Price and cost are for one full
        selling unit. This setting applies only to this product.
      </Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => setShowCustom(!showCustom)}>
        <Text style={{ color: COLORS.accent }}>{showCustom ? "Hide custom selling rules" : "Custom selling rules"}</Text>
      </TouchableOpacity>
      {showCustom && value.fractionalEnabled &&
        (
          [
            ["decimalPrecision", "Decimal places (1–6)"],
            ["minimumSaleQuantity", "Minimum sale quantity"],
            ["quantityIncrement", "Quantity increment"],
          ] as const
        ).map(([field, label]) => (
          <View key={field} style={{ gap: 6 }}>
            <Text style={{ color: COLORS.text }}>{label}</Text>
            <TextInput
              accessibilityLabel={label}
              style={inputStyle}
              keyboardType="decimal-pad"
              defaultValue={String(value[field])}
              onChangeText={(text) => update({ [field]: Number(text) })}
            />
          </View>
        ))}
      {showCustom && <><Text style={{ color: COLORS.text }}>Suggested dollar amounts</Text>
      <TextInput
        accessibilityLabel="Suggested dollar amounts"
        style={inputStyle}
        placeholder="10, 20, 50"
        placeholderTextColor={COLORS.textMuted}
        value={dollars}
        onChangeText={(text) => {
          setDollars(text);
          update({ suggestedDollarAmounts: parsePresetInput(text) });
        }}
      />
      <Text style={{ color: COLORS.text }}>Suggested quantities</Text>
      <TextInput
        accessibilityLabel="Suggested quantities"
        style={inputStyle}
        placeholder={value.fractionalEnabled ? "0.5, 1, 3.5" : "1, 2, 3"}
        placeholderTextColor={COLORS.textMuted}
        value={quantities || value.suggestedQuantities.join(", ")}
        onChangeText={(text) => {
          setQuantities(text);
          update({ suggestedQuantities: parsePresetInput(text) });
        }}
      />
      <Text style={{ color: COLORS.textSecondary }}>
        Optional: up to eight comma-separated presets. Quantities must start at
        the minimum plus increments. Checkout suggests a quantity from the
        dollar amount.
      </Text>
      </>}
      {commerceIssue(value) && <View style={{ gap: 8 }}>
        <Text accessibilityRole="alert" style={{ color: COLORS.error }}>{commerceIssue(value)}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => {
          const reset = guidedCommerceProfile(value.sellingUnit, value.fractionalEnabled);
          onChange({ ...reset, suggestedDollarAmounts: value.suggestedDollarAmounts });
          setQuantities(reset.suggestedQuantities.join(", "));
        }}><Text style={{ color: COLORS.accent }}>Use recommended rules</Text></TouchableOpacity>
      </View>}
    </View>
  );
}
