import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
process.loadEnvFile(".env");
const base = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const database = "dailybrief_test_" + Date.now();
const connection = new URL(process.env.DATABASE_URL!);
connection.pathname = "/" + database;
const origin = "http://127.0.0.1:3101";
const env = {
  ...process.env,
  DATABASE_URL: connection.href,
  MASTER_KEY: randomBytes(32).toString("hex"),
  APP_URL: origin,
  NEXT_BUILD_DIR: ".next-integration",
  NEXT_TELEMETRY_DISABLED: "1",
};
let server: ChildProcess | undefined,
  worker: ChildProcess | undefined,
  db: pg.Pool | undefined;
let passed = 0;
let output = "";
const launch = (args: string[]) => {
  const child = spawn(process.execPath, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (b) => {
    output = (output + b).slice(-5000);
  });
  child.stderr?.on("data", (b) => {
    output = (output + b).slice(-5000);
  });
  return child;
};
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  console.log("PASS " + name);
  passed++;
}
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  extra: Record<string, string> = {},
) {
  return fetch(origin + "/api" + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...extra,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
async function shutdown() {
  server?.kill();
  worker?.kill();
  await db?.end();
  await base.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1",
    [database],
  );
  await base.query('DROP DATABASE IF EXISTS "' + database + '"');
  await base.end();
}
try {
  await base.query('CREATE DATABASE "' + database + '"');
  db = new pg.Pool({ connectionString: connection.href });
  // Model an existing installation with a visit cursor, settings and encrypted secrets.
  await db.query(
    await readFile(
      new URL("../migrations/001_initial.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.query(
    "INSERT INTO schema_migrations(name) VALUES('001_initial.sql')",
  );
  const originalVisit = "2026-10-21T00:00:00.000Z";
  await db.query(
    "INSERT INTO owner(id,username,password_hash,last_visit) VALUES(1,'legacy','legacy-test-hash',$1)",
    [originalVisit],
  );
  await db.query("INSERT INTO settings(id,value) VALUES(1,$1)", [
    JSON.stringify((await import("../src/lib/types")).defaults),
  ]);
  await db.query(
    "INSERT INTO secrets(name,ciphertext) VALUES('migration-test','unchanged-ciphertext')",
  );
  const migration = launch([
    "node_modules/tsx/dist/cli.mjs",
    "scripts/migrate.ts",
  ]);
  const [code] = await once(migration, "exit");
  assert.equal(code, 0, output);
  await check(
    "existing visit, settings and secrets survive migration",
    async () => {
      assert.equal(
        (
          await db!.query("SELECT last_visit FROM app_state")
        ).rows[0].last_visit.toISOString(),
        originalVisit,
      );
      assert.equal((await db!.query("SELECT value FROM settings")).rowCount, 1);
      assert.equal(
        (
          await db!.query(
            "SELECT ciphertext FROM secrets WHERE name='migration-test'",
          )
        ).rows[0].ciphertext,
        "unchanged-ciphertext",
      );
    },
  );
  server = launch([
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3101",
  ]);
  let connected = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await request("/settings");
      if (r.ok) {
        connected = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(connected, "Test server unavailable");
  await check("dashboard and settings open without login", async () => {
    for (const path of ["/", "/settings"]) {
      const r = await fetch(origin + path, { redirect: "manual" });
      assert.equal(r.status, 200);
    }
    assert.equal((await request("/settings")).status, 200);
    const r = await request("/dashboard", "POST", {});
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("set-cookie"), null);
  });
  await check(
    "legacy login redirects home and auth API is removed",
    async () => {
      const r = await fetch(origin + "/login", { redirect: "manual" });
      assert.ok([307, 308].includes(r.status));
      assert.equal(r.headers.get("location"), "/");
      assert.equal((await request("/auth")).status, 404);
      assert.equal(
        (await request("/auth", "POST", { action: "login" })).status,
        404,
      );
    },
  );
  await check("settings still reject foreign and missing origins", async () => {
    for (const headers of [
      { Origin: "https://invalid.example" },
      { Origin: "" },
    ])
      assert.equal(
        (await request("/settings", "PUT", {}, headers)).status,
        403,
      );
  });
  await check(
    "migration preserves visit state and removes login tables",
    async () => {
      for (const table of ["owner", "sessions", "login_attempts"])
        assert.equal(
          (
            await db!.query("SELECT to_regclass($1) AS name", [
              "public." + table,
            ])
          ).rows[0].name,
          null,
        );
      assert.equal(
        (await db!.query("SELECT last_visit FROM app_state")).rowCount,
        1,
      );
    },
  );
  let settings = (await (await request("/settings")).json()).settings;
  await check("settings roundtrip and secret redaction", async () => {
    settings = {
      ...settings,
      interests: [
        {
          name: "테스트",
          keywords: ["test", "CVE"],
          exclude: ["advertisement"],
        },
      ],
    };
    const r = await request("/settings", "PUT", {
      settings,
      secrets: { aiKey: "integration-synthetic-secret" },
    });
    assert.equal(r.status, 200);
    const saved = await (await request("/settings")).json();
    assert.deepEqual(saved.settings.interests, settings.interests);
    assert.ok(saved.secrets.includes("aiKey"));
    assert.ok(!JSON.stringify(saved).includes("integration-synthetic-secret"));
    const cipher = (
      await db!.query("SELECT ciphertext FROM secrets WHERE name='aiKey'")
    ).rows[0].ciphertext;
    assert.ok(!cipher.includes("integration-synthetic-secret"));
  });
  await check("malformed settings are rejected", async () => {
    assert.equal(
      (await request("/settings", "PUT", { settings: {} })).status,
      400,
    );
  });
  const firstId = randomUUID(),
    secondId = randomUUID(),
    mailId = randomUUID();
  await db.query(
    "INSERT INTO accounts(id,provider,label,email,credentials) VALUES($1,'imap','Test','test@example.com','synthetic')",
    [firstId],
  );
  await db.query(
    "INSERT INTO accounts(id,provider,label,email,credentials) VALUES($1,'imap','Test2','test2@example.com','synthetic')",
    [secondId],
  );
  await check("mail IDs are scoped by account", async () => {
    for (const [account, id] of [
      [firstId, mailId],
      [secondId, randomUUID()],
    ])
      await db!.query(
        "INSERT INTO items(id,kind,external_id,account_id,title,source,body,published_at) VALUES($1,'mail',$2,$3,'Test message','Test','Synthetic body',now())",
        [id, account + ":1", account],
      );
    assert.equal(
      Number(
        (await db!.query("SELECT count(*) FROM items WHERE kind='mail'"))
          .rows[0].count,
      ),
      2,
    );
  });
  let baseline = "";
  await check("visit succeeds and exposes no credentials", async () => {
    const r = await request("/dashboard", "POST", {});
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.items.length, 2);
    baseline = data.visitAt;
    assert.ok(!JSON.stringify(data).includes("credentials"));
  });
  await check("background read preserves visit baseline", async () => {
    await request("/dashboard");
    assert.equal(
      (
        await db!.query("SELECT last_visit FROM app_state")
      ).rows[0].last_visit.toISOString(),
      baseline,
    );
  });
  await check("next visit uses previous successful visit", async () => {
    const d = await (await request("/dashboard", "POST", {})).json();
    assert.equal(d.baseline, baseline);
  });
  await check("read and saved states persist", async () => {
    for (const action of ["read", "save"])
      assert.equal(
        (await request("/items/" + mailId, "PATCH", { action })).status,
        200,
      );
    const item = (await (await request("/dashboard")).json()).items.find(
      (i: { id: string }) => i.id === mailId,
    );
    assert.ok(item.read_at);
    assert.equal(item.saved, true);
  });
  await check("private IMAP destination is blocked", async () => {
    const r = await request("/accounts", "POST", {
      label: "bad",
      email: "test@example.com",
      host: "127.0.0.1",
      port: 993,
      user: "test",
      password: "test",
    });
    assert.notEqual(r.status, 201);
  });
  await check("disconnect deletes only that account mail", async () => {
    assert.equal((await request("/accounts/" + firstId, "DELETE")).status, 200);
    assert.equal(
      Number(
        (
          await db!.query("SELECT count(*) FROM items WHERE account_id=$1", [
            firstId,
          ])
        ).rows[0].count,
      ),
      0,
    );
    assert.equal(
      Number(
        (
          await db!.query("SELECT count(*) FROM items WHERE account_id=$1", [
            secondId,
          ])
        ).rows[0].count,
      ),
      1,
    );
  });
  await db.query("DELETE FROM accounts");
  const newsId = randomUUID();
  await db.query(
    "INSERT INTO items(id,kind,external_id,title,source,body,published_at) VALUES($1,'news','integration-news','Synthetic test','Test','Synthetic body',now())",
    [newsId],
  );
  worker = launch(["node_modules/tsx/dist/cli.mjs", "worker/index.ts"]);
  await check(
    "manual summary runs in persistent queue without configured model",
    async () => {
      const response = await request("/items/" + newsId, "PATCH", {
        action: "summarize",
      });
      assert.equal(response.status, 202);
      const { jobId } = await response.json();
      assert.ok(jobId);
      let completed = false;
      for (let i = 0; i < 30; i++) {
        const state = await (
          await request("/jobs/" + jobId + "?queue=summarize")
        ).json();
        if (state.state === "completed") {
          completed = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      assert.ok(completed, output);
      assert.equal(
        (
          await db!.query("SELECT summary_status FROM items WHERE id=$1", [
            newsId,
          ])
        ).rows[0].summary_status,
        "unconfigured",
      );
    },
  );
  console.log(`${passed} integration checks passed.`);
  if (process.argv.includes("--preview")) {
    console.log(
      "Isolated QA server ready at " +
        origin +
        " (no login required). Press Ctrl+C to clean up.",
    );
    await new Promise<void>((resolve) => {
      process.once("SIGINT", () => resolve());
      process.once("SIGTERM", () => resolve());
    });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Integration failed");
  console.error(output);
  process.exitCode = 1;
} finally {
  await shutdown();
}
