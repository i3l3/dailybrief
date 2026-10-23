import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getSettings, query } from "../../src/lib/db";
import { decrypt, encrypt } from "../../src/lib/crypto";
import { upsertItem } from "../../src/lib/items";
import { imapAddress, jsonFetch } from "../../src/lib/network";
import { plain } from "../../src/lib/content";
import { googleTokens } from "../../src/lib/google";
import { enqueueSummary } from "../../src/lib/jobs";
import { imapRange, matchInterests } from "../../src/lib/rules";
import type { Account } from "../../src/lib/types";
type StoredAccount = Account & {
  credentials: string;
  cursor: { lastUid?: number; uidValidity?: string; historyId?: string };
};
async function store(
  account: StoredAccount,
  message: {
    id: string;
    title: string;
    body: string;
    from: string;
    date: string;
    url?: string;
  },
) {
  const settings = await getSettings();
  const excluded =
    account.excluded_folders.some((f) => f.toUpperCase() === "INBOX") ||
    account.excluded_senders.some((s) =>
      message.from.toLowerCase().includes(s.toLowerCase()),
    );
  const id = await upsertItem({
    kind: "mail",
    externalId: account.id + ":" + message.id,
    accountId: account.id,
    title: message.title || "(제목 없음)",
    body: message.body,
    url: message.url,
    source: account.label,
    publishedAt: message.date,
    matched: matchInterests(
      message.title + " " + message.body,
      settings.interests,
    ),
    metadata: { from: message.from, contentScope: "mail" },
  });
  if (account.auto_summary && !excluded) await enqueueSummary(id, true);
}
interface GmailMessage {
  id: string;
  internalDate: string;
  snippet: string;
  labelIds: string[];
  payload?: GmailPart;
}
interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string };
  parts?: GmailPart[];
}
function gmailText(part: GmailPart | undefined): string {
  if (!part || part.filename) return "";
  if (part.mimeType === "text/plain" && part.body?.data)
    return Buffer.from(part.body.data, "base64url").toString("utf8");
  const children = (part.parts ?? []).map(gmailText).filter(Boolean);
  if (children.length) return children.join("\n");
  if (part.mimeType === "text/html" && part.body?.data)
    return plain(Buffer.from(part.body.data, "base64url").toString("utf8"));
  return "";
}
export async function collectGmail(account: StoredAccount) {
  const credentials = decrypt<{ refreshToken: string }>(account.credentials);
  const access = await googleTokens({
    refresh_token: credentials.refreshToken,
    grant_type: "refresh_token",
  });
  const headers = { Authorization: "Bearer " + access.access_token };
  const base = "https://gmail.googleapis.com/gmail/v1/users/me";
  const profile = await jsonFetch<{ historyId: string }>(base + "/profile", {
    headers,
  });
  const ids = new Set<string>();
  let full = !account.cursor.historyId;
  if (!full) {
    try {
      let page = "";
      do {
        const history = await jsonFetch<{
          history?: {
            messagesAdded?: { message: { id: string; labelIds?: string[] } }[];
            labelsAdded?: { message: { id: string }; labelIds: string[] }[];
          }[];
          nextPageToken?: string;
        }>(
          base +
            "/history?" +
            new URLSearchParams({
              startHistoryId: account.cursor.historyId!,
              ...(page ? { pageToken: page } : {}),
            }),
          { headers },
        );
        for (const entry of history.history ?? []) {
          for (const added of entry.messagesAdded ?? [])
            if (added.message.labelIds?.includes("INBOX"))
              ids.add(added.message.id);
          for (const added of entry.labelsAdded ?? [])
            if (added.labelIds.includes("INBOX")) ids.add(added.message.id);
        }
        page = history.nextPageToken ?? "";
      } while (page);
    } catch {
      full = true;
    }
  }
  if (full) {
    let page = "";
    do {
      const messages = await jsonFetch<{
        messages?: { id: string }[];
        nextPageToken?: string;
      }>(
        base +
          "/messages?" +
          new URLSearchParams({
            q: "in:inbox newer_than:1d",
            maxResults: "100",
            ...(page ? { pageToken: page } : {}),
          }),
        { headers },
      );
      for (const message of messages.messages ?? []) ids.add(message.id);
      page = messages.nextPageToken ?? "";
    } while (page);
  }
  for (const id of ids) {
    const message = await jsonFetch<GmailMessage>(
      base + "/messages/" + encodeURIComponent(id) + "?format=full",
      { headers },
    );
    if (!message.labelIds?.includes("INBOX")) continue;
    const field = (name: string) =>
      message.payload?.headers?.find((h) => h.name.toLowerCase() === name)
        ?.value ?? "";
    await store(account, {
      id,
      title: field("subject"),
      from: field("from"),
      body: (gmailText(message.payload) || message.snippet).slice(0, 30000),
      date: new Date(Number(message.internalDate)).toISOString(),
      url:
        "https://mail.google.com/mail/u/?authuser=" +
        encodeURIComponent(account.email) +
        "#inbox/" +
        id,
    });
  }
  await query(
    "UPDATE accounts SET cursor=$2,status='connected',last_sync=now() WHERE id=$1",
    [account.id, JSON.stringify({ historyId: profile.historyId })],
  );
}
export async function collectImap(account: StoredAccount) {
  const creds = decrypt<{
    host: string;
    port: number;
    user: string;
    password: string;
  }>(account.credentials);
  const address = await imapAddress(creds.host);
  const client = new ImapFlow({
    host: address,
    servername: creds.host,
    port: creds.port,
    secure: creds.port === 993,
    ...(creds.port === 143 ? { doSTARTTLS: true } : {}),
    auth: { user: creds.user, pass: creds.password },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 45000,
    disableAutoIdle: true,
    maxLiteralSize: 5_000_000,
  });
  await client.connect();
  try {
    const mailbox = await client.mailboxOpen("INBOX", { readOnly: true });
    const validity = mailbox.uidValidity.toString();
    const from = imapRange(account.cursor, validity);
    const since = new Date(Date.now() - 86400000);
    const uids = await client.search(
      from === 1 ? { since } : { uid: from + ":*" },
      { uid: true },
    );
    let lastUid = from - 1;
    for (const uid of uids || []) {
      if (uid < from) continue;
      const message = await client.fetchOne(
        String(uid),
        { uid: true, source: true, internalDate: true },
        { uid: true },
      );
      if (!message) continue;
      if (message.source && message.source.length <= 5_000_000) {
        const parsed = await simpleParser(message.source, {
          skipHtmlToText: true,
          skipTextToHtml: true,
        });
        const date =
          parsed.date ??
          (message.internalDate ? new Date(message.internalDate) : new Date());
        if (+date >= +since || from > 1) {
          await store(account, {
            id: validity + ":" + uid,
            title: parsed.subject ?? "",
            body: (parsed.text || plain(parsed.html || "")).slice(0, 30000),
            from: parsed.from?.text ?? "",
            date: date.toISOString(),
          });
        }
      }
      lastUid = Math.max(lastUid, uid);
    }
    await query(
      "UPDATE accounts SET cursor=$2,status='connected',last_sync=now() WHERE id=$1",
      [account.id, JSON.stringify({ uidValidity: validity, lastUid })],
    );
  } finally {
    await client.logout().catch(() => client.close());
  }
}
export async function collectMail(id: string) {
  const account = (
    await query<StoredAccount>("SELECT * FROM accounts WHERE id=$1", [id])
  ).rows[0];
  if (!account) return;
  try {
    await (account.provider === "gmail"
      ? collectGmail(account)
      : collectImap(account));
  } catch (error) {
    await query("UPDATE accounts SET status='error' WHERE id=$1", [id]);
    throw error;
  }
}
