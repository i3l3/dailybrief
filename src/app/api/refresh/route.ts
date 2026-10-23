import { getSettings, query } from "@/lib/db";
import { apiError, sameOrigin } from "@/lib/http";
import { enqueueCollection } from "@/lib/jobs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const settings = await getSettings();
    const targets = [
      "weather",
      "meals",
      "stocks",
      "geek",
      "cve",
      ...settings.feeds.filter((f) => f.enabled).map((f) => "feed:" + f.id),
      ...(await query("SELECT id FROM accounts")).rows.map(
        (a) => "mail:" + a.id,
      ),
    ];
    const jobs = await Promise.all(
      targets.map(async (target) => ({
        target,
        jobId: await enqueueCollection(target),
      })),
    );
    return Response.json({ jobs }, { status: 202 });
  } catch (e) {
    return apiError(e);
  }
}
