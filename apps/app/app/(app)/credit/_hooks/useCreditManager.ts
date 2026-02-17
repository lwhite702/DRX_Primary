import { useState, useCallback, useEffect } from "react";
import { createAppClient } from "@/lib/data/client/supabase-client";
import { toast } from "sonner";
import { creditSystem } from "@/lib/utils/credit-system";
import { AgingData } from "../_components/CreditAgingTable";
import { CreditTransaction as LocalCreditTransaction } from "../_components/CreditTransactionsList"; // Renaming to avoid conflict
import { Customer, CreditLimit } from "@/lib/validations/schemas"; // Import from schemas (CreditTransaction might conflict, I'll alias local)

export function useCreditManager(businessId: string | undefined) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creditLimits, setCreditLimits] = useState<Map<string, CreditLimit>>(
    new Map(),
  );
  const [agingData, setAgingData] = useState<AgingData[]>([]);
  const [transactions, setTransactions] = useState<LocalCreditTransaction[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const supabase = createAppClient();

  const fetchCustomers = useCallback(async () => {
    if (!businessId || !supabase) return;
    const { data } = await supabase
      .from("customers")
      .select("id, first_name, last_name")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("first_name");

    if (data) setCustomers(data as unknown as Customer[]);
  }, [businessId, supabase]);

  const fetchCreditLimits = useCallback(async () => {
    if (!businessId || !supabase) return;
    const { data } = await supabase
      .from("credit_limits")
      .select("customer_id, max_credit_limit, current_balance")
      .eq("business_id", businessId);

    if (data) {
      const map = new Map();
      data.forEach((limit: CreditLimit) => map.set(limit.customer_id, limit));
      setCreditLimits(map);
    }
  }, [businessId, supabase]);

  const fetchAgingData = useCallback(async () => {
    if (!businessId) return;
    const result = await creditSystem.getCreditAging(businessId);
    if (result.success && result.data) {
      setAgingData(result.data as AgingData[]);
    }
  }, [businessId]);

  const fetchTransactions = useCallback(async () => {
    if (!businessId || !supabase) return;
    // Fetch recent transactions with customer details
    const { data } = await supabase
      .from("credit_transactions")
      .select(`*, customers(first_name, last_name)`)
      .order("created_at", { ascending: false }) // changing to created_at to match original page pattern?
      .limit(50);

    if (data) setTransactions(data as unknown as LocalCreditTransaction[]);
  }, [businessId, supabase]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchCustomers(),
      fetchCreditLimits(),
      fetchAgingData(),
      fetchTransactions(),
    ]);
    setLoading(false);
  }, [fetchCustomers, fetchCreditLimits, fetchAgingData, fetchTransactions]);

  useEffect(() => {
    if (businessId) {
      refreshData();
    }
  }, [businessId, refreshData]);

  const handleExtension = async (data: {
    customer_id: string;
    amount: number;
    notes?: string;
    due_date?: string;
  }) => {
    if (!businessId) return;

    const result = await creditSystem.extendCredit(
      businessId,
      data.customer_id,
      data.amount,
      data.notes || "",
      data.due_date || new Date().toISOString(), // Fallback if undefined, though form should provide it
    );

    if (result.success) {
      toast.success("Credit extended successfully");
      setShowExtensionDialog(false);
      refreshData();
    } else {
      toast.error(result.error || "Failed to extend credit");
    }
  };

  const handlePayment = async (data: {
    customer_id: string;
    amount: number;
    notes?: string;
  }) => {
    if (!businessId) return;

    const result = await creditSystem.processPayment(
      businessId,
      data.customer_id,
      data.amount,
      data.notes || "",
    );

    if (result.success) {
      toast.success("Payment recorded successfully");
      setShowPaymentDialog(false);
      refreshData();
    } else {
      toast.error(result.error || "Failed to record payment");
    }
  };

  return {
    loading,
    customers,
    creditLimits,
    agingData,
    transactions,
    showExtensionDialog,
    setShowExtensionDialog,
    showPaymentDialog,
    setShowPaymentDialog,
    handleExtension,
    handlePayment,
    refreshData,
  };
}
