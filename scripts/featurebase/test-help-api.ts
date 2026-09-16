import test from "node:test";
import { contentFingerprint } from "./_help-content.mjs";
import assert from "node:assert/strict";
import { listAll, checkManagedSet, checkPublicBaseline } from "./_help-api";

const manifest = {
  helpCenterId: "drx",
  articles: [{ id: "1", parentId: "c", apiSlug: "one" }],
};
const snapshot = () => ({
  method: "authenticated-api",
  helpCenterId: "drx",
  articles: [
    {
      id: "1",
      state: "live",
      parentId: "c",
      slug: "one",
      isDraftDiffersFromLive: false,
    },
  ],
});
test("pagination reads every page and encodes opaque cursors", async () => {
  const endpoints: string[] = [];
  const request: any = async (_: string, endpoint: string) => {
    endpoints.push(endpoint);
    return endpoints.length === 1
      ? { data: [{ id: "1" }], nextCursor: "a+/=" }
      : { data: [{ id: "2" }], nextCursor: null };
  };
  assert.equal(
    (await listAll("/help_center/articles?state=all", request)).length,
    2,
  );
  assert.match(endpoints[1], /cursor=a%2B%2F%3D/);
});
test("pagination fails on malformed, repeated or duplicate pages", async () => {
  await assert.rejects(
    listAll("/x", (async () => ({ data: [] })) as any),
    /Incomplete/,
  );
  await assert.rejects(
    listAll("/x", (async () => ({ data: [], nextCursor: "same" })) as any),
    /Repeated/,
  );
  await assert.rejects(
    listAll("/x", (async () => ({
      data: [{ id: "1" }, { id: "1" }],
      nextCursor: null,
    })) as any),
    /Duplicate/,
  );
});
test("public snapshots and wrong organizations cannot authorize publication", () => {
  assert.throws(
    () => checkManagedSet({ ...snapshot(), method: "public-html" }, manifest),
    /Authenticated/,
  );
  assert.throws(
    () => checkManagedSet({ ...snapshot(), helpCenterId: "other" }, manifest),
    /Authenticated/,
  );
  assert.doesNotThrow(() => checkManagedSet(snapshot(), manifest));
});
test("unknown published and unpublished articles stop the whole import", () => {
  for (const state of ["live", "draft"]) {
    const s: any = snapshot();
    s.articles.push({ id: "2", state });
    assert.throws(() => checkManagedSet(s, manifest), /Unreviewed/);
  }
});
test("missing IDs, moves, slug changes and unpublished edits cannot be overwritten", () => {
  for (const change of [
    { id: "2" },
    { parentId: "other" },
    { slug: "changed" },
    { state: "draft" },
    { isDraftDiffersFromLive: true },
  ]) {
    const s: any = snapshot();
    Object.assign(s.articles[0], change);
    assert.throws(() => checkManagedSet(s, manifest));
  }
});

test("public edits after the audit cannot be overwritten by a new dry run", () => {
  const current = {
    id: "1",
    parentId: "c",
    slug: "1-old",
    publicOrder: 1,
    title: "Old",
    description: "Old guide",
    body: "<p>Original</p>",
  };
  const intended = {
    ...current,
    publicSlug: current.slug,
    title: "New",
    body: "<p>Reviewed replacement</p>",
    baselinePublicFingerprint: contentFingerprint(current),
  };
  const content = { articles: [intended] };
  assert.doesNotThrow(() =>
    checkPublicBaseline(
      { method: "public-html", articles: [current] },
      content,
    ),
  );
  assert.throws(
    () =>
      checkPublicBaseline(
        {
          method: "public-html",
          articles: [{ ...current, description: "Someone else's edit" }],
        },
        content,
      ),
    /changed since audit/,
  );
});
