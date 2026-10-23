export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function appUrl() {
  const url = process.env.APP_URL;
  if (!url) throw new HttpError(503, "서버의 APP_URL 설정이 필요합니다.");
  return new URL(url);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== appUrl().origin)
    throw new HttpError(403, "허용하지 않은 요청 출처입니다.");
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (
    error instanceof Error &&
    ["ZodError", "SyntaxError"].includes(error.name)
  )
    return Response.json(
      { error: "입력값 형식을 확인해 주세요." },
      { status: 400 },
    );
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return Response.json(
    { error: "처리하지 못했습니다. 연결 설정과 서버 상태를 확인해 주세요." },
    { status: 500 },
  );
}
