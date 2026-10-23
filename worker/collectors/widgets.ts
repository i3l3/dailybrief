import { getSettings, query } from "../../src/lib/db";
import { jsonFetch } from "../../src/lib/network";
import { getSecret } from "../../src/lib/secrets";
export async function cacheWidget(id: string, data: unknown) {
  await query(
    "INSERT INTO widget_cache(id,data,error) VALUES($1,$2,NULL) ON CONFLICT(id) DO UPDATE SET data=$2,updated_at=now(),error=NULL",
    [id, JSON.stringify(data)],
  );
}
export async function collectWeather() {
  const { location } = await getSettings();
  const data = await jsonFetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&forecast_days=1`,
  );
  await cacheWidget("weather", { ...data, location: location.name });
}
interface NeisResponse {
  mealServiceDietInfo?: [
    { head: unknown[] },
    {
      row: {
        MMEAL_SC_CODE: string;
        MMEAL_SC_NM: string;
        DDISH_NM: string;
        CAL_INFO: string;
      }[];
    },
  ];
  RESULT?: { CODE: string; MESSAGE: string };
}
export async function collectMeals() {
  const { school } = await getSettings();
  if (!school.code) {
    await cacheWidget("meals", { status: "unconfigured" });
    return;
  }
  const key = await getSecret("neisKey");
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" })
    .format(new Date())
    .replaceAll("-", "");
  const params = new URLSearchParams({
    Type: "json",
    ATPT_OFCDC_SC_CODE: school.office,
    SD_SCHUL_CODE: school.code,
    MLSV_YMD: date,
    pSize: "20",
    ...(key ? { KEY: key } : {}),
  });
  const response = await jsonFetch<NeisResponse>(
    "https://open.neis.go.kr/hub/mealServiceDietInfo?" + params,
  );
  if (response.RESULT && response.RESULT.CODE !== "INFO-200")
    throw new Error("NEIS unavailable");
  const meals = (response.mealServiceDietInfo?.[1]?.row ?? [])
    .filter((x) => ["2", "3"].includes(x.MMEAL_SC_CODE))
    .map((x) => ({
      type: x.MMEAL_SC_CODE === "2" ? "lunch" : "dinner",
      name: x.MMEAL_SC_NM,
      menu: x.DDISH_NM.split(/<br\s*\/?\s*>/i)
        .map((s) => s.trim())
        .filter(Boolean),
      calories: x.CAL_INFO,
    }));
  await cacheWidget("meals", { date, school: school.name, meals });
}
let kisToken: { token: string; expires: number } | undefined;
async function token() {
  if (kisToken && kisToken.expires > Date.now()) return kisToken.token;
  const appkey = await getSecret("kisKey"),
    appsecret = await getSecret("kisSecret");
  if (!appkey || !appsecret) throw new Error("KIS not configured");
  const response = await jsonFetch<{
    access_token: string;
    expires_in: number;
  }>("https://openapi.koreainvestment.com:9443/oauth2/tokenP", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey,
      appsecret,
    }),
  });
  kisToken = {
    token: response.access_token,
    expires: Date.now() + (response.expires_in - 120) * 1000,
  };
  return kisToken.token;
}
export async function collectStocks() {
  const { stocks } = await getSettings();
  if (!stocks.length) {
    await cacheWidget("stocks", { quotes: [] });
    return;
  }
  const appkey = await getSecret("kisKey"),
    appsecret = await getSecret("kisSecret"),
    access = await token();
  const quotes = [];
  for (const stock of stocks) {
    const domestic = stock.market === "KR";
    const path = domestic
      ? "/uapi/domestic-stock/v1/quotations/inquire-price"
      : "/uapi/overseas-price/v1/quotations/price";
    const params = new URLSearchParams(
      domestic
        ? { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: stock.symbol }
        : { AUTH: "", EXCD: stock.exchange || "NAS", SYMB: stock.symbol },
    );
    try {
      const response = await jsonFetch<{
        rt_cd: string;
        output: Record<string, string>;
      }>("https://openapi.koreainvestment.com:9443" + path + "?" + params, {
        headers: {
          authorization: "Bearer " + access,
          appkey,
          appsecret,
          tr_id: domestic ? "FHKST01010100" : "HHDFS00000300",
          custtype: "P",
        },
      });
      if (response.rt_cd !== "0") throw new Error("Quote unavailable");
      const o = response.output;
      const sign = ["4", "5"].includes(domestic ? o.prdy_vrss_sign : o.sign)
        ? -1
        : 1;
      quotes.push({
        ...stock,
        price: Number(domestic ? o.stck_prpr : o.last),
        change: sign * Math.abs(Number(domestic ? o.prdy_vrss : o.diff)),
        percent: sign * Math.abs(Number(domestic ? o.prdy_ctrt : o.rate)),
        currency: domestic ? "KRW" : "USD",
        asOf: new Date().toISOString(),
        timing: domestic ? "조회 시점" : "제공자 기준 · 지연 가능",
      });
    } catch {
      quotes.push({ ...stock, error: "시세를 가져오지 못했습니다." });
    }
  }
  await cacheWidget("stocks", { quotes });
}
