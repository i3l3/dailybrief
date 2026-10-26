import { rpc } from "./rpc";
export { dateLabel, relative } from "../../src/lib/client";
export async function api<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const result = await rpc<{ status: number; data: any }>("proxyRequest", {
    path: "/api" + path,
    method: (init.method || "GET").toUpperCase(),
    body: init.body == null ? null : JSON.parse(String(init.body)),
  });
  if (result.status < 200 || result.status >= 300)
    throw new Error(result.data?.error || "요청을 처리하지 못했습니다.");
  return result.data as T;
}
