"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Save,
  Search,
  Trash2,
  ExternalLink,
  Mail,
  SlidersHorizontal,
  Newspaper,
  Sparkles,
  Palette,
  MapPin,
  ShieldCheck,
  ArrowUpRight,
  LoaderCircle,
} from "lucide-react";
import { Shell } from "./shell";
import { api, dateLabel } from "@/lib/client";
import {
  defaults,
  type Settings,
  type Account,
  type Widget,
} from "@/lib/types";
const tabs = [
  ["general", "기본 설정", SlidersHorizontal],
  ["interests", "관심사·보안", ShieldCheck],
  ["feeds", "뉴스 소스", Newspaper],
  ["accounts", "메일 계정", Mail],
  ["stocks", "관심 종목", ArrowUpRight],
  ["ai", "AI 요약", Sparkles],
  ["appearance", "화면 구성", Palette],
] as const;
const widgetNames: Record<Widget, string> = {
  weather: "날씨",
  meals: "급식",
  stocks: "관심 종목",
  news: "뉴스",
  mail: "메일",
  geek: "GeekNews",
  cve: "CVE",
};
const words = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(structuredClone(defaults)),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState("general"),
    [accounts, setAccounts] = useState<Account[]>([]),
    [secrets, setSecrets] = useState<Record<string, string>>({}),
    [configured, setConfigured] = useState<string[]>([]),
    [google, setGoogle] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [schoolQuery, setSchoolQuery] = useState(""),
    [schools, setSchools] = useState<
      (Settings["school"] & { address: string })[]
    >([]),
    [locationQuery, setLocationQuery] = useState(""),
    [locations, setLocations] = useState<Settings["location"][]>([]),
    [searchBusy, setSearchBusy] = useState(""),
    [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([
      api<{ settings: Settings; secrets: string[]; googleConfigured: boolean }>(
        "/settings",
      ),
      api<{ accounts: Account[] }>("/accounts"),
    ])
      .then(([s, a]) => {
        setSettings(s.settings);
        setConfigured(s.secrets);
        setGoogle(s.googleConfigured);
        setAccounts(a.accounts);
        setReady(true);
      })
      .catch((e) => setError(e.message));
    const params = new URLSearchParams(location.search);
    const initial = params.get("tab");
    if (initial && tabs.some((t) => t[0] === initial)) setTab(initial);
    if (params.has("error"))
      setError(
        "Gmail 연결을 완료하지 못했습니다. OAuth 설정과 동의 화면을 확인해 주세요.",
      );
    if (params.has("connected")) {
      setTab("accounts");
      setNotice("Gmail 계정을 연결했습니다. 새 메일을 수집하고 있습니다.");
    }
  }, []);
  useEffect(() => {
    function prevent(e: BeforeUnloadEvent) {
      if (dirty) e.preventDefault();
    }
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setDirty(true);
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api("/settings", {
        method: "PUT",
        body: JSON.stringify({ settings, secrets }),
      });
      setConfigured([
        ...new Set([
          ...configured,
          ...Object.entries(secrets)
            .filter(([, v]) => v)
            .map(([k]) => k),
        ]),
      ]);
      setSecrets({});
      setDirty(false);
      setNotice("설정을 저장했습니다. 연결된 데이터를 새로 수집합니다.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function accountSave(a: Account) {
    try {
      await api("/accounts/" + a.id, {
        method: "PATCH",
        body: JSON.stringify({
          auto_summary: a.auto_summary,
          excluded_senders: a.excluded_senders,
          excluded_folders: a.excluded_folders,
        }),
      });
      setNotice("메일 계정 설정을 저장했습니다.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function secretField(name: string, label: string) {
    return (
      <label key={name}>
        {label}
        <input
          type="password"
          autoComplete="new-password"
          value={secrets[name] ?? ""}
          placeholder={
            configured.includes(name)
              ? "설정됨 · 변경할 때만 입력"
              : "서버에 암호화하여 저장합니다"
          }
          onChange={(e) => {
            setSecrets({ ...secrets, [name]: e.target.value });
            setDirty(true);
          }}
        />
        <span className="field-help">
          {configured.includes(name)
            ? "키가 저장되어 있습니다. 빈칸으로 저장하면 유지됩니다."
            : "연동에 필요한 키를 입력해 주세요."}
        </span>
      </label>
    );
  }
  return (
    <Shell
      active="settings"
      background={settings.appearance.background}
      opacity={settings.appearance.opacity}
    >
      <header className="topbar">
        <Link className="wordmark" href="/">
          dailybrief<span className="wordmark-dot">.</span>
        </Link>
        <Link className="text-link" href="/">
          <ArrowLeft size={15} /> 대시보드로
        </Link>
      </header>
      <div className="greeting-row">
        <div>
          <h1>내 하루에 맞게.</h1>
          <p className="greeting-sub">
            관심사부터 연결할 계정까지, 나만의 브리핑을 구성하세요.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={save}
          disabled={busy || !ready || !dirty}
        >
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Save size={16} />
          )}{" "}
          {busy ? "저장 중" : "변경 사항 저장"}
          {dirty && <span className="unsaved-dot" />}
        </button>
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
          <button className="text-link" onClick={() => setError("")}>
            닫기
          </button>
        </div>
      )}
      {notice && (
        <div className="success-box" role="status">
          <Check size={16} />
          {notice}
          <button className="text-link" onClick={() => setNotice("")}>
            닫기
          </button>
        </div>
      )}
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="설정 메뉴">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              <Icon size={17} />
              {label}
              <ChevronDown size={13} />
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {!ready ? (
            <div className="skeleton" />
          ) : (
            <>
              {tab === "general" && (
                <>
                  <SettingsSection
                    title="날씨 지역"
                    description="서울을 기본으로 표시합니다. 도시를 검색하거나 좌표를 직접 지정할 수 있어요."
                  >
                    <div className="search-row">
                      <input
                        aria-label="지역 검색"
                        placeholder="도시 이름 (서울, Busan 등)"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                      />
                      <button
                        className="secondary-button"
                        disabled={
                          searchBusy === "location" || locationQuery.length < 2
                        }
                        onClick={async () => {
                          setSearchBusy("location");
                          try {
                            const r = await api<{
                              locations: Settings["location"][];
                            }>(
                              "/locations?q=" +
                                encodeURIComponent(locationQuery),
                            );
                            setLocations(r.locations);
                            if (!r.locations.length)
                              setNotice(
                                "지역 검색 결과가 없습니다. 좌표를 직접 입력할 수 있습니다.",
                              );
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setSearchBusy("");
                          }
                        }}
                      >
                        <Search size={15} /> 검색
                      </button>
                    </div>
                    {locations.length > 0 && (
                      <div className="search-results">
                        {locations.map((l, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              update("location", l);
                              setLocations([]);
                            }}
                          >
                            <MapPin size={15} />
                            {l.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="form-grid">
                      <label>
                        지역 표시 이름
                        <input
                          value={settings.location.name}
                          onChange={(e) =>
                            update("location", {
                              ...settings.location,
                              name: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        위도
                        <input
                          type="number"
                          step="any"
                          min={-90}
                          max={90}
                          value={settings.location.latitude}
                          onChange={(e) =>
                            update("location", {
                              ...settings.location,
                              latitude: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        경도
                        <input
                          type="number"
                          step="any"
                          min={-180}
                          max={180}
                          value={settings.location.longitude}
                          onChange={(e) =>
                            update("location", {
                              ...settings.location,
                              longitude: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  </SettingsSection>
                  <SettingsSection
                    title="학교 급식"
                    description="학교 이름으로 검색한 뒤 주소를 확인해 선택하세요. 중식·석식을 구분해 가져옵니다."
                  >
                    {secretField("neisKey", "NEIS API 키")}
                    <div className="field-help">
                      키를 입력했다면 먼저 저장한 후 검색하세요. 키 없는 조회는
                      제공자 제한을 받을 수 있습니다.
                    </div>
                    <div className="search-row">
                      <input
                        aria-label="학교 검색"
                        placeholder="학교 이름을 2자 이상 입력"
                        value={schoolQuery}
                        onChange={(e) => setSchoolQuery(e.target.value)}
                      />
                      <button
                        className="secondary-button"
                        disabled={
                          schoolQuery.length < 2 || searchBusy === "school"
                        }
                        onClick={async () => {
                          setSearchBusy("school");
                          try {
                            const r = await api<{
                              schools: (Settings["school"] & {
                                address: string;
                              })[];
                            }>("/schools?q=" + encodeURIComponent(schoolQuery));
                            setSchools(r.schools);
                            if (!r.schools.length)
                              setNotice(
                                "학교 검색 결과가 없습니다. 이름을 확인해 주세요.",
                              );
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setSearchBusy("");
                          }
                        }}
                      >
                        <Search size={15} /> 검색
                      </button>
                    </div>
                    <div className="search-results">
                      {schools.map((s) => (
                        <button
                          key={s.code}
                          onClick={() => {
                            update("school", {
                              name: s.name,
                              office: s.office,
                              code: s.code,
                            });
                            setSchools([]);
                          }}
                        >
                          <strong>{s.name}</strong>
                          <span>{s.address}</span>
                        </button>
                      ))}
                    </div>
                    {settings.school.code && (
                      <div className="selected-school">
                        <Check size={17} />
                        <strong>{settings.school.name}</strong>
                        <span>
                          {settings.school.office} · {settings.school.code}
                        </span>
                        <button
                          className="icon-button"
                          aria-label="학교 선택 해제"
                          onClick={() =>
                            update("school", { name: "", office: "", code: "" })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </SettingsSection>
                </>
              )}
              {tab === "interests" && (
                <>
                  <SettingsSection
                    title="내 관심사"
                    description="키워드는 쉼표로 구분하세요. 제목과 본문에서 일치하면 관심 뉴스로 분류합니다. 제외어가 있으면 그 관심사에서는 제외합니다."
                  >
                    {settings.interests.map((interest, index) => (
                      <div key={index} className="editor-row">
                        <div className="form-grid">
                          <label>
                            태그 이름
                            <input
                              value={interest.name}
                              onChange={(e) =>
                                update(
                                  "interests",
                                  settings.interests.map((v, i) =>
                                    i === index
                                      ? { ...v, name: e.target.value }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label>
                            키워드
                            <CommaInput
                              value={interest.keywords.join(", ")}
                              onChange={(value) =>
                                update(
                                  "interests",
                                  settings.interests.map((v, i) =>
                                    i === index
                                      ? { ...v, keywords: words(value) }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label>
                            제외어
                            <CommaInput
                              value={interest.exclude.join(", ")}
                              onChange={(value) =>
                                update(
                                  "interests",
                                  settings.interests.map((v, i) =>
                                    i === index
                                      ? { ...v, exclude: words(value) }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </label>
                        </div>
                        <button
                          className="icon-button danger"
                          aria-label={interest.name + " 관심사 삭제"}
                          onClick={() =>
                            update(
                              "interests",
                              settings.interests.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="secondary-button"
                      onClick={() =>
                        update("interests", [
                          ...settings.interests,
                          { name: "새 관심사", keywords: [], exclude: [] },
                        ])
                      }
                    >
                      <Plus size={15} /> 관심사 추가
                    </button>
                  </SettingsSection>
                  <SettingsSection
                    title="CVE 모니터링"
                    description="등록한 조건 중 하나라도 맞는 보고서를 표시합니다. 키워드 매칭은 실제 사용 버전이 취약하다는 확정이 아닙니다."
                  >
                    {(["tags", "vendors", "products", "cpes"] as const).map(
                      (key, index) => (
                        <label key={key}>
                          {
                            ["키워드·분야", "벤더", "제품 이름", "CPE 식별자"][
                              index
                            ]
                          }
                          <CommaInput
                            value={settings.cve[key].join(", ")}
                            placeholder={
                              [
                                "container, linux, 보안",
                                "microsoft, apache",
                                "nginx, openssl, kubernetes",
                                "cpe:2.3:a:...",
                              ][index]
                            }
                            onChange={(value) =>
                              update("cve", {
                                ...settings.cve,
                                [key]: words(value),
                              })
                            }
                          />
                        </label>
                      ),
                    )}
                    {secretField("nvdKey", "NVD API 키 (선택)")}
                    <p className="field-help">
                      CVE·GeekNews의 분류는 AI를 사용하지 않습니다. 요약 버튼을
                      누른 항목만 AI에 전송합니다.
                    </p>
                  </SettingsSection>
                </>
              )}
              {tab === "feeds" && (
                <SettingsSection
                  title="뉴스 소스"
                  description="RSS·Atom 피드를 등록하세요. 관심 뉴스는 먼저 보여주고 자동 요약하며, 나머지 뉴스도 함께 모아둡니다."
                >
                  {settings.feeds.map((feed, index) => (
                    <div className="editor-row" key={feed.id}>
                      <div className="form-grid feed-form">
                        <label>
                          소스 이름
                          <input
                            value={feed.name}
                            onChange={(e) =>
                              update(
                                "feeds",
                                settings.feeds.map((v, i) =>
                                  i === index
                                    ? { ...v, name: e.target.value }
                                    : v,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          RSS·Atom 주소
                          <input
                            type="url"
                            value={feed.url}
                            placeholder="https://example.com/feed.xml"
                            onChange={(e) =>
                              update(
                                "feeds",
                                settings.feeds.map((v, i) =>
                                  i === index
                                    ? { ...v, url: e.target.value }
                                    : v,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={feed.enabled}
                          onChange={(e) =>
                            update(
                              "feeds",
                              settings.feeds.map((v, i) =>
                                i === index
                                  ? { ...v, enabled: e.target.checked }
                                  : v,
                              ),
                            )
                          }
                        />
                        사용
                      </label>
                      <button
                        className="icon-button danger"
                        aria-label={feed.name + " 피드 삭제"}
                        onClick={() =>
                          update(
                            "feeds",
                            settings.feeds.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="secondary-button"
                    onClick={() =>
                      update("feeds", [
                        ...settings.feeds,
                        {
                          id: crypto.randomUUID(),
                          name: "새 소스",
                          url: "",
                          enabled: true,
                        },
                      ])
                    }
                  >
                    <Plus size={15} /> 소스 추가
                  </button>
                  <div className="info-note">
                    <Newspaper size={17} />
                    <p>
                      GeekNews는 기본 연결되어 있습니다. 기사 전문을 가져올 수
                      없으면 피드 본문만 요약하고 그 범위를 표시합니다.
                    </p>
                  </div>
                </SettingsSection>
              )}
              {tab === "accounts" && (
                <>
                  <SettingsSection
                    title="연결한 메일 계정"
                    description="읽기 전용으로 받은편지함을 가져옵니다. 대시보드에서 읽음 처리해도 원본 메일은 바뀌지 않습니다."
                  >
                    {accounts.map((a) => (
                      <div className="account-editor" key={a.id}>
                        <div className="account-heading">
                          <Mail size={20} />
                          <div>
                            <strong>{a.label}</strong>
                            <span>
                              {a.email} · {a.provider.toUpperCase()}
                            </span>
                          </div>
                          <span
                            className={
                              "connection-label " +
                              (a.status === "error" ? "warning" : "")
                            }
                          >
                            {a.status === "connected"
                              ? "연결됨"
                              : a.status === "error"
                                ? "연결 오류"
                                : "연결 대기"}
                          </span>
                        </div>
                        <div className="field-help">
                          {a.last_sync
                            ? "최근 수집 " + dateLabel(a.last_sync)
                            : "최초 수집 대기 중"}
                        </div>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={a.auto_summary}
                            onChange={(e) =>
                              setAccounts(
                                accounts.map((x) =>
                                  x.id === a.id
                                    ? { ...x, auto_summary: e.target.checked }
                                    : x,
                                ),
                              )
                            }
                          />
                          새 받은편지함 메일 자동 요약
                        </label>
                        <div className="form-grid two">
                          <label>
                            요약에서 제외할 발신자
                            <CommaInput
                              value={a.excluded_senders.join(", ")}
                              onChange={(value) =>
                                setAccounts(
                                  accounts.map((x) =>
                                    x.id === a.id
                                      ? { ...x, excluded_senders: words(value) }
                                      : x,
                                  ),
                                )
                              }
                              placeholder="noreply@example.com, 광고 발신자"
                            />
                          </label>
                          <label>
                            요약에서 제외할 폴더
                            <CommaInput
                              value={a.excluded_folders.join(", ")}
                              onChange={(value) =>
                                setAccounts(
                                  accounts.map((x) =>
                                    x.id === a.id
                                      ? { ...x, excluded_folders: words(value) }
                                      : x,
                                  ),
                                )
                              }
                              placeholder="현재 수집 폴더: INBOX"
                            />
                          </label>
                        </div>
                        <div className="button-row">
                          <button
                            className="secondary-button"
                            onClick={() => accountSave(a)}
                          >
                            계정 설정 저장
                          </button>
                          {confirmDelete === a.id ? (
                            <>
                              <span className="warning small">
                                저장된 메일과 요약도 삭제됩니다.
                              </span>
                              <button
                                className="danger-button"
                                onClick={async () => {
                                  try {
                                    await api("/accounts/" + a.id, {
                                      method: "DELETE",
                                    });
                                    setAccounts(
                                      accounts.filter((x) => x.id !== a.id),
                                    );
                                    setConfirmDelete(null);
                                  } catch (e) {
                                    setError((e as Error).message);
                                  }
                                }}
                              >
                                연결 해제 확정
                              </button>
                              <button
                                className="text-link"
                                onClick={() => setConfirmDelete(null)}
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <button
                              className="text-link danger"
                              onClick={() => setConfirmDelete(a.id)}
                            >
                              연결 해제
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {!accounts.length && (
                      <div className="empty-state">
                        <Mail size={24} />
                        <p>
                          아직 연결한 계정이 없어요. Gmail 또는 IMAP으로
                          시작하세요.
                        </p>
                      </div>
                    )}
                    <a
                      className={
                        "secondary-button " + (!google ? "disabled-link" : "")
                      }
                      href={google ? "/api/oauth/google" : "#google-help"}
                    >
                      <Plus size={15} /> Gmail 계정 연결{" "}
                      <ExternalLink size={13} />
                    </a>
                    {!google && (
                      <p id="google-help" className="field-help">
                        서버에 GOOGLE_CLIENT_ID·GOOGLE_CLIENT_SECRET을 설정하면
                        Gmail 연결을 사용할 수 있습니다.
                      </p>
                    )}
                  </SettingsSection>
                  <SettingsSection
                    title="IMAP 계정 추가"
                    description="네이버·다음·학교 메일 등에서 IMAP을 활성화하고 앱 비밀번호를 사용하세요. TLS 또는 필수 STARTTLS로 연결합니다."
                  >
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        const form = e.currentTarget;
                        const f = new FormData(form);
                        try {
                          await api("/accounts", {
                            method: "POST",
                            body: JSON.stringify({
                              label: f.get("label"),
                              email: f.get("email"),
                              host: f.get("host"),
                              port: Number(f.get("port")),
                              user: f.get("user"),
                              password: f.get("password"),
                            }),
                          });
                          setAccounts(
                            (await api<{ accounts: Account[] }>("/accounts"))
                              .accounts,
                          );
                          form.reset();
                          setNotice(
                            "IMAP 계정을 추가했습니다. 연결과 수집 상태를 확인해 주세요.",
                          );
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <div className="form-grid two">
                        <label>
                          계정 별명
                          <input
                            name="label"
                            required
                            placeholder="학교 메일"
                          />
                        </label>
                        <label>
                          이메일
                          <input
                            name="email"
                            type="email"
                            required
                            placeholder="student@example.edu"
                          />
                        </label>
                        <label>
                          IMAP 서버
                          <input
                            name="host"
                            required
                            placeholder="imap.example.com"
                          />
                        </label>
                        <label>
                          보안 연결
                          <select name="port">
                            <option value="993">TLS · 993</option>
                            <option value="143">STARTTLS 필수 · 143</option>
                          </select>
                        </label>
                        <label>
                          로그인 이름
                          <input name="user" required autoComplete="username" />
                        </label>
                        <label>
                          앱 비밀번호
                          <input
                            name="password"
                            type="password"
                            required
                            autoComplete="new-password"
                          />
                        </label>
                      </div>
                      <p className="field-help">
                        내부 학교 서버는 운영자가 IMAP_ALLOWED_HOSTS에 정확한
                        호스트 이름을 추가해야 합니다.
                      </p>
                      <button
                        className="secondary-button"
                        type="submit"
                        disabled={busy}
                      >
                        <Plus size={15} />
                        계정 추가
                      </button>
                    </form>
                  </SettingsSection>
                </>
              )}
              {tab === "stocks" && (
                <>
                  <SettingsSection
                    title="관심 종목"
                    description="전일 대비 등락을 보여줍니다. 한국투자증권 공식 시세 API만 호출하며 매매 기능은 없습니다."
                  >
                    {settings.stocks.map((s, index) => (
                      <div className="editor-row" key={index}>
                        <div className="form-grid stock-form">
                          <label>
                            시장
                            <select
                              value={s.market}
                              onChange={(e) =>
                                update(
                                  "stocks",
                                  settings.stocks.map((v, i) =>
                                    i === index
                                      ? {
                                          ...v,
                                          market: e.target.value as "KR" | "US",
                                        }
                                      : v,
                                  ),
                                )
                              }
                            >
                              <option value="KR">한국</option>
                              <option value="US">미국</option>
                            </select>
                          </label>
                          <label>
                            종목 코드
                            <input
                              value={s.symbol}
                              onChange={(e) =>
                                update(
                                  "stocks",
                                  settings.stocks.map((v, i) =>
                                    i === index
                                      ? {
                                          ...v,
                                          symbol: e.target.value.toUpperCase(),
                                        }
                                      : v,
                                  ),
                                )
                              }
                              placeholder={
                                s.market === "KR" ? "005930" : "AAPL"
                              }
                            />
                          </label>
                          <label>
                            표시 이름
                            <input
                              value={s.name}
                              onChange={(e) =>
                                update(
                                  "stocks",
                                  settings.stocks.map((v, i) =>
                                    i === index
                                      ? { ...v, name: e.target.value }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </label>
                          {s.market === "US" && (
                            <label>
                              거래소
                              <select
                                value={s.exchange}
                                onChange={(e) =>
                                  update(
                                    "stocks",
                                    settings.stocks.map((v, i) =>
                                      i === index
                                        ? { ...v, exchange: e.target.value }
                                        : v,
                                    ),
                                  )
                                }
                              >
                                <option value="NAS">NASDAQ</option>
                                <option value="NYS">NYSE</option>
                                <option value="AMS">AMEX</option>
                              </select>
                            </label>
                          )}
                        </div>
                        <button
                          className="icon-button danger"
                          aria-label={s.name + " 삭제"}
                          onClick={() =>
                            update(
                              "stocks",
                              settings.stocks.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="secondary-button"
                      onClick={() =>
                        update("stocks", [
                          ...settings.stocks,
                          {
                            market: "KR",
                            symbol: "",
                            name: "",
                            exchange: "NAS",
                          },
                        ])
                      }
                    >
                      <Plus size={15} />
                      관심 종목 추가
                    </button>
                  </SettingsSection>
                  <SettingsSection
                    title="한국투자증권 연결"
                    description="본인 계좌로 발급한 실전 Open API 키를 설정하세요. 해외 시세의 지연 여부는 제공자 정책을 따릅니다."
                  >
                    {secretField("kisKey", "App Key")}
                    {secretField("kisSecret", "App Secret")}
                    <a
                      className="text-link"
                      href="https://apiportal.koreainvestment.com/intro"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      KIS Developers 열기 <ExternalLink size={13} />
                    </a>
                  </SettingsSection>
                </>
              )}
              {tab === "ai" && (
                <>
                  <SettingsSection
                    title="AI 요약 제공자"
                    description="관심 뉴스와 새 메일은 자동 요약합니다. 일반 뉴스·GeekNews·CVE는 요약 버튼을 눌렀을 때만 호출합니다."
                  >
                    <div className="form-grid two">
                      <label>
                        제공자
                        <select
                          value={settings.ai.provider}
                          onChange={(e) =>
                            update("ai", {
                              ...settings.ai,
                              provider: e.target.value as
                                "openrouter" | "openai",
                            })
                          }
                        >
                          <option value="openrouter">OpenRouter</option>
                          <option value="openai">OpenAI</option>
                        </select>
                      </label>
                      <label>
                        모델 ID
                        <input
                          value={settings.ai.model}
                          onChange={(e) =>
                            update("ai", {
                              ...settings.ai,
                              model: e.target.value,
                            })
                          }
                          placeholder={
                            settings.ai.provider === "openrouter"
                              ? "제공자/모델 ID"
                              : "OpenAI 모델 ID"
                          }
                        />
                      </label>
                    </div>
                    {secretField(
                      "aiKey",
                      settings.ai.provider === "openrouter"
                        ? "OpenRouter API 키"
                        : "OpenAI API 키",
                    )}
                    <p className="field-help">
                      제공자를 바꾸면 새 제공자에 맞는 키도 입력해 주세요. 모델
                      ID는 해당 제공자에서 사용할 수 있는 값을 입력합니다.
                    </p>
                  </SettingsSection>
                  <SettingsSection
                    title="자동 요약 한도"
                    description="한국 시간 기준 하루 자동 요약 시도 횟수입니다. 0으로 설정하면 자동 요약을 멈춥니다. 수동 요약은 이 한도에 포함되지 않습니다."
                  >
                    <div className="form-grid two">
                      <label>
                        관심 뉴스 · 하루 최대
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          value={settings.ai.newsLimit}
                          onChange={(e) =>
                            update("ai", {
                              ...settings.ai,
                              newsLimit: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        새 메일 · 하루 최대
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          value={settings.ai.mailLimit}
                          onChange={(e) =>
                            update("ai", {
                              ...settings.ai,
                              mailLimit: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="info-note">
                      <ShieldCheck size={19} />
                      <p>
                        요약 시 기사·메일 본문이 선택한 AI 제공자에게
                        전송됩니다. 메일 첨부파일은 전송하지 않습니다. 계정별
                        자동 요약 제외 설정은 메일 계정에서 지정하세요.
                      </p>
                    </div>
                  </SettingsSection>
                </>
              )}
              {tab === "appearance" && (
                <>
                  <SettingsSection
                    title="화면 분위기"
                    description="배경과 패널 농도를 바꿔 편안하게 읽을 수 있게 맞추세요."
                  >
                    <div className="theme-options">
                      {(["forest", "midnight", "slate"] as const).map(
                        (t, i) => (
                          <button
                            key={t}
                            className={
                              "theme-option theme-" +
                              t +
                              (settings.appearance.background === t
                                ? " active"
                                : "")
                            }
                            aria-pressed={settings.appearance.background === t}
                            onClick={() =>
                              update("appearance", {
                                ...settings.appearance,
                                background: t,
                              })
                            }
                          >
                            <span className="theme-swatch" />
                            <span>
                              {["딥 포레스트", "미드나이트", "슬레이트"][i]}
                            </span>
                            {settings.appearance.background === t && (
                              <Check size={15} />
                            )}
                          </button>
                        ),
                      )}
                    </div>
                    <label>
                      패널 불투명도{" "}
                      <span className="muted">
                        {settings.appearance.opacity}%
                      </span>
                      <input
                        type="range"
                        min={60}
                        max={100}
                        value={settings.appearance.opacity}
                        onChange={(e) =>
                          update("appearance", {
                            ...settings.appearance,
                            opacity: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </SettingsSection>
                  <SettingsSection
                    title="위젯 순서·표시"
                    description="위쪽의 작은 위젯과 본문 소식 영역 안에서 각각 순서가 적용됩니다."
                  >
                    {settings.appearance.order.map((w, index) => (
                      <div className="widget-editor" key={w}>
                        <span>{widgetNames[w]}</span>
                        <div>
                          <button
                            className="icon-button"
                            aria-label={widgetNames[w] + " 위로"}
                            disabled={index === 0}
                            onClick={() => {
                              const order = [...settings.appearance.order];
                              [order[index - 1], order[index]] = [
                                order[index],
                                order[index - 1],
                              ];
                              update("appearance", {
                                ...settings.appearance,
                                order,
                              });
                            }}
                          >
                            <ChevronUp size={17} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={widgetNames[w] + " 아래로"}
                            disabled={index === 6}
                            onClick={() => {
                              const order = [...settings.appearance.order];
                              [order[index], order[index + 1]] = [
                                order[index + 1],
                                order[index],
                              ];
                              update("appearance", {
                                ...settings.appearance,
                                order,
                              });
                            }}
                          >
                            <ChevronDown size={17} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={
                              widgetNames[w] +
                              (settings.appearance.hidden.includes(w)
                                ? " 표시"
                                : " 숨기기")
                            }
                            onClick={() =>
                              update("appearance", {
                                ...settings.appearance,
                                hidden: settings.appearance.hidden.includes(w)
                                  ? settings.appearance.hidden.filter(
                                      (x) => x !== w,
                                    )
                                  : [...settings.appearance.hidden, w],
                              })
                            }
                          >
                            {settings.appearance.hidden.includes(w) ? (
                              <EyeOff size={17} />
                            ) : (
                              <Eye size={17} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </SettingsSection>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel settings-section">
      <h2>{title}</h2>
      <p className="section-description">{description}</p>
      <div className="settings-fields">{children}</div>
    </section>
  );
}

function CommaInput({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);
  return (
    <input
      {...props}
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        onChange(draft);
        setFocused(false);
      }}
    />
  );
}
