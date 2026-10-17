-- KIOSK accounts: members, email sign-in codes, sessions, saves and carts.
-- Members sign in with a one-time code emailed through Cloudflare Email
-- Service; there are no passwords. Apply with:
--   npx wrangler d1 migrations apply kiosk-accounts --local
--   npx wrangler d1 migrations apply kiosk-accounts --remote

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  first_name TEXT,
  member_number INTEGER NOT NULL,
  member_since TEXT NOT NULL DEFAULT (datetime('now')),
  welcome_sent_at TEXT,
  airtable_record_id TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (email)
);
CREATE UNIQUE INDEX IF NOT EXISTS users_member_number ON users(member_number);

-- Only a SHA-256 hash of the session id is stored
CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);

-- One live code per email, stored hashed; 10 minutes, 5 tries
CREATE TABLE IF NOT EXISTS login_codes (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Saves ("locker"): products, stories, films, radio and other content
CREATE TABLE IF NOT EXISTS locker_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('product', 'story', 'video', 'radio', 'content')),
  ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, kind, ref)
);
CREATE INDEX IF NOT EXISTS locker_user_id ON locker_items(user_id);
CREATE INDEX IF NOT EXISTS locker_user_kind ON locker_items(user_id, kind);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prefs TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS carts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  shopify_cart_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
