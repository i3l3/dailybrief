import { getSettings, query } from "../../src/lib/db";
import { jsonFetch } from "../../src/lib/network";
import { getSecret } from "../../src/lib/secrets";
import { cveMatch } from "../../src/lib/rules";
import { upsertItem } from "../../src/lib/items";
interface NvdCve {
  id: string;
  published: string;
  lastModified: string;
  descriptions: { lang: string; value: string }[];
  metrics?: Record<
    string,
    { cvssData?: { baseScore: number; baseSeverity: string } }[]
  >;
  configurations?: unknown;
  references?: { url: string }[];
  vulnStatus?: string;
}
export async function collectCves() {
  const { cve: filters } = await getSettings();
  if (!Object.values(filters).some((a) => a.length)) return;
  const key = await getSecret("nvdKey");
  const state = (
    await query("SELECT cursor FROM collector_state WHERE id=$1", ["cve"])
  ).rows[0]?.cursor;
  const end = new Date();
  const start = new Date(
    Math.max(
      new Date(state?.until ?? Date.now() - 86400000).getTime() - 120000,
      end.getTime() - 119 * 86400000,
    ),
  );
  let index = 0,
    total = 1;
  while (index < total) {
    const params = new URLSearchParams({
      lastModStartDate: start.toISOString(),
      lastModEndDate: end.toISOString(),
      resultsPerPage: "2000",
      startIndex: String(index),
    });
    const response = await jsonFetch<{
      totalResults: number;
      vulnerabilities: { cve: NvdCve }[];
    }>("https://services.nvd.nist.gov/rest/json/cves/2.0?" + params, {
      headers: key ? { apiKey: key } : {},
    });
    total = response.totalResults;
    for (const { cve } of response.vulnerabilities) {
      if (cve.vulnStatus === "Rejected") continue;
      const description =
        cve.descriptions.find((d) => d.lang === "en")?.value ??
        cve.descriptions[0]?.value ??
        "";
      const matched = cveMatch(
        cve.id +
          " " +
          description +
          " " +
          JSON.stringify(cve.configurations ?? {}),
        filters,
      );
      if (!matched.length) continue;
      const metric = Object.values(cve.metrics ?? {})
        .flat()
        .find((m) => m.cvssData)?.cvssData;
      await upsertItem({
        kind: "cve",
        externalId: cve.id,
        title: cve.id,
        source: "NVD",
        body: description,
        url: "https://nvd.nist.gov/vuln/detail/" + encodeURIComponent(cve.id),
        publishedAt: new Date(
          cve.published + "Z".repeat(cve.published.endsWith("Z") ? 0 : 1),
        ).toISOString(),
        tags: matched,
        matched,
        metadata: {
          score: metric?.baseScore ?? null,
          severity: metric?.baseSeverity ?? "UNRATED",
          modified: cve.lastModified,
          matchType: "키워드·제품 조건 일치",
          cpeText: JSON.stringify(cve.configurations ?? {}),
        },
      });
    }
    index += response.vulnerabilities.length;
    if (!response.vulnerabilities.length) break;
    if (index < total)
      await new Promise((r) => setTimeout(r, key ? 700 : 6500));
  }
  await query(
    "INSERT INTO collector_state(id,cursor) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET cursor=$2",
    ["cve", JSON.stringify({ until: end.toISOString() })],
  );
}
