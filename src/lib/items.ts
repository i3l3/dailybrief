import { randomUUID } from "node:crypto";
import { query } from "./db";
import type { Kind } from "./types";
export async function upsertItem(input: {
  kind: Kind;
  externalId: string;
  accountId?: string;
  title: string;
  url?: string;
  source: string;
  body: string;
  publishedAt: string;
  tags?: string[];
  matched?: string[];
  excluded?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const { rows } = await query(
    `INSERT INTO items(id,kind,external_id,account_id,title,url,source,body,published_at,tags,matched,metadata,excluded)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT(kind,external_id) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, url=EXCLUDED.url,tags=EXCLUDED.tags,matched=EXCLUDED.matched,excluded=EXCLUDED.excluded,metadata=EXCLUDED.metadata,
    summary_status=CASE WHEN items.body<>EXCLUDED.body THEN 'idle' ELSE items.summary_status END,
    updated_at=CASE WHEN items.body<>EXCLUDED.body OR items.metadata<>EXCLUDED.metadata THEN now() ELSE items.updated_at END
    RETURNING id`,
    [
      randomUUID(),
      input.kind,
      input.externalId,
      input.accountId ?? null,
      input.title,
      input.url ?? "",
      input.source,
      input.body.slice(0, 30000),
      input.publishedAt,
      JSON.stringify(input.tags ?? []),
      JSON.stringify(input.matched ?? []),
      JSON.stringify(input.metadata ?? {}),
      input.excluded ?? false,
    ],
  );
  return rows[0].id as string;
}
