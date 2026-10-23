import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { apiError, sameOrigin, HttpError } from "@/lib/http";
import { imapSchema } from "@/lib/validation";
import { imapAddress } from "@/lib/network";
import { enqueueCollection } from "@/lib/jobs";
export async function GET() {
  try {
    return Response.json({
      accounts: (
        await query(
          "SELECT id,provider,label,email,auto_summary,excluded_senders,excluded_folders,status,last_sync FROM accounts ORDER BY label",
        )
      ).rows,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = imapSchema.safeParse(await request.json());
    if (!input.success)
      throw new HttpError(
        400,
        "IMAP 서버·계정·포트를 확인해 주세요. 포트는 TLS 993 또는 STARTTLS 143을 지원합니다.",
      );
    await imapAddress(input.data.host);
    const { label, email, ...credentials } = input.data;
    const id = randomUUID();
    await query(
      "INSERT INTO accounts(id,provider,label,email,credentials) VALUES($1,'imap',$2,$3,$4)",
      [id, label, email, encrypt(credentials)],
    );
    const jobId = await enqueueCollection("mail:" + id);
    return Response.json({ id, jobId }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
