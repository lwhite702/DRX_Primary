import { redirect } from "next/navigation";
import { toSearchParamSuffix } from "@/lib/utils/search-params";

type SignInAliasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInAliasPage({ searchParams }: SignInAliasPageProps) {
  const params = (await searchParams) ?? {};
  redirect(`/login${toSearchParamSuffix(params)}`);
}
