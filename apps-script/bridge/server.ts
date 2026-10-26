import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes, createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { allowedRequest } from "./policy";
import { pool, getSettings } from "../../src/lib/db";
import { encrypt } from "../../src/lib/crypto";
import { googleClient, googleTokens } from "../../src/lib/google";
import { enqueueCollection, boss } from "../../src/lib/jobs";

export interface BridgeConfig {
  token: string;
  publicUrl: string;
  upstream: string;
  upstreamOrigin: string;
  gasUrl: string;
}
type Dependencies = {
  googleConfig: () => { client_id: string; client_secret: string };
  exchange: (params: Record<string, string>) => Promise<{ access_token: string; refresh_token?: string }>;
  profile: (accessToken: string) => Promise<{ emailAddress: string }>;
  saveGmail: (email: string, refreshToken: string) => Promise<void>;
};
const defaults: Dependencies = {
  googleConfig: googleClient,
  exchange: googleTokens,
  profile: async (accessToken) => {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: "Bearer " + accessToken }, signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error("Gmail profile unavailable");
    return response.json();
  },
  saveGmail: async (email, refreshToken) => {
    const client = await pool.connect();
    let id: string;
    try {
      await client.query("BEGIN");
      // Serialize OAuth callbacks for the same mailbox, including first connection.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["gas-gmail:" + email]);
      const previous = await client.query("SELECT id FROM accounts WHERE provider='gmail' AND email=$1", [email]);
      id = previous.rows[0]?.id || randomUUID();
      if (previous.rowCount) await client.query("UPDATE accounts SET credentials=$2,status='pending' WHERE id=$1", [id, encrypt({ refreshToken })]);
      else await client.query("INSERT INTO accounts(id,provider,label,email,credentials) VALUES($1,'gmail',$2,$2,$3)", [id, email, encrypt({ refreshToken })]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
    await enqueueCollection("mail:" + id!);
  },
};
function equals(a: string, b: string) {
  const aa = Buffer.from(a), bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
async function body(req: IncomingMessage) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 500000) throw new Error("Body too large");
  }
  if (text) JSON.parse(text);
  return text;
}
function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {"Content-Type":"application/json; charset=utf-8"});
  res.end(JSON.stringify(value));
}
export function createBridge(config: BridgeConfig, overrides: Partial<Dependencies> = {}) {
  if (config.token.length < 32) throw new Error("BRIDGE_TOKEN must contain at least 32 characters");
  for (const name of ["publicUrl", "upstream", "gasUrl"] as const) {
    const url = new URL(config[name]);
    if (url.username || url.password || url.search || url.hash) throw new Error("Invalid bridge URL: " + name);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid bridge protocol");
    if (name !== "upstream" && url.protocol !== "https:") throw new Error(name + " must use HTTPS");
    if (name !== "gasUrl" && url.pathname !== "/") throw new Error("Bridge URLs must not contain paths");
  }
  const deps = { ...defaults, ...overrides };
  const tickets = new Map<string, number>();
  const states = new Map<string, { cookie: string; verifier: string; expires: number }>();
  const callback = new URL("/bridge/oauth/callback", config.publicUrl).href;
  return createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    try {
      for (const [key, expires] of tickets) if (expires < Date.now()) tickets.delete(key);
      for (const [key, value] of states) if (value.expires < Date.now()) states.delete(key);
      const raw = req.url || "/";
      const url = new URL(raw, config.publicUrl);
      if (req.method === "GET" && raw === "/bridge/health")
        return json(res, 200, {ok:true});
      const redirectBack = (success: boolean) => {
        const destination = new URL(config.gasUrl);
        destination.searchParams.set("page", "settings");
        destination.searchParams.set("tab", "accounts");
        destination.searchParams.set(success ? "connected" : "error", "gmail");
        res.writeHead(303, {Location:destination.href, "Set-Cookie":"gas_oauth=; Path=/bridge/oauth; Max-Age=0; HttpOnly; Secure; SameSite=Lax"});
        res.end();
      };
      if (req.method === "GET" && url.pathname === "/bridge/oauth/start") {
        const ticket = url.searchParams.get("ticket") || "";
        const expires = tickets.get(ticket) || 0;
        tickets.delete(ticket);
        if (expires < Date.now()) return json(res, 403, {error:"연결 링크가 만료됐습니다. 설정에서 다시 시작해 주세요."});
        const state = randomBytes(32).toString("base64url");
        const cookie = randomBytes(32).toString("base64url");
        const verifier = randomBytes(32).toString("base64url");
        const client = deps.googleConfig();
        states.set(state, {cookie, verifier, expires:Date.now()+600000});
        const destination = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        destination.search = new URLSearchParams({client_id:client.client_id,
          redirect_uri:callback, response_type:"code", scope:"https://www.googleapis.com/auth/gmail.readonly",
          access_type:"offline", prompt:"consent", state, code_challenge_method:"S256",
          code_challenge:createHash("sha256").update(verifier).digest("base64url")}).toString();
        res.writeHead(302, {Location:destination.href, "Set-Cookie":`gas_oauth=${cookie}; Path=/bridge/oauth; Max-Age=600; HttpOnly; Secure; SameSite=Lax`});
        return res.end();
      }
      if (req.method === "GET" && url.pathname === "/bridge/oauth/callback") {
        const state = url.searchParams.get("state") || "";
        const pending = states.get(state);
        const cookie = /(?:^|;\s*)gas_oauth=([A-Za-z0-9_-]+)/.exec(req.headers.cookie || "")?.[1] || "";
        if (!pending || pending.expires < Date.now() || !equals(cookie, pending.cookie))
          return json(res, 403, {error:"Gmail 연결 상태를 확인할 수 없습니다. 설정에서 다시 시작해 주세요."});
        states.delete(state);
        const code = url.searchParams.get("code");
        if (!code || url.searchParams.has("error")) return redirectBack(false);
        try {
          const tokens = await deps.exchange({code, grant_type:"authorization_code", redirect_uri:callback, code_verifier:pending.verifier});
          if (!tokens.refresh_token) throw new Error("Refresh token missing");
          const profile = await deps.profile(tokens.access_token);
          if (!profile.emailAddress) throw new Error("Email missing");
          await deps.saveGmail(profile.emailAddress, tokens.refresh_token);
          return redirectBack(true);
        } catch { return redirectBack(false); }
      }
      if (!equals(req.headers.authorization || "", "Bearer " + config.token))
        return json(res, 401, {error:"브리지 인증에 실패했습니다."});
      if (req.method === "GET" && raw === "/bridge/public-dashboard") {
        const [items, accounts, widgets, collectors, state, settings] = await Promise.all([
          pool.query("SELECT * FROM (SELECT *, row_number() OVER(PARTITION BY kind ORDER BY published_at DESC) AS rownum FROM items WHERE NOT excluded) ranked WHERE rownum<=80 ORDER BY published_at DESC"),
          pool.query("SELECT id,provider,label,email,auto_summary,status,last_sync FROM accounts"),
          pool.query("SELECT * FROM widget_cache"),
          pool.query("SELECT id,last_success,error FROM collector_state"),
          pool.query("SELECT last_visit FROM app_state WHERE id=1"),
          getSettings(),
        ]);
        return json(res, 200, {
          items:items.rows, accounts:accounts.rows, settings,
          widgets:Object.fromEntries(widgets.rows.map(w=>[w.id,{data:w.data,updated_at:w.updated_at,error:w.error}])),
          collectors:collectors.rows,
          baseline:state.rows[0]?.last_visit?.toISOString() || new Date(Date.now()-86400000).toISOString(),
          visitAt:new Date().toISOString(),
        });
      }
      if (req.method === "POST" && raw === "/bridge/oauth-ticket") {
        deps.googleConfig();
        const ticket = randomBytes(32).toString("base64url");
        tickets.set(ticket, Date.now()+60000);
        return json(res, 200, {url:new URL("/bridge/oauth/start?ticket="+ticket, config.publicUrl).href});
      }
      if (!allowedRequest(raw, req.method || "GET")) return json(res, 404, {error:"지원하지 않는 경로입니다."});
      const payload = await body(req);
      const response = await fetch(new URL(raw, config.upstream), {
        method:req.method,
        headers:{"Content-Type":"application/json", Origin:config.upstreamOrigin},
        ...(payload && !["GET", "HEAD"].includes(req.method || "GET") ? {body:payload} : {}),
        redirect:"manual", signal:AbortSignal.timeout(35000),
      });
      if (response.status >= 300 && response.status < 400) throw new Error("Unexpected upstream redirect");
      const text = await response.text();
      const data = JSON.parse(text);
      return json(res, response.status, data);
    } catch { return json(res, 502, {error:"브리지에서 요청을 처리하지 못했습니다. 서버 상태와 연결 설정을 확인해 주세요."}); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createBridge({token:process.env.BRIDGE_TOKEN || "", publicUrl:process.env.BRIDGE_PUBLIC_URL || "",
    upstream:process.env.BRIDGE_UPSTREAM || "http://127.0.0.1:3000", upstreamOrigin:new URL(process.env.APP_URL!).origin,
    gasUrl:process.env.GAS_WEB_APP_URL || ""});
  server.requestTimeout = 45000;
  server.headersTimeout = 15000;
  server.listen(Number(process.env.BRIDGE_PORT || 8787), process.env.BRIDGE_BIND || "127.0.0.1", () => console.log("DailyBrief Apps Script bridge ready"));
  const shutdown = () => server.close(async () => {await (await boss()).stop(); await pool.end();});
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
