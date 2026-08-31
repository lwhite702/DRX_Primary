import { JSDOM } from "jsdom";

export const HELP_ORIGIN = "https://drx.featurebase.app";
export const HELP_URL = `${HELP_ORIGIN}/en/help`;

async function readPage(url) {
  if (new URL(url).origin !== HELP_ORIGIN)
    throw new Error("Unexpected help host");
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok)
    throw new Error(`Public help read failed (${response.status})`);
  if (new URL(response.url).origin !== HELP_ORIGIN)
    throw new Error("Unexpected redirect host");
  return {
    url: response.url,
    document: new JSDOM(await response.text()).window.document,
  };
}

/** Public, rendered HTML only. This cannot substitute for the authenticated API gate. */
export async function inspectPublicHelpCenter() {
  const home = await readPage(HELP_URL);
  const links = [...home.document.querySelectorAll("article a")].filter((a) =>
    a.getAttribute("href")?.startsWith("/en/help/collections/"),
  );
  if (!links.length) throw new Error("No public help collections found");
  const collections = [];
  const articles = [];
  const seen = new Set();
  for (const [collectionIndex, link] of links.entries()) {
    const url = new URL(link.getAttribute("href"), HELP_ORIGIN).href;
    const page = await readPage(url);
    const id = new URL(url).pathname.match(/collections\/(\d+)/)?.[1];
    const name = link.querySelector("h3")?.textContent?.trim();
    const articleLinks = [
      ...page.document.querySelectorAll("article a"),
    ].filter((a) => a.getAttribute("href")?.startsWith("/en/help/articles/"));
    const declaredCount = Number(
      link.textContent.match(/(\d+) articles?/)?.[1],
    );
    if (!id || !name || articleLinks.length !== declaredCount)
      throw new Error("Incomplete public collection");
    collections.push({
      id,
      name,
      url,
      publicOrder: collectionIndex + 1,
      articleCount: declaredCount,
    });
    for (const [articleIndex, articleLink] of articleLinks.entries()) {
      const articleUrl = new URL(articleLink.getAttribute("href"), HELP_ORIGIN)
        .href;
      const articlePage = await readPage(articleUrl);
      const node = articlePage.document.querySelector("article");
      const content = node?.querySelector(".installation-content");
      const articleId = new URL(articleUrl).pathname.match(
        /articles\/(\d+)/,
      )?.[1];
      const title = node?.querySelector("h1")?.textContent?.trim();
      if (
        !articleId ||
        !title ||
        !content?.textContent.trim() ||
        seen.has(articleId)
      ) {
        throw new Error(`Missing or duplicate public article ${articleId}`);
      }
      seen.add(articleId);
      articles.push({
        id: articleId,
        title,
        description:
          node.querySelector("header > p")?.textContent?.trim() ?? "",
        body: content.innerHTML,
        slug: new URL(articlePage.url).pathname.split("/").at(-1),
        featurebaseUrl: articlePage.url,
        parentId: id,
        collection: name,
        publicOrder: articleIndex + 1,
        state: "live",
        links: [...content.querySelectorAll("a")].map((a) => ({
          text: a.textContent,
          url: new URL(a.getAttribute("href"), articlePage.url).href,
        })),
        visuals: [...content.querySelectorAll("img,video,iframe")].map((e) => ({
          tag: e.tagName.toLowerCase(),
          src: e.getAttribute("src"),
          alt: e.getAttribute("alt"),
        })),
        headings: [...content.querySelectorAll("h2,h3,h4")].map((e) => ({
          level: e.tagName,
          id: e.id,
          text: e.textContent,
        })),
        labels: [...content.querySelectorAll("strong,code")].map(
          (e) => e.textContent,
        ),
      });
    }
  }
  return {
    schemaVersion: 1,
    method: "public-html",
    observedAt: new Date().toISOString(),
    helpCenterUrl: HELP_URL,
    completeness:
      "Published articles listed in public collections only; drafts, hidden collections, API order and unpublished changes require an authenticated export.",
    collections,
    articles,
  };
}
