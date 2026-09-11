/** Display precision only. Keep ledger cents and inventory increments unchanged. */
const twoDecimals = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
const oneDecimal = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
export function formatAmount(value: number): string {
  return Number.isFinite(value) ? twoDecimals.format(value).replace(/^-0\.00$/, "0.00") : "—";
}
export const formatQuantity = formatAmount;
/** Input is percentage points, e.g. 8.25 means 8.25%, not a ratio. */
export function formatPercentage(value: number): string {
  return Number.isFinite(value) ? oneDecimal.format(value).replace(/^-0\.0$/, "0.0") : "—";
}
export const formatCount = formatPercentage;
