CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS owner (
  id integer PRIMARY KEY CHECK (id=1), username text NOT NULL UNIQUE,
  password_hash text NOT NULL, last_visit timestamptz
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (id integer PRIMARY KEY CHECK(id=1), value jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS secrets (name text PRIMARY KEY, ciphertext text NOT NULL);
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY, provider text NOT NULL CHECK(provider IN ('gmail','imap')),
  label text NOT NULL, email text NOT NULL, credentials text NOT NULL,
  auto_summary boolean NOT NULL DEFAULT true, excluded_senders jsonb NOT NULL DEFAULT '[]',
  excluded_folders jsonb NOT NULL DEFAULT '[]', cursor jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending', last_sync timestamptz
);
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('news','geek','cve','mail')),
  external_id text NOT NULL, account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL, url text NOT NULL DEFAULT '', source text NOT NULL,
  body text NOT NULL DEFAULT '', published_at timestamptz NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  tags jsonb NOT NULL DEFAULT '[]', matched jsonb NOT NULL DEFAULT '[]', excluded boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}', summary text, summary_key text,
  summary_status text NOT NULL DEFAULT 'idle', read_at timestamptz, saved boolean NOT NULL DEFAULT false,
  UNIQUE(kind, external_id)
);
CREATE INDEX IF NOT EXISTS items_timeline ON items(kind, published_at DESC);
CREATE INDEX IF NOT EXISTS items_account ON items(account_id);
CREATE TABLE IF NOT EXISTS widget_cache (
  id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), error text
);
CREATE TABLE IF NOT EXISTS collector_state (
  id text PRIMARY KEY, cursor jsonb NOT NULL DEFAULT '{}', last_success timestamptz, error text
);
CREATE TABLE IF NOT EXISTS ai_usage (
  day date NOT NULL, kind text NOT NULL, count integer NOT NULL DEFAULT 0,
  PRIMARY KEY(day,kind)
);
CREATE TABLE IF NOT EXISTS login_attempts (key text PRIMARY KEY, attempts integer NOT NULL, reset_at timestamptz NOT NULL);
