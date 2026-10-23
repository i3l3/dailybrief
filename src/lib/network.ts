import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { Agent, fetch as safeFetch } from "undici";
export function publicIp(address: string) {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export async function resolvePublic(host: string) {
  const addresses = await dns.lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !publicIp(a.address)))
    throw new Error("Private address blocked");
  return addresses;
}
export async function publicFetch(
  url: string,
  limit = 2_000_000,
): Promise<{ text: string; url: string }> {
  let current = new URL(url);
  for (let hop = 0; hop < 4; hop++) {
    if (
      !["https:", "http:"].includes(current.protocol) ||
      current.username ||
      current.password ||
      !["", "80", "443"].includes(current.port)
    )
      throw new Error("Unsupported feed URL");
    const addresses = await resolvePublic(current.hostname);
    const dispatcher = new Agent({
      connect: {
        autoSelectFamily: false,
        lookup: (_host, _opts, callback) =>
          callback(null, addresses[0].address, addresses[0].family),
      },
    });
    try {
      const response = await safeFetch(current, {
        dispatcher,
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
        headers: { "user-agent": "DailyBrief/0.1 (personal feed reader)" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw new Error("Redirect missing");
        current = new URL(location, current);
        continue;
      }
      if (!response.ok)
        throw new Error("Source returned HTTP " + response.status);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Empty source");
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) {
          await reader.cancel();
          throw new Error("Source too large");
        }
        chunks.push(value);
      }
      return {
        text: Buffer.concat(chunks).toString("utf8"),
        url: current.href,
      };
    } finally {
      await dispatcher.close();
    }
  }
  throw new Error("Too many redirects");
}
export async function imapAddress(host: string) {
  const allowed = (process.env.IMAP_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.includes(host.toLowerCase()))
    return (await dns.lookup(host)).address;
  return (await resolvePublic(host))[0].address;
}
export async function jsonFetch<T = Record<string, unknown>>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok)
    throw new Error("Provider returned HTTP " + response.status);
  return response.json() as Promise<T>;
}
