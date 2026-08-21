import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createAppClient } from "@/lib/data/client/supabase-client";
import { toast } from "sonner";
import { creditSystem } from "@/lib/utils/credit-system";
import { AgingData } from "../_components/CreditAgingTable";
import { CreditTransaction as LocalCreditTransaction } from "../_components/CreditTransactionsList";
import { Customer, CreditLimit } from "@/lib/validations/schemas";

type CreditLoadStatus =
  "loading" | "refreshing" | "success" | "empty" | "error";
const EMPTY_CREDIT_LIMITS = new Map<string, CreditLimit>();

export function useCreditManager(businessId: string | undefined) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creditLimits, setCreditLimits] = useState<Map<string, CreditLimit>>(
    new Map(),
  );
  const [agingData, setAgingData] = useState<AgingData[]>([]);
  const [transactions, setTransactions] = useState<LocalCreditTransaction[]>(
    [],
  );
  const [status, setStatus] = useState<CreditLoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const supabase = useMemo(() => createAppClient(), []);
  const requestVersion = useRef(0);
  const loadedBusinessId = useRef<string | undefined>(undefined);
  const activeBusinessId = useRef(businessId);
  activeBusinessId.current = businessId;

  const refreshData = useCallback(async () => {
    const requestedBusinessId = businessId;
    const version = ++requestVersion.current;
    if (!requestedBusinessId || !supabase) {
      setCustomers([]);
      setCreditLimits(new Map());
      setAgingData([]);
      setTransactions([]);
      loadedBusinessId.current = undefined;
      setStatus("empty");
      setError(null);
      return;
    }

    const refreshInPlace = loadedBusinessId.current === requestedBusinessId;
    setStatus(refreshInPlace ? "refreshing" : "loading");
    setError(null);
    if (!refreshInPlace) {
      setCustomers([]);
      setCreditLimits(new Map());
      setAgingData([]);
      setTransactions([]);
    }

    try {
      const [customerResult, limitResult, agingResult, transactionResult] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id, first_name, last_name")
            .eq("business_id", requestedBusinessId)
            .eq("is_active", true)
            .eq("ephemeral", false)
            .order("first_name"),
          supabase
            .from("credit_limits")
            .select("customer_id, max_credit_limit, current_balance")
            .eq("business_id", requestedBusinessId),
          creditSystem.getCreditAging(requestedBusinessId),
          supabase
            .from("credit_transactions")
            .select("*, customers(first_name, last_name)")
            .eq("business_id", requestedBusinessId)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

      if (
        version !== requestVersion.current ||
        activeBusinessId.current !== requestedBusinessId
      ) {
        return;
      }
      if (customerResult.error) throw customerResult.error;
      if (limitResult.error) throw limitResult.error;
      if (transactionResult.error) throw transactionResult.error;
      if (!agingResult.success) {
        throw new Error(agingResult.error || "Failed to load credit aging");
      }

      const nextLimits = new Map<string, CreditLimit>();
      for (const limit of limitResult.data ?? []) {
        nextLimits.set(limit.customer_id, {
          ...limit,
          business_id: requestedBusinessId,
        });
      }

      setCustomers((customerResult.data ?? []) as unknown as Customer[]);
      setCreditLimits(nextLimits);
      setAgingData((agingResult.data ?? []) as AgingData[]);
      setTransactions(
        (transactionResult.data ?? []) as unknown as LocalCreditTransaction[],
      );
      loadedBusinessId.current = requestedBusinessId;
      const hasData = Boolean(
        customerResult.data?.length ||
        limitResult.data?.length ||
        agingResult.data?.length ||
        transactionResult.data?.length,
      );
      setStatus(hasData ? "success" : "empty");
    } catch (caught) {
      if (
        version !== requestVersion.current ||
        activeBusinessId.current !== requestedBusinessId
      ) {
        return;
      }
      console.error("Failed to load credit data", {
        errorType: caught instanceof Error ? caught.name : "UnknownError",
      });
      setError("Credit data could not be refreshed. Try again.");
      setStatus("error");
    }
  }, [businessId, supabase]);

  useEffect(() => {
    requestVersion.current += 1;
    loadedBusinessId.current = undefined;
    setCustomers([]);
    setCreditLimits(new Map());
    setAgingData([]);
    setTransactions([]);
    setMutating(false);
    setShowExtensionDialog(false);
    setShowPaymentDialog(false);
    void refreshData();
    return () => {
      requestVersion.current += 1;
    };
  }, [refreshData]);

  const handleExtension = async (data: {
    customer_id: string;
    amount: number;
    notes?: string;
    due_date?: string;
  }) => {
    if (!businessId) return;
    const mutationBusinessId = businessId;
    setMutating(true);
    try {
      const result = await creditSystem.extendCredit(
        mutationBusinessId,
        data.customer_id,
        data.amount,
        data.notes || "",
        data.due_date || new Date().toISOString(),
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to extend credit");
      }
      if (activeBusinessId.current !== mutationBusinessId) return;
      toast.success("Credit extended successfully");
      setShowExtensionDialog(false);
      await refreshData();
    } catch (caught) {
      if (activeBusinessId.current === mutationBusinessId) {
        toast.error(
          caught instanceof Error ? caught.message : "Failed to extend credit",
        );
      }
    } finally {
      if (activeBusinessId.current === mutationBusinessId) {
        setMutating(false);
      }
    }
  };

  const handlePayment = async (data: {
    customer_id: string;
    amount: number;
    notes?: string;
  }) => {
    if (!businessId) return;
    const mutationBusinessId = businessId;
    setMutating(true);
    try {
      const result = await creditSystem.processPayment(
        mutationBusinessId,
        data.customer_id,
        data.amount,
        data.notes || "",
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to record payment");
      }
      if (activeBusinessId.current !== mutationBusinessId) return;
      toast.success("Payment recorded successfully");
      setShowPaymentDialog(false);
      await refreshData();
    } catch (caught) {
      if (activeBusinessId.current === mutationBusinessId) {
        toast.error(
          caught instanceof Error ? caught.message : "Failed to record payment",
        );
      }
    } finally {
      if (activeBusinessId.current === mutationBusinessId) {
        setMutating(false);
      }
    }
  };

  const stateMatchesBusiness = loadedBusinessId.current === businessId;

  return {
    status: stateMatchesBusiness ? status : businessId ? "loading" : "empty",
    loading:
      status === "loading" || (Boolean(businessId) && !stateMatchesBusiness),
    refreshing: status === "refreshing",
    mutating,
    error,
    customers: stateMatchesBusiness ? customers : [],
    creditLimits: stateMatchesBusiness ? creditLimits : EMPTY_CREDIT_LIMITS,
    agingData: stateMatchesBusiness ? agingData : [],
    transactions: stateMatchesBusiness ? transactions : [],
    showExtensionDialog,
    setShowExtensionDialog,
    showPaymentDialog,
    setShowPaymentDialog,
    handleExtension,
    handlePayment,
    refreshData,
  };
}
