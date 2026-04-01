export type DemoRowStatus = "ok" | "warn" | "critical" | "done";

export type DemoRow = {
  label: string;
  value: string;
  status?: DemoRowStatus;
};

export type DemoCardData = {
  title: string;
  subtitle?: string;
  rows: DemoRow[];
};
