import { PgBoss } from "pg-boss";
let instance: Promise<PgBoss> | undefined;
export function boss() {
  instance ??= (async () => {
    const q = new PgBoss({
      connectionString: process.env.DATABASE_URL!,
      application_name: "dailybrief",
      monitorIntervalSeconds: 30,
    });
    q.on("error", () => console.error("Job queue error"));
    await q.start();
    await q.createQueue("collect", {
      retryLimit: 3,
      retryDelay: 60,
      retryBackoff: true,
      expireInSeconds: 600,
    });
    await q.createQueue("summarize", {
      retryLimit: 2,
      retryDelay: 60,
      retryBackoff: true,
      expireInSeconds: 120,
    });
    return q;
  })();
  return instance;
}
export async function enqueueCollection(target: string) {
  return (await boss()).send(
    "collect",
    { target },
    { singletonKey: target, singletonSeconds: 60 },
  );
}
export async function enqueueSummary(id: string, automatic = false) {
  return (await boss()).send(
    "summarize",
    { id, automatic },
    { singletonKey: id, singletonSeconds: 120, priority: automatic ? 0 : 10 },
  );
}
