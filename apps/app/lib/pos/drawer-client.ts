export async function recordDrawerEvent(businessId: string, eventType = "no_sale", note = "", requestId = crypto.randomUUID()) {
  const response = await fetch("/api/pos/drawer", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", "X-Business-Id": businessId }, body: JSON.stringify({ requestId, eventType, note }) });
  const result = await response.json();
  if (!response.ok || result.success !== true || typeof result.event_id !== "string") throw new Error("Drawer event could not be confirmed. Retry the same request.");
  return result as { success: true; event_id: string };
}
