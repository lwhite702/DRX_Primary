import path from "path";
import { Agent } from "https";
import dotenv from "dotenv";
import { helpCenterData } from "./help-center-data";
import {
  FEATUREBASE_CATEGORY_MAP,
  FEATUREBASE_CATEGORY_ORDER,
  assertMappedCategories,
  extractCategoryFromTags,
  listDistinctCategories,
  sortHelpArticlesDeterministically,
} from "../lib/help/featurebase-taxonomy";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const API_KEY = process.env.FEATUREBASE_API_KEY;
const API_BASE = "https://do.featurebase.app/v2";
const agent = new Agent({ keepAlive: true });
const headers: Record<string, string> = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

interface CollectionMap {
  [key: string]: string;
}

type FeaturebaseCollection = {
  id: string;
  name: string;
};

type FeaturebaseArticle = {
  id: string;
  title: string;
};

type HelpCenterArticle = (typeof helpCenterData)[number];

type FeaturebaseEnvelope = {
  data?: unknown;
  results?: unknown;
};

function normalizeResponseArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (response && typeof response === "object") {
    const envelope = response as FeaturebaseEnvelope;
    if (Array.isArray(envelope.data)) {
      return envelope.data as T[];
    }
    if (Array.isArray(envelope.results)) {
      return envelope.results as T[];
    }
  }

  return [];
}

async function performRequest(method: string, endpoint: string, body?: unknown) {
  const url = `${API_BASE}${endpoint}`;
  const opts: RequestInit & { agent?: Agent } = {
    method,
    headers,
    agent,
  };
  if (body) opts.body = JSON.stringify(body);

  // Using global fetch (Node 18+)
  const res = await fetch(url, opts);

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `Request to ${endpoint} failed: ${res.status} ${res.statusText}`,
    );
    console.error("Response:", text);
    throw new Error(`API Error: ${text}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return null;

  return await res.json();
}

async function getCollections() {
  const response = await performRequest("GET", "/help_center/collections");
  return normalizeResponseArray<FeaturebaseCollection>(response);
}

async function createCollection(name: string) {
  console.log(`Creating collection: ${name}`);
  const payload = {
    name: name,
    description: `Articles about ${name}`,
  };
  return await performRequest("POST", "/help_center/collections", payload);
}

async function getArticles() {
  const response = await performRequest(
    "GET",
    "/help_center/articles?limit=100",
  );
  return normalizeResponseArray<FeaturebaseArticle>(response);
}

async function upsertArticle(
  article: HelpCenterArticle,
  collectionId: string,
  existingId?: string,
) {
  const payload = {
    title: article.title,
    body: article.content,
    description: article.summary,
    parentId: collectionId,
    state: "live",
    // locale removed
  };

  try {
    if (existingId) {
      console.log(`Updating article: ${article.title}`);
      return await performRequest(
        "PATCH",
        `/help_center/articles/${existingId}`,
        payload,
      );
    } else {
      console.log(`Creating article: ${article.title}`);
      return await performRequest("POST", "/help_center/articles", payload);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to upsert "${article.title}"`, message);
  }
}

async function main() {
  console.log("Starting Help Center migration...");

  assertMappedCategories(helpCenterData, FEATUREBASE_CATEGORY_MAP);

  const sortedArticles = sortHelpArticlesDeterministically(
    helpCenterData,
    FEATUREBASE_CATEGORY_ORDER,
  );

  // 1. Manage Collections
  const existingCollections = await getCollections();
  console.log(`Found ${existingCollections.length} existing collections.`);

  const collectionIds: CollectionMap = {};

  const distinctCategories = listDistinctCategories(sortedArticles);

  for (const catKey of distinctCategories) {
    const displayName = FEATUREBASE_CATEGORY_MAP[catKey];
    if (!displayName) {
      throw new Error(`Unmapped category encountered during collection sync: ${catKey}`);
    }

    let collection = existingCollections.find(
      (c) => c.name === displayName,
    );
    if (!collection) {
      const created = await createCollection(displayName);
      // Handle various response shapes
      collection = created.id ? created : created.data;
    }

    if (collection && collection.id) {
      collectionIds[catKey] = collection.id;
      console.log(
        `Mapped category '${catKey}' to collection ID: ${collection.id}`,
      );
    } else {
      console.error(`Failed to resolve collection for ${catKey}`);
    }
  }

  // 2. Manage Articles
  const existingArticles = await getArticles();
  console.log(
    `Found ${existingArticles.length} existing articles on Featurebase.`,
  );

  let successCount = 0;

  for (const article of sortedArticles) {
    try {
      const catKey = extractCategoryFromTags(article.tags);

      if (!catKey || !collectionIds[catKey]) {
        console.warn(
          `Skipping "${article.title}" - No matching collection ID for category ${catKey}`,
        );
        continue;
      }

      const existing = existingArticles.find(
        (a) => a.title === article.title,
      );
      await upsertArticle(article, collectionIds[catKey], existing?.id);
      successCount++;
    } catch (err) {
      console.error(err);
    }
  }

  console.log(
    `Migration complete. Successfully processed ${successCount}/${sortedArticles.length} articles.`,
  );
}

main().catch(console.error);
