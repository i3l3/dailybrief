import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-kr";
import "./globals.css";
export const metadata: Metadata = {
  title: "DailyBrief — 나의 하루, 한눈에",
  description: "뉴스, 메일, 날씨, 급식과 관심 종목을 모은 개인 브리핑",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
