import { redirect } from "next/navigation";
import { toSearchParamSuffix } from "@/lib/utils/search-params";

type SignUpAliasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpAliasPage({ searchParams }: SignUpAliasPageProps) {
  const params = (await searchParams) ?? {};
  redirect(`/register${toSearchParamSuffix(params)}`);
}
