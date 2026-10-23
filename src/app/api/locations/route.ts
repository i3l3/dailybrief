import { apiError, HttpError } from "@/lib/http";
import { jsonFetch } from "@/lib/network";
export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2 || q.length > 100)
      throw new HttpError(400, "지역 이름을 2자 이상 입력해 주세요.");
    const data = await jsonFetch<{
      results?: {
        name: string;
        latitude: number;
        longitude: number;
        admin1?: string;
        country?: string;
      }[];
    }>(
      "https://geocoding-api.open-meteo.com/v1/search?" +
        new URLSearchParams({
          name: q,
          count: "10",
          language: "ko",
          format: "json",
        }),
    );
    return Response.json({
      locations: (data.results ?? []).map((x) => ({
        name: [x.name, x.admin1, x.country].filter(Boolean).join(", "),
        latitude: x.latitude,
        longitude: x.longitude,
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
