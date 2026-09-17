export type MarketingEventName =
  | "view_page"
  | "click_primary_cta"
  | "click_secondary_cta"
  | "submit_waitlist"
  | "submit_sms_consent"
  | "open_legal_page"
  | "click_product_detail"
  | "click_guide";

export function trackMarketingEvent(
  event: MarketingEventName,
  payload: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("drx_marketing_event", {
      detail: { event, payload, ts: new Date().toISOString() },
    })
  );
}
