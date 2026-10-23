import pg from "pg";
import { defaults, type Settings } from "./types";
const globalDb = globalThis as unknown as { dailybriefPool?: pg.Pool };
export const pool =
  globalDb.dailybriefPool ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== "production") globalDb.dailybriefPool = pool;
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  return pool.query<T>(sql, values);
}
export async function getSettings(): Promise<Settings> {
  const { rows } = await query("SELECT value FROM settings WHERE id=1");
  return rows[0]?.value ?? structuredClone(defaults);
}
export async function setSettings(value: Settings) {
  await query(
    "INSERT INTO settings(id,value) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET value=$1",
    [JSON.stringify(value)],
  );
}
