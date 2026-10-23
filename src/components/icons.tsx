import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
} from "lucide-react";
export function WeatherIcon({
  code = 0,
  size = 64,
}: {
  code?: number;
  size?: number;
}) {
  const Icon =
    code === 0
      ? Sun
      : code < 3
        ? CloudSun
        : code < 49
          ? CloudFog
          : code < 70
            ? CloudRain
            : code < 80
              ? CloudSnow
              : code < 95
                ? CloudRain
                : CloudLightning;
  return <Icon size={size} strokeWidth={1.4} aria-hidden />;
}
export function weatherName(code: number) {
  return code === 0
    ? "맑음"
    : code < 3
      ? "구름 조금"
      : code < 49
        ? "흐림"
        : code < 70
          ? "비"
          : code < 80
            ? "눈"
            : code < 95
              ? "소나기"
              : "뇌우";
}
