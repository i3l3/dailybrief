import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createBridge } from "../bridge/server";
const token=randomBytes(32).toString("hex");
const server=createBridge({token, publicUrl:"https://bridge.example.com",upstream:"http://127.0.0.1:3000",upstreamOrigin:"http://localhost:3000",gasUrl:"https://script.google.com/macros/s/test/exec"});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const address=server.address();
assert.ok(address && typeof address==="object");
try {
  for(const path of ["/api/status","/api/settings","/api/accounts","/api/dashboard"]) {
    const response: Response=await fetch("http://127.0.0.1:"+address.port+path,{headers:{Authorization:"Bearer "+token}});
    assert.equal(response.status,200,path);
    const data=await response.json();
    assert.ok(data && typeof data==="object");
    console.log("PASS readonly native bridge "+path+" (contents withheld)");
  }
} finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
