import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  matchInterests,
  cveMatch,
  safeLink,
  isNew,
  summaryAllowed,
  imapRange,
} from "../src/lib/rules";
import { encrypt, decrypt } from "../src/lib/crypto";
import { publicIp, publicFetch } from "../src/lib/network";
import { parseFeed } from "../src/lib/content";
import { settingsSchema } from "../src/lib/validation";
import { defaults } from "../src/lib/types";
test("interest matching is deterministic, case insensitive, and excludes unwanted terms", () => {
  const rules = [
    { name: "AI", keywords: ["LLM", "AI"], exclude: ["광고"] },
    { name: "보안", keywords: ["CVE"], exclude: [] },
  ];
  assert.deepEqual(matchInterests("New llm CVE", rules), ["AI", "보안"]);
  assert.deepEqual(matchInterests("AI 광고", rules), []);
  assert.deepEqual(matchInterests("unrelated", rules), []);
});
test("CVE filters match vendor/product/CPE without requiring a score", () => {
  assert.deepEqual(
    cveMatch("OpenSSL on Linux cpe:2.3:a:openssl:openssl", {
      tags: ["linux"],
      vendors: ["openssl"],
      products: [],
      cpes: [],
    }),
    ["linux", "openssl"],
  );
});
test("manual-only item kinds never auto-summarize", () => {
  for (const kind of ["geek", "cve"])
    assert.equal(summaryAllowed(kind, ["AI"], true), false);
  assert.equal(summaryAllowed("news", [], true), false);
  assert.equal(summaryAllowed("news", ["AI"], true), true);
  assert.equal(summaryAllowed("mail", [], true), true);
  assert.equal(summaryAllowed("cve", [], false), true);
});
test("visit boundary is strict and stable", () => {
  const at = "2026-10-22T00:00:00Z";
  assert.equal(isNew(at, at), false);
  assert.equal(isNew("2026-10-22T00:00:01Z", at), true);
});
test("IMAP cursor resets when UIDVALIDITY changes", () => {
  assert.equal(imapRange({ uidValidity: "1", lastUid: 40 }, "1"), 41);
  assert.equal(imapRange({ uidValidity: "1", lastUid: 40 }, "2"), 1);
});
test("untrusted links and private destinations are rejected", async () => {
  assert.equal(safeLink("javascript:alert(1)"), "");
  assert.equal(safeLink("https://user:password@example.com"), "");
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "192.168.1.3",
    "0.0.0.0",
  ])
    assert.equal(publicIp(ip), false, ip);
  assert.equal(publicIp("1.1.1.1"), true);
  await assert.rejects(() => publicFetch("http://127.0.0.1/private"));
});
test("encryption is randomized and authenticated", async () => {
  process.env.MASTER_KEY = randomBytes(32).toString("hex");
  const a = encrypt({ token: "test-only" }),
    b = encrypt({ token: "test-only" });
  assert.notEqual(a, b);
  assert.deepEqual(decrypt(a), { token: "test-only" });
  const parts = a.split(".");
  parts[2] = Buffer.from("tamper").toString("base64url");
  assert.throws(() => decrypt(parts.join(".")));
});
test("RSS and Atom normalize identity, markup and safe links", () => {
  const rss = parseFeed(
    "<rss><channel><item><title>News</title><link>https://example.com/a</link><description><![CDATA[<b>Hello</b>]]></description></item></channel></rss>",
  );
  assert.equal(rss[0].body, "Hello");
  assert.equal(rss[0].externalId, "https://example.com/a");
  const atom = parseFeed(
    '<feed><entry><title>Atom</title><id>id-1</id><link rel="alternate" href="https://example.com/b"/><summary>Text</summary></entry></feed>',
  );
  assert.equal(atom[0].url, "https://example.com/b");
});
test("settings reject duplicate widget order and unsafe feeds", () => {
  assert.equal(settingsSchema.safeParse(defaults).success, true);
  const invalid = structuredClone(defaults);
  invalid.appearance.order.fill("news");
  assert.equal(settingsSchema.safeParse(invalid).success, false);
  invalid.appearance.order = defaults.appearance.order;
  invalid.feeds = [
    { id: "x", name: "x", url: "file:///etc/passwd", enabled: true },
  ];
  assert.equal(settingsSchema.safeParse(invalid).success, false);
});
