import { redirect } from "next/navigation";

import { appWaitlistUrl } from "@/lib/app-links";

export default function MarketingWaitlistRedirectPage() {
  redirect(appWaitlistUrl);
}
