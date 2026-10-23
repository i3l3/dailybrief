import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { googleClient, googleRedirect } from "@/lib/google";
import { apiError } from "@/lib/http";
export async function GET() {
  try {
    const state = randomBytes(32).toString("base64url");
    (await cookies()).set("google_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 600,
      path: "/api/oauth/google",
    });
    const params = new URLSearchParams({
      client_id: googleClient().client_id,
      redirect_uri: googleRedirect(),
      response_type: "code",
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return Response.redirect(
      "https://accounts.google.com/o/oauth2/v2/auth?" + params,
    );
  } catch (e) {
    return apiError(e);
  }
}
