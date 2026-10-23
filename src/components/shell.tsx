"use client";
import Link from "next/link";
import {
  LayoutDashboard,
  Newspaper,
  Mail,
  ShieldCheck,
  Bookmark,
  Settings,
  ArrowUpRight,
  Command,
} from "lucide-react";
export function Shell({
  children,
  active = "all",
  onNavigate,
  demo = false,
  background = "forest",
  opacity = 82,
}: {
  children: React.ReactNode;
  active?: string;
  onNavigate?: (key: string) => void;
  demo?: boolean;
  background?: string;
  opacity?: number;
}) {
  const nav = [
    { key: "all", label: "대시보드", Icon: LayoutDashboard },
    { key: "news", label: "뉴스", Icon: Newspaper },
    { key: "mail", label: "메일", Icon: Mail },
    { key: "cve", label: "보안", Icon: ShieldCheck },
    { key: "saved", label: "저장한 소식", Icon: Bookmark },
  ];
  return (
    <div
      className={"app-shell theme-" + background}
      style={{ "--panel-alpha": opacity / 100 } as React.CSSProperties}
    >
      <aside className="sidebar">
        <Link
          href={demo ? "/demo" : "/"}
          className="brand-mark"
          aria-label="DailyBrief 홈"
        >
          d<span />
        </Link>
        <nav aria-label="주 메뉴">
          {nav.map(({ key, label, Icon }) =>
            onNavigate ? (
              <button
                key={key}
                className={"nav-icon " + (active === key ? "active" : "")}
                onClick={() => onNavigate(key)}
                aria-current={active === key ? "page" : undefined}
                aria-label={label}
                title={label}
              >
                <Icon size={21} />
                <span className="mobile-nav-label">{label}</span>
              </button>
            ) : (
              <Link
                key={key}
                className="nav-icon"
                href={"/?view=" + key}
                aria-label={label}
                title={label}
              >
                <Icon size={21} />
              </Link>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href={"/settings"}
            className={"nav-icon " + (active === "settings" ? "active" : "")}
            aria-label="설정"
            aria-current={active === "settings" ? "page" : undefined}
            title="설정"
          >
            <Settings size={21} />
          </Link>
          <span className="avatar" aria-label="개인 공간">
            나
          </span>
        </div>
      </aside>
      <main className="main-content">
        {demo && (
          <div className="demo-banner">
            <span>
              <strong>미리보기</strong> 모든 뉴스·메일·시세·급식은 화면 확인을
              위한 가상 데이터입니다.
            </span>
            <Link href="/">
              내 대시보드 시작하기 <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        {children}
        <footer className="app-footer">
          <span>
            <span className="status-dot" /> DailyBrief{" "}
            <span className="muted">나의 하루, 한눈에.</span>
          </span>
          <span>
            개인 공간 <Command size={12} /> <span>Asia/Seoul</span>
          </span>
        </footer>
      </main>
    </div>
  );
}
