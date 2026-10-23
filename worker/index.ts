import { boss, enqueueCollection, enqueueSummary } from "../src/lib/jobs";
import { getSettings, query, pool } from "../src/lib/db";
import { collectFeed } from "./collectors/feeds";
import {
  collectWeather,
  collectMeals,
  collectStocks,
} from "./collectors/widgets";
import { collectCves } from "./collectors/cve";
import { collectMail } from "./collectors/mail";
import { summarize } from "../src/lib/ai";
const queue = await boss();
async function collect(target: string) {
  try {
    if (target === "weather") await collectWeather();
    else if (target === "meals") await collectMeals();
    else if (target === "stocks") await collectStocks();
    else if (target === "cve") await collectCves();
    else if (target === "geek") await collectFeed("geek");
    else if (target.startsWith("feed:")) await collectFeed(target.slice(5));
    else if (target.startsWith("mail:")) await collectMail(target.slice(5));
    else return;
    await query(
      "INSERT INTO collector_state(id,last_success,error) VALUES($1,now(),NULL) ON CONFLICT(id) DO UPDATE SET last_success=now(),error=NULL",
      [target],
    );
  } catch (error) {
    await query(
      "INSERT INTO collector_state(id,error) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET error=$2",
      [
        target,
        "연결에 실패했습니다. 제공자 설정을 확인하거나 다시 시도해 주세요.",
      ],
    );
    await query("UPDATE widget_cache SET error=$2 WHERE id=$1", [
      target,
      "갱신 실패 · 마지막 정상 데이터입니다.",
    ]);
    console.error(
      "Collector failed:",
      target,
      error instanceof Error ? error.name : "Error",
    );
    throw error;
  }
}
await queue.work<{ target: string }>(
  "collect",
  { localConcurrency: 3 },
  async (jobs) => {
    for (const job of jobs) await collect(job.data.target);
  },
);
await queue.work<{ id: string; automatic: boolean }>(
  "summarize",
  { localConcurrency: 1 },
  async (jobs) => {
    for (const job of jobs) await summarize(job.data.id, job.data.automatic);
  },
);
async function tick() {
  const settings = await getSettings();
  const tasks: { id: string; interval: number }[] = [
    { id: "weather", interval: 30 },
    { id: "meals", interval: 1440 },
    { id: "stocks", interval: 5 },
    { id: "geek", interval: 15 },
    { id: "cve", interval: 60 },
    ...settings.feeds
      .filter((f) => f.enabled)
      .map((f) => ({ id: "feed:" + f.id, interval: 15 })),
    ...(await query("SELECT id FROM accounts")).rows.map((a) => ({
      id: "mail:" + a.id,
      interval: 5,
    })),
  ];
  const states = (await query("SELECT id,last_success FROM collector_state"))
    .rows;
  for (const task of tasks) {
    const last = states.find((s) => s.id === task.id)?.last_success;
    const wrongMealDay =
      task.id === "meals" &&
      last &&
      new Date(last).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }) !==
        new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    if (
      !last ||
      Date.now() - new Date(last).getTime() > task.interval * 60000 ||
      wrongMealDay
    )
      await enqueueCollection(task.id);
  }
  // Retry budget-limited summaries on a later day; successful summaries are cached.
  const pending = await query(
    "SELECT id FROM items WHERE NOT excluded AND (kind='mail' OR (kind='news' AND jsonb_array_length(matched)>0)) AND summary_status IN ('idle','limited','unconfigured') AND published_at>now()-interval '7 days' ORDER BY published_at DESC LIMIT 200",
  );
  for (const item of pending.rows) await enqueueSummary(item.id, true);
}
await tick();
const timer = setInterval(
  () => tick().catch(() => console.error("Scheduler tick failed")),
  60000,
);
console.log("DailyBrief worker ready.");
async function stop() {
  clearInterval(timer);
  await queue.stop();
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
