import { z } from "zod";
import { getSettings, setSettings, query } from "@/lib/db";
import { apiError, sameOrigin, HttpError } from "@/lib/http";
import { secretNames, setSecret } from "@/lib/secrets";
import { settingsSchema } from "@/lib/validation";
import { matchInterests, cveMatch } from "@/lib/rules";
import { enqueueCollection } from "@/lib/jobs";
export async function GET() {
  try {
    return Response.json({
      settings: await getSettings(),
      secrets: (await query("SELECT name FROM secrets")).rows.map(
        (r) => r.name,
      ),
      googleConfigured:
        !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({
        settings: settingsSchema,
        secrets: z.record(z.string(), z.string().max(4000)).optional(),
      })
      .safeParse(await request.json());
    if (!input.success)
      throw new HttpError(400, "설정값 형식을 확인해 주세요.");
    const old = await getSettings();
    if (
      old.ai.provider !== input.data.settings.ai.provider &&
      !input.data.secrets?.aiKey?.trim()
    )
      throw new HttpError(
        400,
        "AI 제공자를 바꾸려면 새 제공자의 API 키를 함께 입력해 주세요.",
      );
    await setSettings(input.data.settings);
    for (const [name, value] of Object.entries(input.data.secrets ?? {}))
      if (secretNames.includes(name as (typeof secretNames)[number]))
        await setSecret(name, value);
    const items = await query(
      "SELECT id,title,body FROM items WHERE kind IN ('news','geek','mail')",
    );
    for (const item of items.rows) {
      const matched = matchInterests(
        item.title + " " + item.body,
        input.data.settings.interests,
      );
      await query("UPDATE items SET matched=$2 WHERE id=$1", [
        item.id,
        JSON.stringify(matched),
      ]);
    }
    for (const item of (
      await query("SELECT id,title,body,metadata FROM items WHERE kind='cve'")
    ).rows) {
      const matched = cveMatch(
        item.title +
          " " +
          item.body +
          " " +
          String(item.metadata.cpeText ?? ""),
        input.data.settings.cve,
      );
      await query(
        "UPDATE items SET matched=$2,tags=$2,excluded=$3 WHERE id=$1",
        [item.id, JSON.stringify(matched), matched.length === 0],
      );
    }
    // Config changes invalidate successful schedules so the worker refreshes them.
    await query("UPDATE collector_state SET last_success=NULL");
    for (const target of [
      "weather",
      "meals",
      "stocks",
      "cve",
      "geek",
      ...input.data.settings.feeds
        .filter((f) => f.enabled)
        .map((f) => "feed:" + f.id),
    ])
      await enqueueCollection(target);
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
