import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Changelog | Deelrx CRM",
  description: "Embedded changelog view for customer-facing DRX release notes.",
};

export default function ChangelogPage() {
  redirect("/updates/changelog");
}
