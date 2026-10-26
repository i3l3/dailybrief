import { rpc } from "./rpc";
export { dateLabel, relative } from "../../src/lib/client";
export async function api<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (path.startsWith("/items/") && init.method === "PATCH") {
    const action = JSON.parse(String(init.body || "{}"));
    if (["read", "unread", "save", "unsave"].includes(action.action))
      return {} as T; // Original component updates its local state; personal DB stays untouched.
    throw new Error("공개 시연에서는 새 AI 요약 요청이 제한됩니다. 저장된 요약은 그대로 볼 수 있어요.");
  }
  const result = await rpc<{ status: number; data: any }>("proxyRequest", {
    path: "/api" + path,
    method: (init.method || "GET").toUpperCase(),
    body: init.body == null ? null : JSON.parse(String(init.body)),
  });
  if (result.status < 200 || result.status >= 300)
    throw new Error(result.data?.error || "요청을 처리하지 못했습니다.");
  return result.data as T;
}
