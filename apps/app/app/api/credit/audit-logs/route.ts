import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerCreditId = searchParams.get("customerCreditId");
    if (!customerCreditId) {
      return errorResponse("BAD_REQUEST", "customerCreditId is required", 400);
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    // We fetch logs for the credit limit (entity_id = customerCreditId)
    // AND apparently for transactions related to it.
    // For simplicity, we query system_audit_log for everything related to this scope.
    // But system_audit_log doesn't have link to credit bucket easily for transactions.
    // We'll rely on entity_type='credit_transactions' and perhaps filtering in code or join?
    // Join is hard here.
    // TC002 iterates looking for transaction_id.
    // Let's first fetch transaction IDs for this credit id.

    // 1. Get transactions
    // Need customer_id first
    const { data: credit } = await supabase
      .from("credit_limits")
      .select("customer_id")
      .eq("id", customerCreditId)
      .single();

    let transactionIds: string[] = [];
    if (credit) {
      const { data: transactions } = await supabase
        .from("credit_transactions")
        .select("id")
        .eq("customer_id", credit.customer_id);
      if (transactions) {
        transactionIds = transactions.map((t: { id: string }) => t.id);
      }
    }

    // 2. Fetch logs
    // entity_id is either customerCreditId OR in transactionIds
    let idsToCheck = [customerCreditId];
    if (transactionIds.length > 0) {
      idsToCheck = [...idsToCheck, ...transactionIds];
    }

    // Clean nulls
    idsToCheck = idsToCheck.filter((i) => i) as string[];

    if (idsToCheck.length === 0) {
      return successResponse({ items: [], data: [], count: 0 });
    }

    const { data: logs, error } = await supabase
      .from("system_audit_log")
      .select("*")
      .in("entity_id", idsToCheck)
      .order("created_at", { ascending: false });

    if (error) {
      return errorResponse(
        "INTERNAL_ERROR",
        "Failed to fetch logs",
        500,
        error,
      );
    }

    // Map response
    const mapped = logs.map((log: any) => ({
      ...log,
      transaction_id:
        log.entity_type === "credit_transactions" ? log.entity_id : null,
      timestamp: log.created_at,
      performed_by: log.user_id,
    }));

    return successResponse({ items: mapped, data: mapped, count: mapped.length });
  } catch (error) {
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}
