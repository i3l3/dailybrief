import type { Interest } from "./types";
export function matchInterests(text: string, interests: Interest[]) {
  const lower = text.toLocaleLowerCase();
  return interests
    .filter(
      (i) =>
        i.keywords.some((k) => k.trim() && lower.includes(k.toLowerCase())) &&
        !i.exclude.some((k) => k.trim() && lower.includes(k.toLowerCase())),
    )
    .map((i) => i.name);
}
export function cveMatch(
  text: string,
  filters: {
    tags: string[];
    vendors: string[];
    products: string[];
    cpes: string[];
  },
) {
  return [
    ...new Set(
      [
        ...filters.tags,
        ...filters.vendors,
        ...filters.products,
        ...filters.cpes,
      ].filter((x) => x.trim() && text.toLowerCase().includes(x.toLowerCase())),
    ),
  ];
}
export function safeLink(value: string) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function isNew(firstSeen: string, baseline: string) {
  return new Date(firstSeen).getTime() > new Date(baseline).getTime();
}
export function summaryAllowed(
  kind: string,
  matched: string[],
  automatic: boolean,
) {
  return (
    !automatic || kind === "mail" || (kind === "news" && matched.length > 0)
  );
}
export function imapRange(
  cursor: { uidValidity?: string; lastUid?: number },
  uidValidity: string,
) {
  return cursor.uidValidity === uidValidity ? (cursor.lastUid ?? 0) + 1 : 1;
}
