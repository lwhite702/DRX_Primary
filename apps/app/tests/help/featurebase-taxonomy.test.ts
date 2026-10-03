import { describe, expect, it } from "vitest";

import {
  FEATUREBASE_CATEGORY_MAP,
  FEATUREBASE_CATEGORY_ORDER,
  assertMappedCategories,
  extractCategoryFromTags,
  extractOrderFromTags,
  findUnmappedCategories,
  sortHelpArticlesDeterministically,
} from "@/lib/help/featurebase-taxonomy";

describe("Featurebase taxonomy alignment", () => {
  const articles = [
    { title: "Start", tags: ["category:getting-started", "order:1"] },
    { title: "Stock", tags: ["category:inventory", "order:2"] },
    { title: "Count", tags: ["category:inventory", "order:1"] },
  ];
  it("maps every help-center category explicitly", () => {
    const unmapped = findUnmappedCategories(articles, FEATUREBASE_CATEGORY_MAP);
    expect(unmapped).toEqual([]);
    expect(() =>
      assertMappedCategories(articles, FEATUREBASE_CATEGORY_MAP),
    ).not.toThrow();
  });

  it("throws when mappings are incomplete", () => {
    expect(() =>
      assertMappedCategories(articles, {
        "getting-started": "Getting Started",
      }),
    ).toThrow(/Missing Featurebase category mappings/);
  });

  it("sorts deterministically by category then order tag", () => {
    const sortedA = sortHelpArticlesDeterministically(
      articles,
      FEATUREBASE_CATEGORY_ORDER,
    );
    const sortedB = sortHelpArticlesDeterministically(
      articles,
      FEATUREBASE_CATEGORY_ORDER,
    );

    expect(sortedA.map((article) => article.title)).toEqual(
      sortedB.map((article) => article.title),
    );

    const rank = new Map<string, number>(
      FEATUREBASE_CATEGORY_ORDER.map((category, index) => [
        category,
        index,
      ] as [string, number]),
    );

    let previousCategoryRank = -1;
    let previousOrder = -1;

    for (const article of sortedA) {
      const category = extractCategoryFromTags(article.tags);
      const categoryRank = category ? rank.get(category) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      const order = extractOrderFromTags(article.tags);

      if (categoryRank === previousCategoryRank) {
        expect(order).toBeGreaterThanOrEqual(previousOrder);
      } else {
        expect(categoryRank).toBeGreaterThanOrEqual(previousCategoryRank);
        previousOrder = -1;
      }

      previousCategoryRank = categoryRank;
      previousOrder = order;
    }
  });
});
