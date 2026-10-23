export async function api<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
  }
  return data as T;
}
export function dateLabel(
  value: string,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
) {
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    ...options,
  });
}
export function relative(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  return minutes < 1
    ? "방금"
    : minutes < 60
      ? `${minutes}분 전`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}시간 전`
        : `${Math.floor(minutes / 1440)}일 전`;
}
