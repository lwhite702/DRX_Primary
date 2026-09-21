import { FormSheet } from "../../src/components/FormSheet";
import { drxContent } from "@deelrx/content";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreventScreenCapture } from "expo-screen-capture";
import { api } from "@drx-convex/_generated/api";
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from "../../src/constants/theme";
import { useAuth } from "../../src/contexts/AuthContext";
import { getCachedCatalog } from "../../src/offline/database";
import { getBusinessSettings, getScreenPrivacyPreference } from "../../src/services/apiClient";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const maskName = (value: string) => value.split(/\s+/).filter(Boolean).map((part) => `${part[0]?.toUpperCase() ?? "C"}***`).join(" ");
export default function CustomersScreen() {
  usePreventScreenCapture("drx-customers");
  const insets = useSafeAreaInsets();
  const { businessId, userId, getToken } = useAuth();
  const liveCustomers = useQuery(api.customers.listCustomers);
  const [cachedCustomers, setCachedCustomers] = useState<NonNullable<typeof liveCustomers> | null>(null);
  const [shouldMask, setShouldMask] = useState(true);
  const customers = liveCustomers ?? cachedCustomers;
  const createCustomer = useMutation(api.customers.createCustomer);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phoneNumber: "", email: "", creditLimit: "" });
  const filtered = useMemo(() => (customers ?? []).filter((customer) => `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.toLowerCase().includes(search.toLowerCase())), [customers, search]);
  useEffect(() => {
    let active = true;
    if (!businessId || !userId) return () => { active = false; };
    void getCachedCatalog(businessId, userId).then((catalog) => {
      if (active) setCachedCustomers(catalog.customers as NonNullable<typeof liveCustomers>);
    });
    return () => { active = false; };
  }, [businessId, userId]);
  useEffect(() => {
    if (liveCustomers) setCachedCustomers(liveCustomers);
  }, [liveCustomers]);
  useEffect(() => {
    let active = true;
    void getToken().then(async (token) => {
      const [settings, preference] = await Promise.all([
        getBusinessSettings(token),
        getScreenPrivacyPreference(token),
      ]);
      const mode = settings?.privacy_protocol?.screen_privacy?.mode;
      if (active) setShouldMask(mode === "always_on" || (mode === "manual" && !!preference?.manual_enabled));
    }).catch(() => {
      if (active) setShouldMask(true);
    });
    return () => { active = false; };
  }, [getToken]);
  const save = async () => {
    if (!form.firstName.trim() && !form.lastName.trim()) return Alert.alert("Name required", "Enter at least one customer name.");
    setSaving(true);
    try {
      await createCustomer({ firstName: form.firstName.trim() || undefined, lastName: form.lastName.trim() || undefined, phoneNumber: form.phoneNumber.trim() || undefined, email: form.email.trim() || undefined, creditLimitCents: Math.max(0, Math.round(Number(form.creditLimit || 0) * 100)) });
      setForm({ firstName: "", lastName: "", phoneNumber: "", email: "", creditLimit: "" }); setOpen(false);
    } catch (error: any) { Alert.alert("Customer not saved", error.message ?? "Try again."); } finally { setSaving(false); }
  };
  return <View style={[styles.screen,{paddingTop:insets.top}]}><View style={styles.header}><View><Text style={styles.eyebrow}>{drxContent.brand.shortName}</Text><Text style={styles.title}>{drxContent.navigation.customers}</Text></View><TouchableOpacity accessibilityRole="button" style={styles.add} onPress={()=>setOpen(true)}><Text style={styles.addText}>{drxContent.actions.addCustomer}</Text></TouchableOpacity></View>
    <TextInput style={styles.search} value={search} onChangeText={setSearch} accessibilityLabel="Find customer" placeholder="Search by name" placeholderTextColor={COLORS.textMuted} />
    {customers === null ? <ActivityIndicator style={styles.loader} color={COLORS.accent} /> : <FlatList data={filtered} keyExtractor={(item)=>item._id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>No customers found.</Text>} renderItem={({item})=>{const fullName=`${item.firstName??""} ${item.lastName??""}`.trim()||"Customer";const name=shouldMask?maskName(fullName):fullName;const available=Math.max(0,item.creditLimitCents-item.totalCreditUsedCents);return <View style={styles.card}><View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View><View style={styles.info}><Text style={styles.name}>{name}</Text><Text style={styles.meta}>{item.purchaseCount} purchase(s) · {money(item.totalPurchasesCents)}</Text><Text style={styles.credit}>Credit available {money(available)}</Text></View></View>;}} />}
    <FormSheet visible={open} onClose={()=>setOpen(false)}><Text style={styles.title}>New customer</Text>{([['firstName','First name'],['lastName','Last name'],['phoneNumber','Phone (optional)'],['email','Email (optional)'],['creditLimit','Credit limit dollars']] as const).map(([key,label])=><TextInput key={key} accessibilityLabel={label} style={styles.input} value={form[key]} onChangeText={(value)=>setForm((current)=>({...current,[key]:value}))} placeholder={label} placeholderTextColor={COLORS.textMuted} keyboardType={key==='creditLimit'?'decimal-pad':key==='email'?'email-address':'default'} autoCapitalize={key==='email'?'none':'words'} />)}<TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} style={styles.primary} onPress={save} disabled={saving}>{saving?<ActivityIndicator color={COLORS.background}/>:<Text style={styles.primaryText}>{drxContent.actions.save}</Text>}</TouchableOpacity><TouchableOpacity style={styles.cancel} onPress={()=>setOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity></FormSheet>
  </View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:COLORS.background},header:{gap:SPACING.sm,flexWrap:"wrap",flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:SPACING.md},eyebrow:{color:COLORS.accent,fontSize:FONT_SIZES.xs,fontWeight:"800",letterSpacing:1.1},title:{color:COLORS.text,fontSize:FONT_SIZES.xxl,fontWeight:"700"},add:{minHeight:48,justifyContent:"center",backgroundColor:COLORS.accent,borderRadius:BORDER_RADIUS.full,paddingHorizontal:SPACING.md,paddingVertical:SPACING.sm},addText:{color:COLORS.background,fontSize:FONT_SIZES.xs,fontWeight:"900"},search:{backgroundColor:COLORS.surface,borderColor:COLORS.border,borderWidth:1,borderRadius:BORDER_RADIUS.md,color:COLORS.text,marginHorizontal:SPACING.md,padding:SPACING.md},loader:{marginTop:60},list:{padding:SPACING.md,paddingBottom:120},empty:{color:COLORS.textMuted,textAlign:"center",padding:SPACING.xl},card:{flexDirection:"row",alignItems:"center",backgroundColor:COLORS.surface,borderRadius:BORDER_RADIUS.lg,padding:SPACING.md,marginBottom:SPACING.sm},avatar:{width:48,height:48,borderRadius:24,backgroundColor:COLORS.accent+"18",alignItems:"center",justifyContent:"center",marginRight:SPACING.md},avatarText:{color:COLORS.accent,fontSize:FONT_SIZES.xl,fontWeight:"800"},info:{flex:1,minWidth:0},name:{color:COLORS.text,fontSize:FONT_SIZES.md,fontWeight:"700"},meta:{color:COLORS.textSecondary,fontSize:FONT_SIZES.xs,marginTop:3},credit:{color:COLORS.accent,fontSize:FONT_SIZES.xs,marginTop:3},backdrop:{flex:1,backgroundColor:"rgba(0,0,0,.72)",justifyContent:"flex-end"},modal:{backgroundColor:COLORS.surface,borderTopLeftRadius:BORDER_RADIUS.xl,borderTopRightRadius:BORDER_RADIUS.xl,padding:SPACING.lg,paddingBottom:36},input:{backgroundColor:COLORS.surfaceLight,borderColor:COLORS.border,borderWidth:1,borderRadius:BORDER_RADIUS.md,color:COLORS.text,marginTop:SPACING.sm,padding:SPACING.md},primary:{alignItems:"center",backgroundColor:COLORS.accent,borderRadius:BORDER_RADIUS.md,padding:SPACING.md,marginTop:SPACING.md},primaryText:{color:COLORS.background,fontWeight:"900"},cancel:{minHeight:48,justifyContent:"center",alignItems:"center",paddingTop:SPACING.md},cancelText:{color:COLORS.textSecondary}});
