import MotionTouchableOpacity from "./MotionTouchableOpacity";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@drx-convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";
import { useOffline } from "../contexts/OfflineContext";
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from "../constants/theme";

type Fields = {
  authorizationWindowMinutes: string;
  perSaleLimitDollars: string;
  sessionLimitDollars: string;
  creditLimitDollars: string;
  maxQueuedSales: string;
};
const EMPTY: Fields = { authorizationWindowMinutes: "", perSaleLimitDollars: "", sessionLimitDollars: "", creditLimitDollars: "", maxQueuedSales: "" };
const dollarsToCents = (value: string) => Math.round(Number(value) * 100);

export function OfflineControlCard() {
  const { session } = useAuth();
  const policy = useQuery(api.offline.getPolicy);
  const configurePolicy = useMutation(api.offline.configurePolicy);
  const { authorization, isOnline, isSyncing, queue, refreshAuthorization, syncPending } = useOffline();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [saving, setSaving] = useState(false);
  const canManage = session?.roles.some((role) => role === "owner" || role === "admin") ?? false;

  useEffect(() => {
    if (!policy) return;
    setFields({
      authorizationWindowMinutes: String(policy.authorizationWindowMinutes),
      perSaleLimitDollars: (policy.perSaleLimitCents / 100).toFixed(2),
      sessionLimitDollars: (policy.perDeviceSessionLimitCents / 100).toFixed(2),
      creditLimitDollars: (policy.offlineCreditLimitCents / 100).toFixed(2),
      maxQueuedSales: String(policy.maxQueuedSales),
    });
  }, [policy]);

  const update = (key: keyof Fields, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const args = {
      enabled: true,
      authorizationWindowMinutes: Number(fields.authorizationWindowMinutes),
      perSaleLimitCents: dollarsToCents(fields.perSaleLimitDollars),
      perDeviceSessionLimitCents: dollarsToCents(fields.sessionLimitDollars),
      offlineCreditLimitCents: dollarsToCents(fields.creditLimitDollars),
      maxQueuedSales: Number(fields.maxQueuedSales),
    };
    if (Object.values(args).some((value) => typeof value === "number" && (!Number.isSafeInteger(value) || value <= 0))) {
      Alert.alert("Every limit is required", "Enter positive whole minutes, sale count, and cent-accurate dollar limits.");
      return;
    }
    setSaving(true);
    try {
      await configurePolicy(args);
      await refreshAuthorization();
      Alert.alert("Offline checkout authorized", "This device now holds the owner-approved limits.");
    } catch (error: any) {
      Alert.alert("Offline setup stopped", error.message ?? "The policy could not be saved.");
    } finally { setSaving(false); }
  };

  const refresh = async () => {
    try { await refreshAuthorization(); Alert.alert("Authorization refreshed", "This device is ready for an approved offline window."); }
    catch (error: any) { Alert.alert("Authorization unavailable", error.message ?? "Check the policy and connection."); }
  };

  return <View style={styles.card}>
    <View style={styles.row}><View><Text style={styles.title}>Offline checkout</Text><Text style={styles.meta}>{isOnline ? "Connected to Convex" : "Connection unavailable"}</Text></View><View style={[styles.dot, !isOnline && styles.dotOffline]} /></View>
    <Text style={styles.summary}>{queue.pending.toFixed(1)} queued · ${(queue.totalCents / 100).toFixed(2)} · {queue.quarantined.toFixed(1)} exceptions</Text>
    <Text style={styles.meta}>{authorization ? `Authorized until ${new Date(authorization.expiresAt).toLocaleString()}` : "No active device authorization"}</Text>
    {canManage ? <View style={styles.form}>
      <Text style={styles.help}>Owner limits are required. DRX does not supply risk defaults.</Text>
      <View style={styles.fieldRow}><Field label="Window min" value={fields.authorizationWindowMinutes} onChangeText={(v) => update("authorizationWindowMinutes", v)} /><Field label="Max sales" value={fields.maxQueuedSales} onChangeText={(v) => update("maxQueuedSales", v)} /></View>
      <Field label="Per-sale dollars" value={fields.perSaleLimitDollars} onChangeText={(v) => update("perSaleLimitDollars", v)} />
      <Field label="Device-session dollars" value={fields.sessionLimitDollars} onChangeText={(v) => update("sessionLimitDollars", v)} />
      <Field label="Offline credit dollars" value={fields.creditLimitDollars} onChangeText={(v) => update("creditLimitDollars", v)} />
      <MotionTouchableOpacity style={styles.primary} onPress={save} disabled={saving || !isOnline}>{saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryText}>SAVE LIMITS & AUTHORIZE DEVICE</Text>}</MotionTouchableOpacity>
    </View> : <MotionTouchableOpacity style={styles.secondary} onPress={refresh} disabled={!isOnline}><Text style={styles.secondaryText}>Refresh approved authorization</Text></MotionTouchableOpacity>}
    {queue.pending > 0 && isOnline ? <MotionTouchableOpacity style={styles.secondary} onPress={() => void syncPending()} disabled={isSyncing}><Text style={styles.secondaryText}>{isSyncing ? "Reconciling…" : "Sync queued sales"}</Text></MotionTouchableOpacity> : null}
  </View>;
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType="decimal-pad" placeholder="Required" placeholderTextColor={COLORS.textMuted} /></View>;
}

const styles = StyleSheet.create({
  card:{backgroundColor:COLORS.surface,borderRadius:BORDER_RADIUS.lg,padding:SPACING.md,marginBottom:SPACING.md},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},title:{color:COLORS.text,fontSize:FONT_SIZES.lg,fontWeight:"700"},meta:{color:COLORS.textSecondary,fontSize:FONT_SIZES.xs,marginTop:2},dot:{width:10,height:10,borderRadius:5,backgroundColor:COLORS.success},dotOffline:{backgroundColor:COLORS.warning},summary:{color:COLORS.accent,fontSize:FONT_SIZES.sm,fontWeight:"700",marginTop:SPACING.md},form:{marginTop:SPACING.md},help:{color:COLORS.warning,fontSize:FONT_SIZES.xs,lineHeight:18,marginBottom:SPACING.sm},fieldRow:{flexDirection:"row",gap:SPACING.sm},field:{flex:1,marginBottom:SPACING.sm},label:{color:COLORS.textSecondary,fontSize:FONT_SIZES.xs,marginBottom:4},input:{backgroundColor:COLORS.surfaceLight,borderColor:COLORS.border,borderWidth:1,borderRadius:BORDER_RADIUS.sm,color:COLORS.text,padding:SPACING.sm},primary:{alignItems:"center",backgroundColor:COLORS.accent,borderRadius:BORDER_RADIUS.md,padding:SPACING.md,marginTop:SPACING.xs},primaryText:{color:COLORS.background,fontSize:FONT_SIZES.xs,fontWeight:"900"},secondary:{alignItems:"center",borderColor:COLORS.border,borderWidth:1,borderRadius:BORDER_RADIUS.md,padding:SPACING.sm,marginTop:SPACING.sm},secondaryText:{color:COLORS.accent,fontSize:FONT_SIZES.sm,fontWeight:"600"}
});
