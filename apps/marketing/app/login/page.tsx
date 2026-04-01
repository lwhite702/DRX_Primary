import { redirect } from "next/navigation";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app";

export default function MarketingLoginRedirectPage() {
  redirect(`${appUrl}/login`);
}
