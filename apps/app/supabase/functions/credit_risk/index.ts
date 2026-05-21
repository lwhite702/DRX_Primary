import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.5";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface CreditRiskRequest {
  business_id: string;
  customer_id?: string; // Optional: analyze specific customer
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

  let body: CreditRiskRequest | null = null;

  try {
    body = (await req.json()) as CreditRiskRequest;
    const { business_id, customer_id } = body;

    if (!business_id) {
      return jsonResponse({ error: "business_id is required" }, 400);
    }

    const supabase = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string);

    // Fetch credit data
    let creditQuery = supabase
      .from("credit_transactions")
      .select(
        "id, customer_id, transaction_type, amount, due_date, paid_date, status, created_at"
      )
      .eq("business_id", business_id)
      .eq("transaction_type", "extension");

    if (customer_id) {
      creditQuery = creditQuery.eq("customer_id", customer_id);
    }

    const { data: creditTransactions, error: creditError } = await creditQuery;

    if (creditError) throw creditError;

    // Fetch credit limits
    let limitsQuery = supabase
      .from("credit_limits")
      .select("customer_id, max_credit_limit, current_balance")
      .eq("business_id", business_id);

    if (customer_id) {
      limitsQuery = limitsQuery.eq("customer_id", customer_id);
    }

    const { data: creditLimits, error: limitsError } = await limitsQuery;

    if (limitsError) throw limitsError;

    // Fetch customer data
    let customersQuery = supabase
      .from("customers")
      .select("id, first_name, last_name, total_credit_used")
      .eq("business_id", business_id);

    if (customer_id) {
      customersQuery = customersQuery.eq("id", customer_id);
    }

    const { data: customers, error: customersError } = await customersQuery;

    if (customersError) throw customersError;

    // Calculate aging buckets
    const now = new Date();
    const agingBuckets = {
      "1-7": 0,
      "8-14": 0,
      "15-30": 0,
      "31+": 0,
    };

    const delinquentAccounts: Array<{
      customer_id: string;
      customer_name: string;
      total_delinquent: number;
      oldest_due_date: string;
      days_overdue: number;
    }> = [];

    (creditTransactions || []).forEach((transaction) => {
      if (transaction.status === "pending" && transaction.due_date) {
        const dueDate = new Date(transaction.due_date);
        const daysOverdue = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysOverdue > 0) {
          const amount = Number(transaction.amount || 0);

          if (daysOverdue <= 7) {
            agingBuckets["1-7"] += amount;
          } else if (daysOverdue <= 14) {
            agingBuckets["8-14"] += amount;
          } else if (daysOverdue <= 30) {
            agingBuckets["15-30"] += amount;
          } else {
            agingBuckets["31+"] += amount;
          }

          // Track delinquent accounts
          const existing = delinquentAccounts.find(
            (d) => d.customer_id === transaction.customer_id
          );
          if (existing) {
            existing.total_delinquent += amount;
            if (dueDate < new Date(existing.oldest_due_date)) {
              existing.oldest_due_date = transaction.due_date;
              existing.days_overdue = daysOverdue;
            }
          } else {
            const customer = customers?.find(
              (c) => c.id === transaction.customer_id
            );
            delinquentAccounts.push({
              customer_id: transaction.customer_id,
              customer_name: customer
                ? `${customer.first_name} ${customer.last_name}`
                : "Unknown",
              total_delinquent: amount,
              oldest_due_date: transaction.due_date,
              days_overdue: daysOverdue,
            });
          }
        }
      }
    });

    // Calculate reliability scores
    const reliabilityScores = (customers || []).map((customer) => {
      const customerTransactions = (creditTransactions || []).filter(
        (t) => t.customer_id === customer.id
      );
      const totalExtensions = customerTransactions.length;
      const paidOnTime = customerTransactions.filter(
        (t) =>
          t.status === "completed" &&
          t.paid_date &&
          t.due_date &&
          new Date(t.paid_date) <= new Date(t.due_date)
      ).length;
      const paidLate = customerTransactions.filter(
        (t) =>
          t.status === "completed" &&
          t.paid_date &&
          t.due_date &&
          new Date(t.paid_date) > new Date(t.due_date)
      ).length;
      const pending = customerTransactions.filter(
        (t) => t.status === "pending"
      ).length;

      const reliabilityScore =
        totalExtensions > 0 ? (paidOnTime / totalExtensions) * 100 : 100;
      const riskLevel =
        reliabilityScore >= 80
          ? "low"
          : reliabilityScore >= 60
          ? "medium"
          : reliabilityScore >= 40
          ? "high"
          : "critical";

      return {
        customer_id: customer.id,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        reliability_score: Math.round(reliabilityScore),
        risk_level: riskLevel,
        total_extensions: totalExtensions,
        paid_on_time: paidOnTime,
        paid_late: paidLate,
        pending: pending,
      };
    });

    // Generate AI insights if OpenAI is configured
    let aiInsight = null;
    if (OPENAI_API_KEY) {
      try {
        const prompt = `Analyze this credit risk data:

Total delinquent accounts: ${delinquentAccounts.length}
Aging buckets:
- 1-7 days overdue: $${agingBuckets["1-7"].toFixed(2)}
- 8-14 days overdue: $${agingBuckets["8-14"].toFixed(2)}
- 15-30 days overdue: $${agingBuckets["15-30"].toFixed(2)}
- 31+ days overdue: $${agingBuckets["31+"].toFixed(2)}

Top delinquent accounts:
${delinquentAccounts
  .sort((a, b) => b.total_delinquent - a.total_delinquent)
  .slice(0, 5)
  .map(
    (a) =>
      `- ${a.customer_name}: $${a.total_delinquent.toFixed(2)} (${
        a.days_overdue
      } days overdue)`
  )
  .join("\n")}

Provide a JSON response with:
- insight_title: Brief title
- insight_content: Analysis of credit risk and recommendations
- priority: "low", "medium", "high", or "critical"
- action_recommended: Specific actions to mitigate risk

Focus on accounts that need immediate attention and collection strategies.`;

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
                    "You are a credit risk analyst. Respond with valid JSON only.",
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
              insight_type: "credit",
              insight_title: aiInsight.insight_title || "Credit Risk Analysis",
              insight_content: aiInsight.insight_content || content,
              priority: aiInsight.priority || "medium",
              action_recommended: aiInsight.action_recommended || "",
              status: "pending",
            });
          }
        }
      } catch (aiError) {
        log("error", "Credit risk AI insight generation failed", {
          requestId,
          error: toErrorContext(aiError),
        });
      }
    }

    return jsonResponse({
      success: true,
      metrics: {
        total_delinquent_accounts: delinquentAccounts.length,
        total_delinquent_amount:
          agingBuckets["1-7"] +
          agingBuckets["8-14"] +
          agingBuckets["15-30"] +
          agingBuckets["31+"],
        aging_buckets: agingBuckets,
      },
      delinquent_accounts: delinquentAccounts
        .sort((a, b) => b.total_delinquent - a.total_delinquent)
        .slice(0, 10),
      reliability_scores: reliabilityScores.sort(
        (a, b) => a.reliability_score - b.reliability_score
      ),
      ai_insight: aiInsight,
    });
  } catch (error) {
    log("error", "Credit risk function failed", {
      requestId,
      error: toErrorContext(error),
    });

    // Log failure
    try {
      const supabase = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string);
      await supabase.from("ai_insights_failures").insert({
        business_id: body?.business_id ?? null,
        function_name: "credit_risk",
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
