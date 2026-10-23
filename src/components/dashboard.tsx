"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  Search,
  Bell,
  Plus,
  Sparkles,
  Bookmark,
  Check,
  ExternalLink,
  Mail,
  Newspaper,
  ShieldCheck,
  Code2,
  Utensils,
  MapPin,
  ChevronRight,
  Clock,
  Filter,
  X,
  LoaderCircle,
  AlertCircle,
  CloudSun,
} from "lucide-react";
import { Shell } from "./shell";
import { WeatherIcon, weatherName } from "./icons";
import { api, dateLabel, relative } from "@/lib/client";
import { demoData } from "@/lib/demo";
import { isNew, safeLink } from "@/lib/rules";
import type { DashboardData, Item, Kind, Widget } from "@/lib/types";
type Weather = {
  location: string;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};
type Meal = { type: string; name: string; menu: string[]; calories: string };
type Quote = {
  symbol: string;
  name: string;
  price?: number;
  percent?: number;
  change?: number;
  currency?: string;
  asOf?: string;
  timing?: string;
  error?: string;
};
export default function Dashboard({ demo = false }: { demo?: boolean }) {
  const [pageLimit, setPageLimit] = useState(30),
    [exhausted, setExhausted] = useState<string[]>([]);
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [view, setView] = useState("all"),
    [term, setTerm] = useState(""),
    [tag, setTag] = useState("전체"),
    [onlyNew, setOnlyNew] = useState(false),
    [account, setAccount] = useState("all"),
    [meal, setMeal] = useState("lunch"),
    [busy, setBusy] = useState(false),
    [alerts, setAlerts] = useState(false),
    [pending, setPending] = useState<string[]>([]);
  useEffect(() => {
    if (demo) {
      setData(demoData());
      return;
    }
    api<DashboardData>("/dashboard", { method: "POST", body: "{}" })
      .then(setData)
      .catch((e) => setError(e.message));
    const v = new URLSearchParams(location.search).get("view");
    if (v) setView(v);
  }, [demo]);
  const reload = useCallback(async () => {
    if (demo) return;
    const response = await api<{ items: Item[] }>("/dashboard");
    setData((old) =>
      old
        ? {
            ...old,
            items: [
              ...new Map(
                [...old.items, ...response.items].map((x) => [x.id, x]),
              ).values(),
            ],
          }
        : old,
    );
  }, [demo]);
  useEffect(() => {
    if (!pending.length) return;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const results = await Promise.all(
          pending.map((id) =>
            api<{ state: string }>("/jobs/" + id + "?queue=summarize"),
          ),
        );
        if (stopped) return;
        setPending(
          pending.filter(
            (_, i) =>
              !["completed", "failed", "cancelled"].includes(results[i].state),
          ),
        );
        await reload();
      } catch {
        if (!stopped) setPending([]);
      }
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [pending, reload]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function action(item: Item, what: string) {
    try {
      if (demo) {
        setData((old) =>
          old
            ? {
                ...old,
                items: old.items.map((i) =>
                  i.id === item.id
                    ? {
                        ...i,
                        ...(what === "save"
                          ? { saved: true }
                          : what === "unsave"
                            ? { saved: false }
                            : what === "read"
                              ? { read_at: new Date().toISOString() }
                              : what === "unread"
                                ? { read_at: null }
                                : {
                                    summary: "미리보기 요약입니다. " + i.body,
                                    summary_status: "done",
                                  }),
                      }
                    : i,
                ),
              }
            : old,
        );
        if (what === "summarize")
          setNotice(
            "미리보기 요약을 표시했습니다. 실제 AI 호출은 하지 않았습니다.",
          );
        return;
      }
      const response = await api<{ jobId?: string }>("/items/" + item.id, {
        method: "PATCH",
        body: JSON.stringify({ action: what }),
      });
      if (what === "summarize") {
        if (response.jobId) {
          setPending((old) => [...old, response.jobId!]);
          setNotice("요약을 요청했습니다. 완료되면 자동으로 표시합니다.");
        } else {
          setNotice("이 항목의 요약 작업이 이미 대기 중입니다.");
        }
      } else
        setData((old) =>
          old
            ? {
                ...old,
                items: old.items.map((i) =>
                  i.id === item.id
                    ? {
                        ...i,
                        ...(what === "save"
                          ? { saved: true }
                          : what === "unsave"
                            ? { saved: false }
                            : what === "read"
                              ? { read_at: new Date().toISOString() }
                              : { read_at: null }),
                      }
                    : i,
                ),
              }
            : old,
        );
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function refresh() {
    if (demo) {
      setNotice("미리보기입니다. 실제 연동 후 새 소식을 수집할 수 있습니다.");
      return;
    }
    setBusy(true);
    try {
      const response = await api<{ jobs: { jobId: string | null }[] }>(
        "/refresh",
        { method: "POST", body: "{}" },
      );
      setNotice("새 소식을 수집하고 있습니다.");
      const ids = response.jobs.map((j) => j.jobId).filter(Boolean) as string[];
      let attempts = 0;
      while (ids.length && attempts++ < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const states = await Promise.all(
          ids.map((id) => api<{ state: string }>("/jobs/" + id)),
        );
        if (
          states.every((j) =>
            ["completed", "failed", "cancelled"].includes(j.state),
          )
        )
          break;
      }
      await reload();
      const snapshots = await api<{
        widgets: DashboardData["widgets"];
        collectors: DashboardData["collectors"];
        accounts: DashboardData["accounts"];
      }>("/status");
      setData((old) => (old ? { ...old, ...snapshots } : old));
      setNotice("수집 상태를 갱신했습니다.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function older(kind: Kind) {
    if (demo) {
      setPageLimit((n) => n + 30);
      return;
    }
    setBusy(true);
    try {
      const known = data?.items.filter((i) => i.kind === kind) ?? [];
      const oldest = known.map((i) => i.published_at).sort()[0];
      const response = await api<{ items: Item[] }>(
        "/dashboard?kind=" +
          kind +
          (oldest ? "&before=" + encodeURIComponent(oldest) : ""),
      );
      setData((old) =>
        old
          ? {
              ...old,
              items: [
                ...new Map(
                  [...old.items, ...response.items].map((i) => [i.id, i]),
                ).values(),
              ],
            }
          : old,
      );
      if (response.items.length < 80) setExhausted((old) => [...old, kind]);
      setPageLimit((n) => n + 30);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const allItems = data?.items ?? [];
  const filtered = useMemo(
    () =>
      allItems
        .filter(
          (i) =>
            (!onlyNew || isNew(i.first_seen_at, data!.baseline)) &&
            (tag === "전체" || i.matched.includes(tag)) &&
            (!term ||
              (
                i.title +
                " " +
                i.body +
                " " +
                i.source +
                " " +
                String(i.metadata.from ?? "")
              )
                .toLowerCase()
                .includes(term.toLowerCase())) &&
            (view !== "saved" || i.saved) &&
            (view === "all" || view === "saved" || i.kind === view) &&
            (i.kind !== "mail" ||
              account === "all" ||
              i.account_id === account),
        )
        .sort(
          (a, b) =>
            Number(b.kind !== "mail" && !!b.matched.length) -
              Number(a.kind !== "mail" && !!a.matched.length) ||
            +new Date(b.published_at) - +new Date(a.published_at),
        ),
    [allItems, onlyNew, tag, term, view, account, data],
  );
  const counts = {
    news: allItems.filter(
      (i) => i.kind === "news" && isNew(i.first_seen_at, data?.baseline ?? ""),
    ).length,
    mail: allItems.filter(
      (i) => i.kind === "mail" && isNew(i.first_seen_at, data?.baseline ?? ""),
    ).length,
    cve: allItems.filter(
      (i) => i.kind === "cve" && isNew(i.first_seen_at, data?.baseline ?? ""),
    ).length,
  };
  const weather = data?.widgets.weather?.data as Weather | undefined;
  const meals = data?.widgets.meals?.data as
    { school?: string; meals?: Meal[] } | undefined;
  const quotes =
    (data?.widgets.stocks?.data as { quotes?: Quote[] } | undefined)?.quotes ??
    [];
  const failures = data?.collectors.filter((c) => c.error) ?? [];
  function empty(text: string) {
    return (
      <div className="empty-state">
        <Plus size={22} />
        <p>{text}</p>
        <Link href={"/settings"}>
          연동 설정하기 <ArrowRight size={14} />
        </Link>
      </div>
    );
  }
  function stamp(id: string) {
    const cache = data?.widgets[id];
    return (
      <div className={"widget-stamp " + (cache?.error ? "warning" : "")}>
        <Clock size={11} />
        {cache?.error ??
          (cache
            ? dateLabel(cache.updated_at) + " 기준"
            : "아직 수집하지 않았습니다")}
      </div>
    );
  }
  function itemActions(item: Item) {
    return (
      <div className="item-actions">
        <button
          className={"icon-button " + (item.saved ? "selected" : "")}
          onClick={() => action(item, item.saved ? "unsave" : "save")}
          aria-label={item.saved ? "저장 취소" : "소식 저장"}
          aria-pressed={item.saved}
          title={item.saved ? "저장 취소" : "소식 저장"}
        >
          <Bookmark size={16} fill={item.saved ? "currentColor" : "none"} />
        </button>
        <button
          className={"icon-button " + (item.read_at ? "selected" : "")}
          onClick={() => action(item, item.read_at ? "unread" : "read")}
          aria-label={item.read_at ? "읽지 않음으로 표시" : "읽음으로 표시"}
          aria-pressed={!!item.read_at}
          title={item.read_at ? "읽지 않음으로 표시" : "읽음으로 표시"}
        >
          <Check size={17} />
        </button>
      </div>
    );
  }
  function article(item: Item, index: number) {
    return (
      <article
        key={item.id}
        className={
          "article " +
          (index === 0 && item.kind === "news" ? "featured " : "") +
          (item.read_at ? "was-read" : "")
        }
      >
        <div className="article-meta">
          <span className={"source-dot " + item.kind} />
          <span>{item.source}</span>
          <span>·</span>
          <span>{relative(item.published_at)}</span>
          {isNew(item.first_seen_at, data!.baseline) && (
            <span className="new-label">NEW</span>
          )}
          {itemActions(item)}
        </div>
        <h3>
          {safeLink(item.url) ? (
            <a
              href={safeLink(item.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.title}
              <ArrowUpRight size={15} />
            </a>
          ) : (
            item.title
          )}
        </h3>
        {item.kind === "mail" && (
          <div className="mail-from">{String(item.metadata.from ?? "")}</div>
        )}
        {item.kind === "cve" && (
          <div className="cve-score">
            <span
              className={
                "severity " +
                String(item.metadata.severity ?? "UNRATED").toLowerCase()
              }
            >
              {String(item.metadata.severity ?? "UNRATED")}
            </span>
            <strong>
              {item.metadata.score == null
                ? "미평가"
                : "CVSS " + item.metadata.score}
            </strong>
          </div>
        )}
        {item.summary ? (
          <p className="article-summary">{item.summary}</p>
        ) : (
          <p className="article-excerpt">
            {item.body || "본문이 없습니다. 원문에서 내용을 확인하세요."}
          </p>
        )}
        <div className="article-bottom">
          <div className="tags">
            {item.matched.map((t) => (
              <button key={t} className="tag" onClick={() => setTag(t)}>
                #{t}
              </button>
            ))}
          </div>
          <button
            className="summary-button"
            onClick={() => action(item, "summarize")}
            disabled={item.summary_status === "running"}
          >
            <Sparkles size={12} />
            {item.summary
              ? "다시 요약"
              : item.summary_status === "running"
                ? "요약 중"
                : item.summary_status === "limited"
                  ? "한도 도달 · 직접 요약"
                  : "요약하기"}
          </button>
        </div>
        {item.summary && (
          <div className="summary-caption">
            <Sparkles size={10} />
            {demo
              ? "예시 요약"
              : item.metadata.contentScope === "feed"
                ? "피드 본문 기반 AI 요약"
                : "AI 요약"}{" "}
            · 원문 확인 권장
          </div>
        )}
        {item.summary_status === "failed" && (
          <p className="warning small">
            요약에 실패했습니다. 다시 요청할 수 있습니다.
          </p>
        )}
        {item.summary_status === "unconfigured" && (
          <p className="warning small">
            AI 제공자·모델·키를 설정하면 요약할 수 있습니다.
          </p>
        )}
      </article>
    );
  }
  function section(
    kind: Kind,
    title: string,
    description: string,
    Icon: typeof Mail,
  ) {
    const list = filtered.filter((i) => i.kind === kind);
    const limit =
      view === "all"
        ? kind === "news"
          ? 4
          : kind === "mail"
            ? 3
            : 3
        : pageLimit;
    return (
      <section className={"panel feed-panel panel-" + kind} key={kind}>
        <div className="panel-header">
          <div className="panel-title">
            <Icon size={18} />
            <h2>{title}</h2>
            <span className="count">{list.length}</span>
          </div>
          <button
            className="icon-button"
            aria-label={title + " 전체 보기"}
            title="전체 보기"
            onClick={() => setView(kind)}
          >
            <ArrowUpRight size={17} />
          </button>
        </div>
        {kind === "mail" && (
          <div className="account-tabs">
            <button
              onClick={() => setAccount("all")}
              className={account === "all" ? "active" : ""}
              aria-pressed={account === "all"}
            >
              전체 계정
            </button>
            {data?.accounts.map((a) => (
              <button
                key={a.id}
                className={account === a.id ? "active" : ""}
                aria-pressed={account === a.id}
                onClick={() => setAccount(a.id)}
              >
                {a.label}
                <span
                  className={
                    "mini-dot " + (a.status === "error" ? "failed" : "")
                  }
                />
              </button>
            ))}
          </div>
        )}
        <p className="panel-description">{description}</p>
        <div className="article-list">
          {list.length
            ? list.slice(0, limit).map(article)
            : empty(
                term || onlyNew || tag !== "전체"
                  ? "조건에 맞는 소식이 없습니다. 필터를 바꿔 보세요."
                  : kind === "mail"
                    ? "메일 계정을 연결하면 새 메일을 모아 보여드려요."
                    : kind === "news"
                      ? "관심사와 뉴스 피드를 설정해 보세요."
                      : kind === "cve"
                        ? "관심 제품·벤더·키워드를 등록해 보세요."
                        : "수집이 완료되면 GeekNews 소식을 보여드려요.",
              )}
        </div>
        {(list.length > limit ||
          (view === kind && !demo && !exhausted.includes(kind))) && (
          <button
            className="panel-more"
            disabled={busy}
            onClick={() => {
              if (view !== kind) setView(kind);
              else if (list.length > limit) setPageLimit((n) => n + 30);
              else void older(kind);
            }}
          >
            소식 더 보기 <ArrowRight size={14} />
          </button>
        )}
      </section>
    );
  }
  const widgets: Record<Widget, () => React.ReactNode> = {
    weather: () => (
      <section className="panel weather-panel" key="weather">
        <div className="panel-header">
          <div className="panel-title">
            <CloudSun size={18} />
            <h2>오늘의 날씨</h2>
          </div>
          <span className="location">
            <MapPin size={12} />
            {weather?.location ?? data?.settings.location.name}
          </span>
        </div>
        {weather?.current ? (
          <>
            <div className="weather-reading">
              <div>
                <strong>
                  {Math.round(weather.current.temperature_2m)}
                  <span>°</span>
                </strong>
                <p>
                  {weatherName(weather.current.weather_code)}{" "}
                  <span>
                    · 체감 {Math.round(weather.current.apparent_temperature)}°
                  </span>
                </p>
              </div>
              <div className="weather-symbol">
                <WeatherIcon code={weather.current.weather_code} size={78} />
              </div>
            </div>
            <div className="weather-facts">
              <span>
                최저 <b>{Math.round(weather.daily.temperature_2m_min[0])}°</b>{" "}
                <span className="muted">/</span> 최고{" "}
                <b>{Math.round(weather.daily.temperature_2m_max[0])}°</b>
              </span>
              <span>
                강수 <b>{weather.daily.precipitation_probability_max[0]}%</b>
              </span>
              <span>
                습도 <b>{weather.current.relative_humidity_2m}%</b>
              </span>
            </div>
          </>
        ) : (
          empty("지역을 선택하면 오늘 날씨를 보여드려요.")
        )}
        {stamp("weather")}
      </section>
    ),
    meals: () => (
      <section className="panel meal-panel" key="meals">
        <div className="panel-header">
          <div className="panel-title">
            <Utensils size={17} />
            <h2>오늘의 급식</h2>
          </div>
          <div className="segmented">
            <button
              onClick={() => setMeal("lunch")}
              className={meal === "lunch" ? "active" : ""}
              aria-pressed={meal === "lunch"}
            >
              중식
            </button>
            <button
              onClick={() => setMeal("dinner")}
              className={meal === "dinner" ? "active" : ""}
              aria-pressed={meal === "dinner"}
            >
              석식
            </button>
          </div>
        </div>
        {data?.settings.school.name || meals?.school ? (
          <>
            <div className="school-name">
              {meals?.school ?? data?.settings.school.name}
              <span>
                {meals?.meals?.find((m) => m.type === meal)?.calories}
              </span>
            </div>
            <div className="meal-menu">
              {meals?.meals
                ?.find((m) => m.type === meal)
                ?.menu.map((m, i) => (
                  <span key={i} className={i < 2 ? "meal-main" : ""}>
                    {m}
                  </span>
                )) ?? (
                <p className="muted">
                  {data?.widgets.meals
                    ? "이 날짜의 메뉴가 제공되지 않았습니다."
                    : "급식 정보를 수집하고 있습니다."}
                </p>
              )}
            </div>
          </>
        ) : (
          empty("학교를 검색하고 중식·석식 메뉴를 확인하세요.")
        )}
        {stamp("meals")}
      </section>
    ),
    stocks: () => (
      <section className="panel stocks-panel" key="stocks">
        <div className="panel-header">
          <div className="panel-title">
            <ArrowUpRight size={18} />
            <h2>관심 종목</h2>
          </div>
          <Link
            className="icon-button"
            aria-label="관심 종목 편집"
            href={"/settings?tab=stocks"}
          >
            <Plus size={17} />
          </Link>
        </div>
        {quotes.length ? (
          <div className="quote-list">
            {quotes.map((q) => (
              <div className="quote" key={q.symbol}>
                <div>
                  <strong>{q.name}</strong>
                  <span>
                    {q.symbol} <span>· {q.currency ?? ""}</span>
                  </span>
                </div>
                <div className="quote-number">
                  {q.error ? (
                    <span className="warning">조회 실패</span>
                  ) : (
                    <>
                      <strong>
                        {q.price?.toLocaleString("ko-KR", {
                          minimumFractionDigits: q.currency === "USD" ? 2 : 0,
                        })}
                      </strong>
                      <span className={(q.percent ?? 0) >= 0 ? "up" : "down"}>
                        {(q.percent ?? 0) >= 0 ? (
                          <ArrowUpRight size={13} />
                        ) : (
                          <ArrowDownRight size={13} />
                        )}{" "}
                        {Math.abs(q.percent ?? 0).toFixed(2)}%{" "}
                        <span>
                          ({(q.change ?? 0) > 0 ? "+" : ""}
                          {q.change})
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          empty("한국·미국 관심 종목을 추가해 보세요.")
        )}
        <div className="widget-stamp">
          <Clock size={11} />
          {quotes.length
            ? `${quotes[0].asOf ? dateLabel(quotes[0].asOf) : "—"} 조회 · 전일 대비 · ${quotes.some((q) => q.currency === "USD") ? "해외 지연 가능" : "제공자 기준"}`
            : "KIS API 연결 후 시세를 표시합니다."}
        </div>
      </section>
    ),
    news: () =>
      section(
        "news",
        "나를 위한 뉴스",
        "관심사와 맞닿은 이야기부터 모았어요.",
        Newspaper,
      ),
    mail: () =>
      section("mail", "받은 메일", "여러 계정의 새 메일을 한곳에서.", Mail),
    geek: () =>
      section(
        "geek",
        "GeekNews",
        "개발자가 놓치기 아쉬운 이야기. 요약은 필요할 때만.",
        Code2,
      ),
    cve: () =>
      section(
        "cve",
        "보안 소식",
        "관심 제품·키워드와 일치하는 CVE. 요약은 버튼으로.",
        ShieldCheck,
      ),
  };
  const now = new Date();
  const hour = Number(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Seoul",
      hour: "numeric",
      hour12: false,
    }),
  );
  return (
    <Shell
      demo={demo}
      active={view}
      onNavigate={(v) => {
        setView(v);
        setTag("전체");
        setOnlyNew(false);
        setTerm("");
      }}
      background={data?.settings.appearance.background}
      opacity={data?.settings.appearance.opacity}
    >
      <header className="topbar">
        <Link className="wordmark" href={demo ? "/demo" : "/"}>
          dailybrief<span className="wordmark-dot">.</span>
        </Link>
        <div className="topbar-actions">
          <span className="private-label">
            <span className="status-dot" /> MY PRIVATE SPACE
          </span>
          <button
            className={"icon-button " + (alerts ? "selected" : "")}
            aria-label="연동 상태 확인"
            aria-expanded={alerts}
            onClick={() => setAlerts(!alerts)}
          >
            <Bell size={19} />
            {failures.length > 0 && <span className="notification-dot" />}
          </button>
          <Link className="profile-button" href={"/settings"}>
            나
          </Link>
        </div>
      </header>
      {alerts && (
        <div className="status-panel">
          <strong>연동 상태</strong>
          {data?.collectors.length ? (
            data.collectors.map((c) => (
              <p key={c.id} className={c.error ? "warning" : "muted"}>
                {c.id} ·{" "}
                {c.error ??
                  (c.last_success
                    ? "최근 갱신 " + dateLabel(c.last_success)
                    : "수집 대기")}
              </p>
            ))
          ) : (
            <p className="muted">아직 연동된 수집 내역이 없습니다.</p>
          )}
        </div>
      )}
      <div className="greeting-row">
        <div>
          <h1>
            {view === "saved"
              ? "다시 보고 싶은 이야기."
              : view === "mail"
                ? "나에게 도착한 이야기."
                : view === "cve"
                  ? "살펴봐야 할 보안 소식."
                  : view === "news"
                    ? "지금, 나의 관심사."
                    : hour < 12
                      ? "좋은 아침이에요."
                      : hour < 18
                        ? "오늘도, 반가워요."
                        : "하루를 돌아볼 시간이에요."}
          </h1>
          <p className="today-date">
            {now.toLocaleDateString("ko-KR", {
              timeZone: "Asia/Seoul",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
          <p className="greeting-sub">
            {data ? (
              <>
                <span>
                  {dateLabel(data.baseline, {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>{" "}
                이후 <b>뉴스 {counts.news}개</b>, <b>메일 {counts.mail}통</b>
                {counts.cve > 0 ? <>, 보안 소식 {counts.cve}개가</> : <>이</>}
                도착했어요.
              </>
            ) : (
              "나에게 필요한 소식을 불러오고 있어요."
            )}
          </p>
        </div>
        <button
          className="secondary-button refresh-button"
          onClick={refresh}
          disabled={busy || !data}
        >
          <RefreshCw size={15} className={busy ? "spin" : ""} />
          {busy ? "수집 중" : "새로고침"}
        </button>
      </div>
      {error && (
        <div role="alert" className="error-box">
          <AlertCircle size={18} />
          {error}
          <button className="text-link" onClick={() => location.reload()}>
            다시 시도
          </button>
        </div>
      )}
      {!data && !error ? (
        <div className="skeleton-grid" aria-label="대시보드 불러오는 중">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton wide" />
        </div>
      ) : (
        data && (
          <>
            {view === "all" && !term && (
              <div className="overview-grid">
                {data.settings.appearance.order
                  .filter(
                    (w) =>
                      ["weather", "meals", "stocks"].includes(w) &&
                      !data.settings.appearance.hidden.includes(w),
                  )
                  .map((w) => widgets[w]())}
              </div>
            )}
            <div className="feed-toolbar">
              <div className="filter-tabs" aria-label="관심사 필터">
                {["전체", ...data.settings.interests.map((i) => i.name)].map(
                  (t) => (
                    <button
                      key={t}
                      className={tag === t ? "active" : ""}
                      aria-pressed={tag === t}
                      onClick={() => setTag(t)}
                    >
                      {t === "전체" ? <Filter size={13} /> : null}
                      {t}
                    </button>
                  ),
                )}
                <Link
                  href={"/settings?tab=interests"}
                  title="관심사 설정"
                  aria-label="관심사 추가"
                >
                  <Plus size={15} />
                </Link>
              </div>
              <div className="feed-tools">
                <label className="new-toggle">
                  <input
                    type="checkbox"
                    checked={onlyNew}
                    onChange={(e) => setOnlyNew(e.target.checked)}
                  />
                  <span />새 소식만
                </label>
                <div className="search-field">
                  <Search size={15} />
                  <input
                    aria-label="소식 검색"
                    placeholder="소식 검색"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  />
                  {term && (
                    <button
                      onClick={() => setTerm("")}
                      aria-label="검색 지우기"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div
              className={
                "content-grid " + (view !== "all" ? "single-view" : "")
              }
            >
              {view === "all" ? (
                [["geek", "news"], ["mail", "cve"]].map((column, index) => {
                  const visible = data.settings.appearance.order.filter(
                    (w) => column.includes(w) && !data.settings.appearance.hidden.includes(w),
                  );
                  return visible.length > 0 ? (
                    <div className="feed-column" key={index}>
                      {visible.map((w) => widgets[w]())}
                    </div>
                  ) : null;
                })
              ) : data.settings.appearance.order
                .filter(
                  (w) =>
                    ["news", "mail", "geek", "cve"].includes(w) &&
                    (!data.settings.appearance.hidden.includes(w) ||
                      view === w) &&
                    (["all", "saved"].includes(view) || view === w),
                )
                .map((w) => widgets[w]())}
            </div>
            {data.settings.appearance.hidden.length === 7 && (
              <div className="empty-state">
                모든 위젯이 숨겨져 있습니다.
                <Link href="/settings?tab=appearance">위젯 표시 설정</Link>
              </div>
            )}
          </>
        )
      )}
      {notice && (
        <div role="status" className="toast">
          <Check size={16} />
          {notice}
          <button onClick={() => setNotice("")} aria-label="알림 닫기">
            <X size={15} />
          </button>
        </div>
      )}
    </Shell>
  );
}
