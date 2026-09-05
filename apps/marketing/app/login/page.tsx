import type { Metadata } from "next";
import { redirect } from "next/navigation";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app";

export const metadata: Metadata = {
  title: "Login Redirect | DRX",
  description: "Redirecting to the DRX secure app login.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "/login",
  },
};

export default function MarketingLoginRedirectPage() {
  redirect(`${appUrl}/login`);
}
