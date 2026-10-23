import { readFile, readdir } from "node:fs/promises";
import { pool } from "../src/lib/db";
export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(87932501)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of (
      await readdir(new URL("../migrations/", import.meta.url))
    )
      .filter((x) => x.endsWith(".sql"))
      .sort()) {
      if (
        (
          await client.query(
            "SELECT name FROM schema_migrations WHERE name=$1",
            [name],
          )
        ).rowCount
      )
        continue;
      await client.query("BEGIN");
      try {
        await client.query(
          await readFile(
            new URL("../migrations/" + name, import.meta.url),
            "utf8",
          ),
        );
        await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [
          name,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(87932501)");
    client.release();
  }
}
await migrate();
await pool.end();
console.log("Database migrations applied.");
