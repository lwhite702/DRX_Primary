import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AIInsightRequest {
  business_id: string;
  insight_type: "pricing" | "inventory" | "credit" | "cashflow" | "general";
}

serve(async (req) => {
  try {
    const { business_id, insight_type }: AIInsightRequest = await req.json();

    if (!business_id || !insight_type) {
      return new Response(
        JSON.stringify({ error: "business_id and insight_type are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch relevant business data based on insight type
    let context = "";
    let data: any = {};

    switch (insight_type) {
      case "pricing": {
        const { data: inventory } = await supabase
          .from("inventory")
          .select("product_name, selling_price, unit_cost, quantity_on_hand")
          .eq("business_id", business_id)
          .order("selling_price", { ascending: false })
          .limit(20);

        const { data: sales } = await supabase
          .from("sales")
          .select("total_amount, created_at")
          .eq("business_id", business_id)
          .gte(
            "created_at",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          );

        data = { inventory, sales };
        context = `Inventory items: ${JSON.stringify(
          inventory || []
        )}. Recent sales: ${JSON.stringify(sales || [])}`;
        break;
      }

      case "inventory": {
        const { data: inventoryData } = await supabase
          .from("inventory")
          .select(
            "product_name, quantity_on_hand, reorder_level, unit_cost, selling_price"
          )
          .eq("business_id", business_id);

        const { data: inventoryLogs } = await supabase
          .from("inventory_log")
          .select("transaction_type, quantity_change, created_at")
          .eq("business_id", business_id)
          .gte(
            "created_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          )
          .order("created_at", { ascending: false })
          .limit(50);

        data = { inventory: inventoryData, logs: inventoryLogs };
        context = `Current inventory: ${JSON.stringify(
          inventoryData || []
        )}. Recent changes: ${JSON.stringify(inventoryLogs || [])}`;
        break;
      }

      case "credit": {
        const { data: creditTransactions } = await supabase
          .from("credit_transactions")
          .select("transaction_type, amount, due_date, status, created_at")
          .eq("business_id", business_id)
          .eq("status", "pending")
          .order("due_date", { ascending: true });

        const { data: creditLimits } = await supabase
          .from("credit_limits")
          .select("max_credit_limit, current_balance")
          .eq("business_id", business_id);

        data = { transactions: creditTransactions, limits: creditLimits };
        context = `Pending credit transactions: ${JSON.stringify(
          creditTransactions || []
        )}. Credit limits: ${JSON.stringify(creditLimits || [])}`;
        break;
      }

      case "cashflow": {
        const { data: recentSales } = await supabase
          .from("sales")
          .select("total_amount, payment_method, created_at")
          .eq("business_id", business_id)
          .gte(
            "created_at",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          )
          .order("created_at", { ascending: false });

        const { data: creditPayments } = await supabase
          .from("credit_transactions")
          .select("amount, paid_date, transaction_type")
          .eq("business_id", business_id)
          .eq("transaction_type", "payment")
          .gte(
            "paid_date",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          );

        data = { sales: recentSales, payments: creditPayments };
        context = `Recent sales: ${JSON.stringify(
          recentSales || []
        )}. Credit payments: ${JSON.stringify(creditPayments || [])}`;
        break;
      }

      default:
        context = "General business insights requested";
    }

    // Call OpenAI API
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const prompt = `You are a business intelligence assistant for a small business POS/CRM system. 
Analyze the following data and provide actionable insights.

Business Context:
${context}

Provide a JSON response with:
- insight_title: A clear, concise title (max 100 chars)
- insight_content: Detailed analysis (2-3 paragraphs)
- priority: One of "low", "medium", "high", "critical"
- action_recommended: Specific actionable steps (1-3 items)

Focus on practical, actionable insights that can help improve business operations.`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-5.1",
          messages: [
            {
              role: "system",
              content:
                "You are a business intelligence assistant. Always respond with valid JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content from OpenAI");
    }

    // Parse JSON from response
    let insightData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/```\s*([\s\S]*?)\s*```/);
      insightData = JSON.parse(jsonMatch ? jsonMatch[1] : content);
    } catch {
      // Fallback: try to parse entire content
      insightData = JSON.parse(content);
    }

    // Store insight in database
    const { data: insight, error: insertError } = await supabase
      .from("ai_insights")
      .insert({
        business_id,
        insight_type,
        insight_title: insightData.insight_title || "Business Insight",
        insight_content: insightData.insight_content || content,
        priority: insightData.priority || "medium",
        action_recommended: insightData.action_recommended || "",
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to store insight: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        insight,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Insights Error:", error);

    // Log failure
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from("ai_insights_failures").insert({
        business_id: (await req.json()).business_id,
        function_name: "ai_insights",
        error_message: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : undefined,
        input_data: await req.json(),
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
