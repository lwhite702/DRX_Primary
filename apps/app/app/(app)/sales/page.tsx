import { redirect } from "next/navigation";

/**
 * The maintained register lives at /pos/sale. Keep /sales as a stable legacy
 * entry point without loading the retired browser-side POS/Supabase bundle.
 */
export default function SalesPage() {
  redirect("/pos/sale");
}
