import { z } from "zod";
import { query } from "@/lib/db";
import { apiError, sameOrigin, HttpError } from "@/lib/http";
async function checked(request: Request, params: Promise<{ id: string }>) {
  sameOrigin(request);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    throw new HttpError(400, "계정 ID가 올바르지 않습니다.");
  return id;
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = await checked(request, params);
    await query("DELETE FROM accounts WHERE id=$1", [id]);
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = await checked(request, params);
    const input = z
      .object({
        auto_summary: z.boolean(),
        excluded_senders: z.array(z.string().min(1).max(254)).max(100),
        excluded_folders: z.array(z.string().min(1).max(100)).max(100),
      })
      .parse(await request.json());
    await query(
      "UPDATE accounts SET auto_summary=$2,excluded_senders=$3,excluded_folders=$4 WHERE id=$1",
      [
        id,
        input.auto_summary,
        JSON.stringify(input.excluded_senders),
        JSON.stringify(input.excluded_folders),
      ],
    );
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
