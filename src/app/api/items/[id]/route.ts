import { z } from "zod";
import { query } from "@/lib/db";
import { apiError, sameOrigin, HttpError } from "@/lib/http";
import { enqueueSummary } from "@/lib/jobs";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(400, "항목 ID를 확인해 주세요.");
    const input = z
      .object({
        action: z.enum(["read", "unread", "save", "unsave", "summarize"]),
      })
      .parse(await request.json());
    if (input.action === "summarize") {
      if (!(await query("SELECT 1 FROM items WHERE id=$1", [id])).rowCount)
        throw new HttpError(404, "항목을 찾지 못했습니다.");
      const jobId = await enqueueSummary(id);
      return Response.json({ jobId }, { status: 202 });
    }
    const sql = {
      read: "read_at=now()",
      unread: "read_at=NULL",
      save: "saved=true",
      unsave: "saved=false",
    }[input.action];
    await query("UPDATE items SET " + sql + " WHERE id=$1", [id]);
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
