export type PrivacyPreset = "open" | "balanced" | "private" | "max_secure";

export function maskPII(
  value: string | undefined | null,
  type: "name" | "email" | "phone" | "last_name",
  preset: PrivacyPreset = "balanced",
): string {
  if (!value) return "-";
  if (preset === "open") return value;

  switch (preset) {
    case "balanced":
      if (type === "email") {
        const [user, domain] = value.split("@");
        if (!user || !domain) return value;
        return `${user[0]}***@${domain}`;
      }
      if (type === "phone") {
        return value.replace(/(\d{3})\d{3}(\d{4})/, "$1-***-$2");
      }
      return value;

    case "private":
      if (type === "last_name" || type === "name") {
        const parts = value.split(" ");
        if (parts.length > 1) {
          return `${parts[0]} ${parts[parts.length - 1][0]}.`;
        }
        return `${value[0]}***`;
      }
      if (type === "email" || type === "phone") {
        return "*** Masked ***";
      }
      return value;

    case "max_secure":
      return "*** REDACTED ***";

    default:
      return value;
  }
}

export function getCustomerDisplayName(
  customer: {
    first_name: string;
    last_name?: string | null;
    alias?: string | null;
  },
  preset: PrivacyPreset = "balanced",
): string {
  if (preset === "max_secure") {
    return customer.alias || "Anonymous Alias";
  }

  const fullName = `${customer.first_name} ${customer.last_name || ""}`.trim();

  if (preset === "private") {
    return maskPII(fullName, "name", "private");
  }

  return fullName;
}

/**
 * Irreversibly purges all customer PII and transaction data for a business.
 * @param supabase - Supabase client
 * @param businessId - ID of the business to purge
 */
export async function purgeBusinessData(
  supabase: any,
  businessId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !businessId)
    return { success: false, error: "Invalid parameters" };

  try {
    // 1. Get all sale IDs for the business to delete line items
    const { data: sales } = await supabase
      .from("sales")
      .select("id")
      .eq("business_id", businessId);

    const saleIds = sales?.map((s: any) => s.id) || [];

    if (saleIds.length > 0) {
      // Delete line items first due to FK constraints
      const { error: liError } = await supabase
        .from("sales_line_items")
        .delete()
        .in("sale_id", saleIds);
      if (liError) throw liError;
    }

    // 2. Delete all other transaction-related data
    const tables = [
      "sales",
      "customers",
      "credit_transactions",
      "credit_limits",
      "inventory_intakes",
      "cost_history",
      "inventory_log",
      "ai_insights",
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("business_id", businessId);
      if (error) {
        console.warn(`Failed to purge table ${table}:`, error);
        // Continue with other tables even if one fails
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Purge Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to purge business data",
    };
  }
}
