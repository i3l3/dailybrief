import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createBridge } from "../bridge/server";
import { allowedRequest } from "../bridge/policy";
const token = "test-only-token-with-at-least-32-characters";
async function listen(server: Server) {
  server.listen(0,"127.0.0.1"); await once(server,"listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return "http://127.0.0.1:" + address.port;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>(resolve=>server.close(()=>resolve()));
}
const baseConfig = {token, publicUrl:"https://bridge.example.com", upstream:"http://127.0.0.1:3000", upstreamOrigin:"http://localhost:3000", gasUrl:"https://script.google.com/macros/s/test/exec"};
test("GAS and bridge agree on every allowed route, method and rejected escape", () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL("../Code.gs",import.meta.url),"utf8"),context);
  const id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  for(const method of ["GET","POST","PUT","PATCH","DELETE","OPTIONS"])
    for(const path of ["/api/dashboard","/api/settings","/api/accounts","/api/accounts/"+id,"/api/items/"+id,"/api/jobs/"+id+"?queue=summarize","/api/refresh","/api/status","/api/schools?q=test","/api/locations?q=test","/api/oauth/google","/api/../settings","/api/%2e%2e/settings","//attacker.example/api/status","/api/status#fragment","/api/status\r\nX-Test: yes"])
      assert.equal(context.allowedRequest_(path,method),allowedRequest(path,method),method+" "+path);
  assert.equal(allowedRequest("/api/oauth/google","GET"),false);
  assert.equal(allowedRequest("https://attacker.example/api/status","GET"),false);
});
test("proxy requires bearer, injects native origin, preserves JSON and upstream errors", async () => {
  let seenBody="",seenOrigin="",seenAuth="";
  const upstream = createServer(async(req,res)=>{
    seenOrigin=String(req.headers.origin || ""); seenAuth=String(req.headers.authorization || "");
    for await (const chunk of req) seenBody+=chunk;
    res.writeHead(req.url?.includes("settings")?422:200,{"Content-Type":"application/json"});
    res.end(JSON.stringify({ok:true,received:JSON.parse(seenBody || "{}")}));
  });
  const upstreamUrl=await listen(upstream);
  const bridge=createBridge({...baseConfig,upstream:upstreamUrl});
  const base=await listen(bridge);
  try {
    const health=await fetch(base+"/bridge/health");
    assert.equal(health.status,200);
    assert.deepEqual(await health.json(),{ok:true});
    assert.equal((await fetch(base+"/api/status")).status,401);
    const headers={Authorization:"Bearer "+token,"Content-Type":"application/json"};
    assert.equal((await fetch(base+"/api/oauth/google",{headers})).status,404);
    const response=await fetch(base+"/api/items/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",{method:"PATCH",headers,body:JSON.stringify({action:"summarize"})});
    assert.equal(response.status,200);
    assert.deepEqual((await response.json()).received,{action:"summarize"});
    assert.equal(seenOrigin,"http://localhost:3000");
    assert.equal(seenAuth,"");
    assert.equal((await fetch(base+"/api/settings",{headers})).status,422);
  } finally { await close(bridge); await close(upstream); }
});
test("OAuth ticket is single-use, PKCE and cookie required, Gmail persists before returning to GAS", async () => {
  let saved: string[]=[]; let exchanged: Record<string,string>={};
  const bridge=createBridge(baseConfig,{
    googleConfig:()=>({client_id:"test-client",client_secret:"test-secret"}),
    exchange:async params=>{exchanged=params;return {access_token:"mock-access",refresh_token:"mock-refresh"};},
    profile:async()=>({emailAddress:"test@example.com"}),
    saveGmail:async(email,refresh)=>{saved=[email,refresh];},
  });
  const base=await listen(bridge);
  try {
    assert.equal((await fetch(base+"/bridge/oauth-ticket",{method:"POST"})).status,401);
    const response=await fetch(base+"/bridge/oauth-ticket",{method:"POST",headers:{Authorization:"Bearer "+token}});
    const link=new URL((await response.json()).url);
    assert.equal(link.origin,"https://bridge.example.com");
    assert.equal(link.href.includes(token),false);
    const start=await fetch(base+link.pathname+link.search,{redirect:"manual"});
    assert.equal(start.status,302);
    const google=new URL(start.headers.get("location")!);
    assert.equal(google.searchParams.get("scope"),"https://www.googleapis.com/auth/gmail.readonly");
    assert.equal(google.searchParams.get("code_challenge_method"),"S256");
    assert.equal(google.searchParams.get("redirect_uri"),"https://bridge.example.com/bridge/oauth/callback");
    assert.equal((await fetch(base+link.pathname+link.search,{redirect:"manual"})).status,403);
    const callback="/bridge/oauth/callback?state="+google.searchParams.get("state")+"&code=mock-code";
    assert.equal((await fetch(base+callback,{redirect:"manual"})).status,403);
    assert.deepEqual(saved,[]);
    const completed=await fetch(base+callback,{redirect:"manual",headers:{Cookie:start.headers.get("set-cookie")!.split(";")[0]}});
    assert.equal(completed.status,303);
    assert.ok(completed.headers.get("location")!.startsWith(baseConfig.gasUrl+"?"));
    assert.ok(completed.headers.get("location")!.includes("connected=gmail"));
    assert.deepEqual(saved,["test@example.com","mock-refresh"]);
    assert.equal(exchanged.redirect_uri,google.searchParams.get("redirect_uri"));
    assert.ok(exchanged.code_verifier.length>=43);
    assert.equal((await fetch(base+callback,{redirect:"manual"})).status,403);
  } finally { await close(bridge); }
});
test("public GAS allows dashboard reads without login and blocks mutations and account access", () => {
  let email="other@example.com";
  const context=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:(key:string)=>key==="OWNER_EMAIL"?"owner@example.com":null})},Session:{getActiveUser:()=>({getEmail:()=>email})}});
  vm.runInContext(readFileSync(new URL("../Code.gs",import.meta.url),"utf8"),context);
  const forwarded: unknown[]=[];
  context.backend_=(...args:unknown[])=>{forwarded.push(args); return {status:200,data:{items:[]}};};
  assert.equal(context.proxyRequest({path:"/api/dashboard",method:"POST"}).status,200);
  assert.deepEqual(forwarded[0],["/bridge/public-dashboard","GET",null]);
  assert.equal(context.proxyRequest({path:"/api/dashboard?kind=mail",method:"GET"}).status,200);
  assert.throws(()=>context.proxyRequest({path:"/api/status",method:"GET"}));
  assert.throws(()=>context.proxyRequest({path:"/api/settings",method:"PUT",body:{}}));
  assert.throws(()=>context.proxyRequest({path:"/api/accounts",method:"GET"}));
  assert.throws(()=>context.proxyRequest({path:"/api/items/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",method:"PATCH",body:{action:"summarize"}}));
  assert.throws(()=>context.startGmailConnection());
  email=""; assert.throws(()=>context.owner_());
  email="owner@example.com"; assert.doesNotThrow(()=>context.owner_());
  const page=readFileSync(new URL("../Index.html",import.meta.url),"utf8");
  assert.equal(/BRIDGE_TOKEN|BRIDGE_URL|MASTER_KEY|GOOGLE_CLIENT_SECRET/.test(page),false);
});
