import { fbRequest, type FbList } from "./_client";
import { sha256, contentFingerprint } from "./_help-content.mjs";

export async function listAll<T extends { id: string }>(
  endpoint: string,
  request: typeof fbRequest = fbRequest,
): Promise<T[]> {
  const rows: T[] = [],
    cursors = new Set<string>(),
    ids = new Set<string>();
  let cursor: string | null = null;
  do {
    const response = await request<FbList<T>>(
      "GET",
      `${endpoint}${endpoint.includes("?") ? "&" : "?"}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    if (
      !response ||
      !Array.isArray(response.data) ||
      !("nextCursor" in response)
    )
      throw new Error("Incomplete Featurebase list response");
    for (const row of response.data) {
      if (!row.id || ids.has(row.id))
        throw new Error("Duplicate API identity across pages");
      ids.add(row.id);
      rows.push(row);
    }
    cursor = response.nextCursor;
    if (cursor) {
      if (typeof cursor !== "string")
        throw new Error("Invalid Featurebase cursor");
      if (cursors.has(cursor)) throw new Error("Repeated Featurebase cursor");
      cursors.add(cursor);
    }
  } while (cursor);
  return rows;
}
export async function exportHelpApi(manifest: any) {
  const center: any = await fbRequest(
    "GET",
    `/help_center/help_centers/${manifest.helpCenterId}`,
  );
  if (center.id !== manifest.helpCenterId)
    throw new Error("Help Center identity mismatch");
  const collections = await listAll<any>(
    `/help_center/collections?helpCenterId=${manifest.helpCenterId}`,
  );
  const summaries = await listAll<any>(
    `/help_center/articles?helpCenterId=${manifest.helpCenterId}&state=all`,
  );
  const articles = [];
  for (const summary of summaries) {
    const state =
      summary.isPublished === false || summary.state === "draft"
        ? "draft"
        : "live";
    const article: any = await fbRequest(
      "GET",
      `/help_center/articles/${summary.id}?state=${state}`,
    );
    if (article.helpCenterId !== manifest.helpCenterId)
      throw new Error("Article belongs to another Help Center");
    if (article.isDraftDiffersFromLive)
      article.unpublishedVersion = await fbRequest(
        "GET",
        `/help_center/articles/${summary.id}?state=draft`,
      );
    if (article.id !== summary.id || typeof article.body !== "string")
      throw new Error("Incomplete article detail");
    articles.push(article);
  }
  return {
    schemaVersion: 1,
    method: "authenticated-api",
    observedAt: new Date().toISOString(),
    helpCenterId: center.id,
    collections,
    articles,
  };
}
export function apiFingerprint(snapshot: any) {
  return sha256(
    JSON.stringify([
      snapshot.helpCenterId,
      snapshot.collections,
      snapshot.articles,
    ]),
  );
}
export function checkManagedSet(snapshot: any, manifest: any) {
  if (
    snapshot.method !== "authenticated-api" ||
    snapshot.helpCenterId !== manifest.helpCenterId
  )
    throw new Error("Authenticated export required");
  const mapped = new Set(manifest.articles.map((a: any) => a.id));
  const extraLive = snapshot.articles.filter(
    (a: any) => a.state === "live" && !mapped.has(a.id),
  );
  if (extraLive.length)
    throw new Error(
      `Unreviewed live article IDs: ${extraLive.map((a: any) => a.id).join(", ")}`,
    );
  for (const entry of manifest.articles) {
    const article = snapshot.articles.find((a: any) => a.id === entry.id);
    if (
      !article ||
      article.state !== "live" ||
      article.parentId !== entry.parentId
    )
      throw new Error(`Missing, unpublished or moved article: ${entry.id}`);
    if (entry.apiSlug !== undefined && article.slug !== entry.apiSlug)
      throw new Error(`Slug drift: ${entry.id}`);
    if (article.isDraftDiffersFromLive || article.unpublishedVersion)
      throw new Error(`Unreviewed draft changes: ${entry.id}`);
  }
  // Do not silently ignore unpublished content: every ID needs a reviewed disposition.
  const dispositions = new Set(
    (manifest.unpublishedArticles ?? []).map((a: any) => a.id),
  );
  const unknownDrafts = snapshot.articles.filter(
    (a: any) => a.state !== "live" && !dispositions.has(a.id),
  );
  if (unknownDrafts.length)
    throw new Error(
      `Unreviewed unpublished article IDs: ${unknownDrafts.map((a: any) => a.id).join(", ")}`,
    );
}

export function checkPublicBaseline(snapshot: any, content: any) {
  if (snapshot.method !== "public-html")
    throw new Error("Public baseline check needs a public export");
  if (snapshot.articles.length !== content.articles.length)
    throw new Error("Public article inventory changed since audit");
  for (const article of content.articles) {
    const current = snapshot.articles.find((a: any) => a.id === article.id);
    if (
      !current ||
      current.parentId !== article.parentId ||
      current.slug !== article.publicSlug ||
      current.publicOrder !== article.publicOrder
    )
      throw new Error(`Public identity or order drift: ${article.id}`);
    const fingerprint = contentFingerprint(current);
    if (
      fingerprint !== article.baselinePublicFingerprint &&
      fingerprint !== contentFingerprint(article)
    )
      throw new Error(`Public content changed since audit: ${article.id}`);
  }
}
