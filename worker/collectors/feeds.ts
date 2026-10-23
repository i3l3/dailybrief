import { getSettings, query } from "../../src/lib/db";
import { publicFetch } from "../../src/lib/network";
import { parseFeed, plain } from "../../src/lib/content";
import { upsertItem } from "../../src/lib/items";
import { matchInterests } from "../../src/lib/rules";
import { enqueueSummary } from "../../src/lib/jobs";
import { load } from "cheerio";
export async function collectFeed(id: string) {
  const settings = await getSettings();
  const geek = id === "geek";
  const feed = geek
    ? { url: "https://news.hada.io/rss/news", name: "GeekNews", enabled: true }
    : settings.feeds.find((x) => x.id === id);
  if (!feed || !feed.enabled) return;
  const previous = (
    await query("SELECT last_success FROM collector_state WHERE id=$1", [
      geek ? "geek" : "feed:" + id,
    ])
  ).rows[0]?.last_success;
  for (const item of parseFeed((await publicFetch(feed.url)).text)) {
    if (
      new Date(item.publishedAt) <
      new Date(Date.now() - (previous ? 7 : 1) * 86400000)
    )
      continue;
    const matched = matchInterests(
      item.title + " " + item.body,
      settings.interests,
    );
    let body = item.body;
    let fullText = false;
    if (!geek && matched.length && item.url) {
      try {
        const page = load((await publicFetch(item.url)).text);
        page("script,style,nav,footer,header,aside").remove();
        const article = page("article,main").first().html();
        if (article) {
          body = plain(article);
          fullText = true;
        }
      } catch {
        /* RSS content remains available. */
      }
    }
    const itemId = await upsertItem({
      ...item,
      kind: geek ? "geek" : "news",
      source: feed.name,
      body,
      tags: matched,
      matched,
      metadata: { feedId: id, contentScope: fullText ? "article" : "feed" },
    });
    if (!geek && matched.length) await enqueueSummary(itemId, true);
  }
}
