import { z } from "zod";
import { boss } from "@/lib/jobs";
import { apiError, HttpError } from "@/lib/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(400, "작업 ID가 올바르지 않습니다.");
    const queue =
      new URL(request.url).searchParams.get("queue") === "summarize"
        ? "summarize"
        : "collect";
    const job = await (await boss()).getJobById(queue, id);
    if (!job) throw new HttpError(404, "작업을 찾지 못했습니다.");
    return Response.json({ id: job.id, state: job.state });
  } catch (e) {
    return apiError(e);
  }
}
