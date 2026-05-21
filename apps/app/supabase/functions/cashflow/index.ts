import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.5";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface CashflowRequest {
  business_id: string;
  days?: number; // Default 30
}

type LogLevel = "info" | "error";

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getMissingRequiredEnv(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

function toErrorContext(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function log(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });

  if (level === "error") {
    console.error(entry);
    return;
  }

  console.log(entry);
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const missingEnvs = getMissingRequiredEnv();
  if (missingEnvs.length > 0) {
    const message = `Missing required environment variables: ${missingEnvs.join(", ")}`;
    log("error", message, { requestId, missing_envs: missingEnvs });
    return jsonResponse({ success: false, error: message }, 500);
  }

  let body: CashflowRequest | null = null;

  try {
    body = (await req.json()) as CashflowRequest;
    const { business_id, days = 30 } = body;

    if (!business_id) {
      return jsonResponse({ error: "business_id is required" }, 400);
    }

    const supabase = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Fetch sales data
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("total_amount, payment_method, created_at")
      .eq("business_id", business_id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (salesError) throw salesError;

    // Fetch credit payments
    const { data: creditPayments, error: paymentsError } = await supabase
      .from("credit_transactions")
      .select("amount, paid_date, transaction_type")
      .eq("business_id", business_id)
      .eq("transaction_type", "payment")
      .gte("paid_date", startDate.toISOString().split("T")[0]);

    if (paymentsError) throw paymentsError;

    // Fetch pending credit extensions
    const { data: pendingCredit, error: creditError } = await supabase
      .from("credit_transactions")
      .select("amount, due_date, status")
      .eq("business_id", business_id)
      .eq("transaction_type", "extension")
      .eq("status", "pending");

    if (creditError) throw creditError;

    // Calculate metrics
    const totalRevenue = (sales || []).reduce(
      (sum, s) => sum + Number(s.total_amount || 0),
      0
    );
    const cashRevenue = (sales || [])
      .filter((s) => s.payment_method === "cash")
      .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const cardRevenue = (sales || [])
      .filter((s) => s.payment_method === "card")
      .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const creditPaymentsReceived = (creditPayments || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    const pendingCreditAmount = (pendingCredit || []).reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0
    );

    const totalCashflow = totalRevenue + creditPaymentsReceived;
    const averageDailyRevenue = totalRevenue / days;

    // Generate AI insights if OpenAI is configured
    let aiInsight = null;
    if (OPENAI_API_KEY) {
      try {
        const prompt = `Analyze this cashflow data for a small business:

Revenue (last ${days} days): $${totalRevenue.toFixed(2)}
- Cash: $${cashRevenue.toFixed(2)}
- Card: $${cardRevenue.toFixed(2)}
- Credit payments received: $${creditPaymentsReceived.toFixed(2)}
- Pending credit: $${pendingCreditAmount.toFixed(2)}
- Average daily revenue: $${averageDailyRevenue.toFixed(2)}

Provide a JSON response with:
- insight_title: Brief title
- insight_content: Analysis of cashflow health and trends
- priority: "low", "medium", "high", or "critical"
- action_recommended: Specific recommendations

Focus on cashflow health, payment method trends, and credit risk.`;

        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: OPENAI_MODEL,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a financial analyst. Respond with valid JSON only.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.7,
              max_tokens: 800,
            }),
          }
        );

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          const content = openaiData.choices[0]?.message?.content;
          if (content) {
            const jsonMatch =
              content.match(/```json\s*([\s\S]*?)\s*```/) ||
              content.match(/```\s*([\s\S]*?)\s*```/);
            aiInsight = JSON.parse(jsonMatch ? jsonMatch[1] : content);

            // Store insight
            await supabase.from("ai_insights").insert({
              business_id,
              insight_type: "cashflow",
              insight_title: aiInsight.insight_title || "Cashflow Analysis",
              insight_content: aiInsight.insight_content || content,
              priority: aiInsight.priority || "medium",
              action_recommended: aiInsight.action_recommended || "",
              status: "pending",
            });
          }
        }
      } catch (aiError) {
        log("error", "Cashflow AI insight generation failed", {
          requestId,
          error: toErrorContext(aiError),
        });
      }
    }

    return jsonResponse({
      success: true,
      metrics: {
        total_revenue: totalRevenue,
        cash_revenue: cashRevenue,
        card_revenue: cardRevenue,
        credit_payments_received: creditPaymentsReceived,
        pending_credit: pendingCreditAmount,
        total_cashflow: totalCashflow,
        average_daily_revenue: averageDailyRevenue,
        days_analyzed: days,
      },
      sales_count: sales?.length || 0,
      ai_insight: aiInsight,
    });
  } catch (error) {
    log("error", "Cashflow function failed", {
      requestId,
      error: toErrorContext(error),
    });

    // Log failure
    try {
      const supabase = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string);
      await supabase.from("ai_insights_failures").insert({
        business_id: body?.business_id ?? null,
        function_name: "cashflow",
        error_message: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : undefined,
        input_data: body,
      });
    } catch (logError) {
      log("error", "Failed to write ai_insights_failures log", {
        requestId,
        error: toErrorContext(logError),
      });
    }

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
