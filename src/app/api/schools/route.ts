import { apiError, HttpError } from "@/lib/http";
import { getSecret } from "@/lib/secrets";
import { jsonFetch } from "@/lib/network";
export async function GET(request: Request) {
  try {
    const name = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (name.length < 2 || name.length > 100)
      throw new HttpError(400, "학교 이름을 2자 이상 입력해 주세요.");
    const key = await getSecret("neisKey");
    const params = new URLSearchParams({
      Type: "json",
      SCHUL_NM: name,
      pSize: "30",
      ...(key ? { KEY: key } : {}),
    });
    const data = await jsonFetch<{
      schoolInfo?: [
        unknown,
        {
          row: {
            SCHUL_NM: string;
            ATPT_OFCDC_SC_CODE: string;
            SD_SCHUL_CODE: string;
            ORG_RDNMA: string;
          }[];
        },
      ];
      RESULT?: { CODE: string };
    }>("https://open.neis.go.kr/hub/schoolInfo?" + params);
    if (data.RESULT && data.RESULT.CODE !== "INFO-200")
      throw new HttpError(
        502,
        "학교 정보를 조회하지 못했습니다. NEIS API 키를 확인해 주세요.",
      );
    return Response.json({
      schools: (data.schoolInfo?.[1].row ?? []).map((s) => ({
        name: s.SCHUL_NM,
        office: s.ATPT_OFCDC_SC_CODE,
        code: s.SD_SCHUL_CODE,
        address: s.ORG_RDNMA,
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
