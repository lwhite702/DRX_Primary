import { redirect } from "next/navigation";

type SignUpAliasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpAliasPage({ searchParams }: SignUpAliasPageProps) {
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();

  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined) continue;
    if (Array.isArray(raw)) {
      for (const value of raw) query.append(key, value);
    } else {
      query.set(key, raw);
    }
  }

  const suffix = query.toString();
  redirect(suffix ? `/register?${suffix}` : "/register");
}
