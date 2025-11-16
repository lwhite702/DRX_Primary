import { getSupabaseClient } from "@/lib/supabase/client";
import { offlineSyncManager } from "./offline-sync";
import type { CreditTransaction } from "@/lib/validations/schemas";

export interface CreditAgingBucket {
  customer_id: string;
  customer_name: string;
  bucket_1_7: number;
  bucket_8_14: number;
  bucket_15_30: number;
  bucket_31_plus: number;
  total_outstanding: number;
}

export interface ReliabilityScore {
  customer_id: string;
  customer_name: string;
  reliability_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  total_extensions: number;
  paid_on_time: number;
  paid_late: number;
  pending: number;
}

export class CreditSystem {
  private supabase = getSupabaseClient();

  // Extend credit (front)
  async extendCredit(
    business_id: string,
    customer_id: string,
    amount: number,
    description: string,
    due_date: string
  ): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    // If offline, store for sync
    if (!offlineSyncManager.isOnline()) {
      const transactionId = await offlineSyncManager.storeTransaction("credit_extension", {
        business_id,
        customer_id,
        amount,
        description,
        due_date,
      });
      return { success: true, transaction_id: transactionId };
    }

    try {
      const { data, error } = await this.supabase.rpc("extend_credit", {
        p_business_id: business_id,
        p_customer_id: customer_id,
        p_amount: amount,
        p_description: description,
        p_due_date: due_date,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, transaction_id: data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Process credit payment
  async processPayment(
    business_id: string,
    customer_id: string,
    amount: number,
    description: string
  ): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    // If offline, store for sync
    if (!offlineSyncManager.isOnline()) {
      const transactionId = await offlineSyncManager.storeTransaction("credit_payment", {
        business_id,
        customer_id,
        amount,
        description,
      });
      return { success: true, transaction_id: transactionId };
    }

    try {
      const { data, error } = await this.supabase.rpc("process_credit_payment", {
        p_business_id: business_id,
        p_customer_id: customer_id,
        p_amount: amount,
        p_description: description,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, transaction_id: data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get credit aging buckets
  async getCreditAging(
    business_id: string,
    customer_id?: string
  ): Promise<{ success: boolean; data?: CreditAgingBucket[]; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    try {
      const { data, error } = await this.supabase.rpc("get_credit_aging", {
        p_business_id: business_id,
        p_customer_id: customer_id || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get credit limit for customer
  async getCreditLimit(
    business_id: string,
    customer_id: string
  ): Promise<{ success: boolean; limit?: number; balance?: number; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    try {
      const { data, error } = await this.supabase
        .from("credit_limits")
        .select("max_credit_limit, current_balance")
        .eq("business_id", business_id)
        .eq("customer_id", customer_id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        limit: Number(data.max_credit_limit || 0),
        balance: Number(data.current_balance || 0),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Set credit limit
  async setCreditLimit(
    business_id: string,
    customer_id: string,
    max_limit: number
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    try {
      const { error } = await this.supabase
        .from("credit_limits")
        .upsert(
          {
            business_id,
            customer_id,
            max_credit_limit: max_limit,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "business_id,customer_id",
          }
        );

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get delinquent accounts
  async getDelinquentAccounts(
    business_id: string,
    days_overdue: number = 0
  ): Promise<{ success: boolean; accounts?: any[]; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days_overdue);

      const { data, error } = await this.supabase
        .from("credit_transactions")
        .select(
          `
          id,
          customer_id,
          amount,
          due_date,
          status,
          customers!inner(id, first_name, last_name)
        `
        )
        .eq("business_id", business_id)
        .eq("transaction_type", "extension")
        .eq("status", "pending")
        .lt("due_date", cutoffDate.toISOString().split("T")[0])
        .order("due_date", { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, accounts: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Freeze credit account (set limit to 0)
  async freezeAccount(
    business_id: string,
    customer_id: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.setCreditLimit(business_id, customer_id, 0);
  }

  // Unfreeze credit account (restore previous limit or set default)
  async unfreezeAccount(
    business_id: string,
    customer_id: string,
    previous_limit?: number
  ): Promise<{ success: boolean; error?: string }> {
    const limit = previous_limit || 1000; // Default $1000
    return this.setCreditLimit(business_id, customer_id, limit);
  }
}

export const creditSystem = new CreditSystem();

