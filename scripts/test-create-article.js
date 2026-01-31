const fetch = require("node-fetch");
const path = require("path");
const { Agent } = require("https");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const API_KEY = process.env.FEATUREBASE_API_KEY;
const API_BASE = "https://do.featurebase.app/v2";
const agent = new Agent({ keepAlive: true });
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

async function performRequest(method, endpoint, body) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const opts = { method, headers, agent };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    console.log(`[${method}] ${endpoint} -> ${res.status}`);
    console.log("Response:", text.substring(0, 300));
    return res.ok ? JSON.parse(text) : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function main() {
  console.log("Getting collections...");
  const collections = await performRequest("GET", "/help_center/collections");
  let collectionId;

  if (
    collections &&
    (collections.data || collections.results || []).length > 0
  ) {
    const list = collections.data || collections.results;
    collectionId = list[0].id;
    console.log("Using collection ID:", collectionId);
  } else {
    console.log("No collections found. Creating one...");
    const col = await performRequest("POST", "/help_center/collections", {
      name: "Test Col",
    });
    collectionId = col.id;
  }

  if (!collectionId) return;

  const basePayload = {
    title: "Test Article with parentId",
    body: "<p>Test content nested</p>",
  };

  console.log("Trying parentId...");
  await performRequest("POST", "/help_center/articles", {
    ...basePayload,
    parentId: collectionId,
  });
}

main();
