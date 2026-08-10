import type { DemoCardData } from "./demo-types";

export const heroQueueRows: DemoCardData = {
  title: "LIVE QUEUE",
  subtitle: "Sales floor",
  rows: [
    { label: "Ticket #", value: "#1842" },
    { label: "Customer", value: "R. Mason" },
    { label: "Status", value: "PROCESSING", status: "warn" },
    { label: "Total", value: "$146.00", status: "ok" },
  ],
};

export const heroQueueRowsDone: DemoCardData = {
  title: "LIVE QUEUE",
  subtitle: "Sales floor",
  rows: [
    { label: "Ticket #", value: "#1842" },
    { label: "Customer", value: "R. Mason" },
    { label: "Status", value: "DONE", status: "done" },
    { label: "Total", value: "$146.00", status: "ok" },
  ],
};

export const heroCustomerRows: DemoCardData = {
  title: "CUSTOMER SNAPSHOT",
  subtitle: "Store account",
  rows: [
    { label: "Name", value: "M. Ortega" },
    { label: "Account Cap", value: "$500" },
    { label: "Balance", value: "$260", status: "warn" },
    { label: "Last Visit", value: "Today 1:42 PM", status: "ok" },
  ],
};

export const stockRows = [
  { sku: "HOOD-BLK-M", onHand: 12, reorder: 10, status: "ok" as const },
  { sku: "TEE-HVY-L", onHand: 6, reorder: 8, status: "warn" as const },
  { sku: "CAP-GRN", onHand: 18, reorder: 8, status: "ok" as const },
  { sku: "BAG-UTIL", onHand: 4, reorder: 7, status: "critical" as const },
];

export const revenueRows = [
  { label: "Today Sales", value: "$12,840" },
  { label: "Transactions", value: "147" },
  { label: "Avg Ticket", value: "$87.35" },
];

export const storeAccountRows = [
  { customer: "K. Lane", due: "$240", age: "4 days", status: "OVERDUE" },
  { customer: "A. Green", due: "$90", age: "1 day", status: "OPEN" },
  { customer: "D. Cruz", due: "$0", age: "-", status: "PAID" },
];
