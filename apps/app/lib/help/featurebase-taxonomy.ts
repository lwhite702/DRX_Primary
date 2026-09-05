export type HelpArticleLike = {
  title: string;
  tags: string[];
};

export type CategoryMap = Record<string, string>;

export const FEATUREBASE_CATEGORY_MAP: CategoryMap = {
  "getting-started": "Getting Started",
  pos: "New sale & Sales",
  inventory: "Stock",
  products: "Products",
  customers: "Customers",
  credit: "Payments",
  roles: "Team access",
  privacy: "Privacy & Security",
};

export const FEATUREBASE_CATEGORY_ORDER = [
  "getting-started",
  "pos",
  "inventory",
  "products",
  "customers",
  "credit",
  "roles",
  "privacy",
] as const;

export function extractCategoryFromTags(tags: string[]): string | null {
  const categoryTag = tags.find((tag) => tag.startsWith("category:"));
  return categoryTag ? categoryTag.split(":")[1] : null;
}

export function extractOrderFromTags(tags: string[]): number {
  const orderTag = tags.find((tag) => tag.startsWith("order:"));
  const parsedOrder = orderTag ? Number(orderTag.split(":")[1]) : Number.NaN;

  if (Number.isNaN(parsedOrder)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return parsedOrder;
}

export function listDistinctCategories(articles: HelpArticleLike[]): string[] {
  return [
    ...new Set(
      articles
        .map((article) => extractCategoryFromTags(article.tags))
        .filter((category): category is string => Boolean(category)),
    ),
  ];
}

export function findUnmappedCategories(
  articles: HelpArticleLike[],
  categoryMap: CategoryMap,
): string[] {
  const categories = listDistinctCategories(articles);
  return categories.filter((category) => !categoryMap[category]);
}

export function assertMappedCategories(
  articles: HelpArticleLike[],
  categoryMap: CategoryMap,
): void {
  const unmappedCategories = findUnmappedCategories(articles, categoryMap);

  if (unmappedCategories.length > 0) {
    throw new Error(
      `Missing Featurebase category mappings for: ${unmappedCategories.join(", ")}`,
    );
  }
}

export function sortHelpArticlesDeterministically<T extends HelpArticleLike>(
  articles: T[],
  categoryOrder: readonly string[],
): T[] {
  const categoryRank = new Map(
    categoryOrder.map((category, index) => [category, index]),
  );

  return [...articles].sort((a, b) => {
    const categoryA = extractCategoryFromTags(a.tags) ?? "";
    const categoryB = extractCategoryFromTags(b.tags) ?? "";

    const categoryScoreA =
      categoryRank.get(categoryA) ?? Number.MAX_SAFE_INTEGER;
    const categoryScoreB =
      categoryRank.get(categoryB) ?? Number.MAX_SAFE_INTEGER;

    if (categoryScoreA !== categoryScoreB) {
      return categoryScoreA - categoryScoreB;
    }

    const orderA = extractOrderFromTags(a.tags);
    const orderB = extractOrderFromTags(b.tags);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.title.localeCompare(b.title);
  });
}
