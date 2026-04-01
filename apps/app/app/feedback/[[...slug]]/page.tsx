import { redirect } from "next/navigation";

type FeedbackRedirectPageProps = {
  params?:
    | Promise<{ slug?: string[] }>
    | {
        slug?: string[];
      };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function appendQueryValue(
  query: URLSearchParams,
  key: string,
  value: string | string[] | undefined,
) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => query.append(key, entry));
    return;
  }

  query.append(key, value);
}

export default async function FeedbackRedirectPage({
  params,
  searchParams,
}: FeedbackRedirectPageProps) {
  const resolvedParams = (await Promise.resolve(params)) ?? {};
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};

  const query = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    appendQueryValue(query, key, value);
  });

  const legacyPath = resolvedParams.slug?.length
    ? `/${resolvedParams.slug.join("/")}`
    : undefined;

  if (legacyPath) {
    query.set("path", legacyPath);
  }

  const queryString = query.toString();
  redirect(queryString ? `/help/library?${queryString}` : "/help/library");
}
