import { redirect } from "next/navigation";

export default function TermsRedirectPage() {
  redirect("/legal/terms");
}
