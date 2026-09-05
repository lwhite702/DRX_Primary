/**
 * Utility functions for integer monetary calculations (cents and basis points).
 */

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function calculateTaxCents(subtotalCents: number, taxRateBps: number): number {
  if (subtotalCents <= 0 || taxRateBps <= 0) return 0;
  return Math.round((subtotalCents * taxRateBps) / 10000);
}

export function formatCentsToCurrency(cents: number, currency: string = "USD"): string {
  const dollars = centsToDollars(cents);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(dollars);
}
