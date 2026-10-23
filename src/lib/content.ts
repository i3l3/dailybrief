import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";
import { hash } from "./crypto";
import { safeLink } from "./rules";
export function plain(html: string) {
  return load(html).text().replace(/\s+/g, " ").trim().slice(0, 30000);
}
export function parseFeed(xml: string) {
  const parsed = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: false,
    ignoreDeclaration: true,
  }).parse(xml);
  const root =
    parsed.rss?.channel?.item ??
    parsed.feed?.entry ??
    parsed["rdf:RDF"]?.item ??
    [];
  return (Array.isArray(root) ? root : [root])
    .slice(0, 100)
    .map((x: Record<string, unknown>) => {
      const val = (v: unknown): string =>
        typeof v === "object" && v !== null
          ? String((v as Record<string, unknown>)["#text"] ?? "")
          : String(v ?? "");
      const links = Array.isArray(x.link) ? x.link : [x.link];
      const link = links.find(
        (l: unknown) =>
          typeof l === "string" ||
          (l &&
            typeof l === "object" &&
            (!(l as Record<string, unknown>)["@_rel"] ||
              (l as Record<string, unknown>)["@_rel"] === "alternate")),
      );
      const url = safeLink(
        typeof link === "string" ? link : String(link?.["@_href"] ?? ""),
      );
      const title = plain(val(x.title));
      const body = plain(
        val(x["content:encoded"] ?? x.content ?? x.description ?? x.summary),
      );
      const date = new Date(
        val(x.published ?? x.pubDate ?? x.updated ?? x["dc:date"]),
      );
      return {
        externalId: url || val(x.id ?? x.guid) || hash(title + body),
        title,
        body,
        url,
        publishedAt: Number.isNaN(+date)
          ? new Date().toISOString()
          : date.toISOString(),
      };
    })
    .filter((x) => x.title);
}
