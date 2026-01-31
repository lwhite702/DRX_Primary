const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { Agent } = require("https");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const API_KEY = process.env.FEATUREBASE_API_KEY;
const API_BASE = "https://do.featurebase.app/v2";
const agent = new Agent({ keepAlive: true });
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

const CATEGORY_MAP = {
  "getting-started": "Getting Started",
  pos: "POS & Sales",
  inventory: "Inventory",
  products: "Products",
  customers: "Customers",
  privacy: "Privacy & Security",
};

const articlesData = require("./help-center-data");

async function performRequest(method, endpoint, body) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const opts = { method, headers, agent };
    if (body) opts.body = JSON.stringify(body);
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

    const json = await res.json();
    return json;
  } catch (err) {
    throw err;
  }
}

async function getCollections() {
  const res = await performRequest("GET", "/help_center/collections");
  return res.data || res.results || res || [];
}

async function createCollection(name) {
  console.log(`Creating collection: ${name}`);
  const payload = {
    name: name,
    description: `Articles about ${name}`,
  };
  return await performRequest("POST", "/help_center/collections", payload);
}

async function getArticles() {
  const res = await performRequest("GET", "/help_center/articles?limit=100");
  return res.data || res.results || res || [];
}

async function upsertArticle(article, collectionId, existingId) {
  const payload = {
    title: article.title,
    body: article.content,
    description: article.summary,
    parentId: collectionId,
    state: "live", // Corrected from 'published'
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
  } catch (err) {
    console.error(`Failed to upsert "${article.title}"`, err.message);
  }
}

async function main() {
  console.log("Starting Help Center migration...");

  // 1. Manage Collections
  let existingCollections = await getCollections();
  console.log(`Found ${existingCollections.length} existing collections.`);

  const collectionIds = {};

  const distinctCategories = [
    ...new Set(
      articlesData.flatMap((a) =>
        a.tags
          .filter((t) => t.startsWith("category:"))
          .map((t) => t.split(":")[1]),
      ),
    ),
  ];

  for (const catKey of distinctCategories) {
    const displayName =
      CATEGORY_MAP[catKey] || catKey.charAt(0).toUpperCase() + catKey.slice(1);

    let collection = existingCollections.find((c) => c.name === displayName);
    if (!collection) {
      collection = await createCollection(displayName);
      if (!collection.id && collection.data) collection = collection.data;
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

  for (const article of articlesData) {
    try {
      const catTag = article.tags.find((t) => t.startsWith("category:"));
      const catKey = catTag ? catTag.split(":")[1] : null;

      if (!catKey || !collectionIds[catKey]) {
        console.warn(
          `Skipping "${article.title}" - No matching collection ID for category ${catKey}`,
        );
        continue;
      }

      const existing = existingArticles.find((a) => a.title === article.title);
      await upsertArticle(article, collectionIds[catKey], existing?.id);
      successCount++;
    } catch (err) {
      console.error(err);
    }
  }

  console.log(
    `Migration complete. Successfully processed ${successCount}/${articlesData.length} articles.`,
  );
}

main().catch(console.error);
