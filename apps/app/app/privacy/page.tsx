import { permanentRedirect } from "next/navigation";

export default function PrivacyRedirectPage() {
  permanentRedirect("https://www.deelrxcrm.com/legal/privacy");
}
