import { describe, expect, it } from "vitest";

import { helpCenterData } from "@/scripts/help-center-data";
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
  it("preserves complete rendered HTML for legacy read-only consumers", () => {
    expect(helpCenterData).toHaveLength(19);
    for (const article of helpCenterData) {
      expect(article.content).toContain("<h2");
      expect(article.content).toContain("<p>");
      expect(article.content).not.toContain("\n---\n");
    }
  });
  it("maps every help-center category explicitly", () => {
    const unmapped = findUnmappedCategories(helpCenterData, FEATUREBASE_CATEGORY_MAP);
    expect(unmapped).toEqual([]);
    expect(() =>
      assertMappedCategories(helpCenterData, FEATUREBASE_CATEGORY_MAP),
    ).not.toThrow();
  });

  it("throws when mappings are incomplete", () => {
    expect(() =>
      assertMappedCategories(helpCenterData, {
        "getting-started": "Getting Started",
      }),
    ).toThrow(/Missing Featurebase category mappings/);
  });

  it("sorts deterministically by category then order tag", () => {
    const sortedA = sortHelpArticlesDeterministically(
      helpCenterData,
      FEATUREBASE_CATEGORY_ORDER,
    );
    const sortedB = sortHelpArticlesDeterministically(
      helpCenterData,
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
