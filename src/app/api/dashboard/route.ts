import { query, getSettings } from "@/lib/db";
import { apiError, sameOrigin, HttpError } from "@/lib/http";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind");
    const before = params.get("before");
    if (kind && !["news", "geek", "cve", "mail"].includes(kind))
      throw new HttpError(400, "소식 종류가 올바르지 않습니다.");
    if (before && Number.isNaN(+new Date(before)))
      throw new HttpError(400, "조회 기준 시각이 올바르지 않습니다.");
    const values: unknown[] = [];
    const where = ["NOT excluded"];
    if (kind) {
      values.push(kind);
      where.push("kind=$" + values.length);
    }
    if (before) {
      values.push(before);
      where.push("published_at < $" + values.length);
    }
    const items = await query(
      `SELECT * FROM (SELECT *,row_number() OVER(PARTITION BY kind ORDER BY published_at DESC) AS rownum FROM items WHERE ${where.join(" AND ")}) ranked WHERE rownum<=80 ORDER BY published_at DESC`,
      values,
    );
    return Response.json({ items: items.rows });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const settings = await getSettings();
    const client = await (await import("@/lib/db")).pool.connect();
    let baseline: string, visitAt: string;
    try {
      await client.query("BEGIN");
      const state = (
        await client.query(
          "SELECT last_visit FROM app_state WHERE id=1 FOR UPDATE",
        )
      ).rows[0];
      const now = (await client.query("SELECT now() AS at")).rows[0].at as Date;
      baseline = (state.last_visit ?? new Date(+now - 86400000)).toISOString();
      visitAt = now.toISOString();
      await client.query("UPDATE app_state SET last_visit=$1 WHERE id=1", [
        now,
      ]);
      const items = await client.query(
        `SELECT * FROM (SELECT *, row_number() OVER(PARTITION BY kind ORDER BY published_at DESC) AS rownum FROM items WHERE NOT excluded) ranked WHERE rownum<=80 ORDER BY published_at DESC`,
      );
      const accounts = await client.query(
        "SELECT id,provider,label,email,auto_summary,excluded_senders,excluded_folders,status,last_sync FROM accounts",
      );
      const widgets = await client.query("SELECT * FROM widget_cache");
      const states = await client.query(
        "SELECT id,last_success,error FROM collector_state",
      );
      await client.query("COMMIT");
      return Response.json({
        items: items.rows,
        accounts: accounts.rows,
        settings,
        baseline,
        visitAt,
        widgets: Object.fromEntries(
          widgets.rows.map((w) => [
            w.id,
            { data: w.data, updated_at: w.updated_at, error: w.error },
          ]),
        ),
        collectors: states.rows,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    return apiError(e);
  }
}
