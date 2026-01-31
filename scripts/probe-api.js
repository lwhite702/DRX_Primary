const fetch = require("node-fetch");
const dotenv = require("dotenv");
const path = require("path");
const { Agent } = require("https");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const API_KEY = process.env.FEATUREBASE_API_KEY;
const API_BASE = "https://do.featurebase.app/v2";

const agent = new Agent({ keepAlive: true });
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

async function probe(url) {
  try {
    console.log(`Checking ${url}...`);
    const res = await fetch(url, { headers, agent });
    console.log(`Status: ${res.status} ${res.statusText}`);
    if (res.ok) {
      const json = await res.json();
      const str = JSON.stringify(json, null, 2);
      console.log(
        "Sample:",
        str.substring(0, 300) + (str.length > 300 ? "..." : ""),
      );
    }
  } catch (e) {
    console.error(e.message);
  }
}

async function main() {
  console.log("Starting probe (Round 2)...");
  // Try underscore as per search results
  await probe(`${API_BASE}/help_center/collections`);
  await probe(`${API_BASE}/help_center/articles`);
  // Try without help_center prefix just in case but with underscore in collection names? Unlikely.
}

main();
