import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { appUrl } from "@/lib/http";
import { equal, encrypt } from "@/lib/crypto";
import { googleTokens, googleRedirect } from "@/lib/google";
import { jsonFetch } from "@/lib/network";
import { query } from "@/lib/db";
import { enqueueCollection } from "@/lib/jobs";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const state = (await cookies()).get("google_state")?.value;
    (await cookies()).set("google_state", "", {
      path: "/api/oauth/google",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
    });
    if (
      !state ||
      !equal(state, params.get("state") ?? "") ||
      !params.get("code")
    )
      throw new Error("Invalid OAuth state");
    const tokens = await googleTokens({
      code: params.get("code")!,
      grant_type: "authorization_code",
      redirect_uri: googleRedirect(),
    });
    if (!tokens.refresh_token) throw new Error("Refresh token missing");
    const profile = await jsonFetch<{ emailAddress: string }>(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: "Bearer " + tokens.access_token } },
    );
    let id = (
      await query(
        "SELECT id FROM accounts WHERE provider='gmail' AND email=$1",
        [profile.emailAddress],
      )
    ).rows[0]?.id as string | undefined;
    if (id) {
      await query(
        "UPDATE accounts SET credentials=$2,status='pending' WHERE id=$1",
        [id, encrypt({ refreshToken: tokens.refresh_token })],
      );
    } else {
      id = randomUUID();
      await query(
        "INSERT INTO accounts(id,provider,label,email,credentials) VALUES($1,'gmail',$2,$2,$3)",
        [
          id,
          profile.emailAddress,
          encrypt({ refreshToken: tokens.refresh_token }),
        ],
      );
    }
    await enqueueCollection("mail:" + id);
    return Response.redirect(new URL("/settings?connected=gmail", appUrl()));
  } catch {
    return Response.redirect(new URL("/settings?error=google", appUrl()));
  }
}
