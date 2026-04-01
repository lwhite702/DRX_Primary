import path from "path";
import { Agent } from "https";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const API_KEY = process.env.FEATUREBASE_API_KEY;
const API_BASE = "https://do.featurebase.app/v2";
const agent = new Agent({ keepAlive: true });
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

async function performRequest(method: string, endpoint: string, body?: any) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const opts: RequestInit & { agent?: Agent } = {
      method,
      headers,
      agent,
    };
    if (body) opts.body = JSON.stringify(body);

    // Use global fetch
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
  const collections: any = await performRequest(
    "GET",
    "/help_center/collections",
  );
  let collectionId: string | undefined;

  const list = collections?.data || collections?.results || [];

  if (list.length > 0) {
    collectionId = list[0].id;
    console.log("Using collection ID:", collectionId);
  } else {
    console.log("No collections found. Creating one...");
    const col: any = await performRequest("POST", "/help_center/collections", {
      name: "Test Col",
    });
    collectionId = col?.id;
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
