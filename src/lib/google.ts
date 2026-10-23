import { appUrl } from "./http";
import { jsonFetch } from "./network";
export function googleRedirect() {
  return new URL("/api/oauth/google/callback", appUrl()).href;
}
export function googleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID,
    clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("Google OAuth not configured");
  return { client_id: clientId, client_secret: clientSecret };
}
export async function googleTokens(params: Record<string, string>) {
  return jsonFetch<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...googleClient(), ...params }),
  });
}
