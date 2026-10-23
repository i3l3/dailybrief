export type Kind = "news" | "geek" | "cve" | "mail";
export type Widget = "weather" | "meals" | "stocks" | Kind;
export interface Interest {
  name: string;
  keywords: string[];
  exclude: string[];
}
export interface FeedSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}
export interface Settings {
  interests: Interest[];
  feeds: FeedSource[];
  cve: {
    tags: string[];
    vendors: string[];
    products: string[];
    cpes: string[];
  };
  location: { name: string; latitude: number; longitude: number };
  school: { name: string; office: string; code: string };
  stocks: {
    symbol: string;
    name: string;
    market: "KR" | "US";
    exchange: string;
  }[];
  ai: {
    provider: "openrouter" | "openai";
    model: string;
    newsLimit: number;
    mailLimit: number;
  };
  appearance: {
    background: "forest" | "midnight" | "slate";
    opacity: number;
    order: Widget[];
    hidden: Widget[];
  };
}
export interface Item {
  id: string;
  kind: Kind;
  title: string;
  url: string;
  source: string;
  body: string;
  published_at: string;
  first_seen_at: string;
  updated_at: string;
  tags: string[];
  matched: string[];
  excluded?: boolean;
  summary: string | null;
  summary_status: string;
  read_at: string | null;
  saved: boolean;
  summary_key?: string | null;
  account_id: string | null;
  metadata: Record<string, unknown>;
}
export interface Account {
  id: string;
  provider: "gmail" | "imap";
  label: string;
  email: string;
  auto_summary: boolean;
  excluded_senders: string[];
  excluded_folders: string[];
  status: string;
  last_sync: string | null;
}
export interface DashboardData {
  items: Item[];
  accounts: Account[];
  settings: Settings;
  baseline: string;
  visitAt: string;
  widgets: Record<
    string,
    { data: unknown; updated_at: string; error: string | null }
  >;
  collectors: {
    id: string;
    last_success: string | null;
    error: string | null;
  }[];
  demo?: boolean;
}
export const defaults: Settings = {
  interests: [
    {
      name: "AI · 개발",
      keywords: ["AI", "인공지능", "LLM", "개발", "오픈소스"],
      exclude: [],
    },
  ],
  feeds: [],
  cve: { tags: [], vendors: [], products: [], cpes: [] },
  location: { name: "서울", latitude: 37.5665, longitude: 126.978 },
  school: { name: "", office: "", code: "" },
  stocks: [],
  ai: { provider: "openrouter", model: "", newsLimit: 30, mailLimit: 100 },
  appearance: {
    background: "forest",
    opacity: 82,
    order: ["weather", "meals", "stocks", "geek", "news", "mail", "cve"],
    hidden: [],
  },
};
