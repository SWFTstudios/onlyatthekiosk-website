-- KIOSK live presence: who is on the site right now, at city level, for the
-- pins on the home globe. One row per open tab, refreshed about once a minute
-- by js/kiosk-glass.js; rows older than ten minutes are swept on each
-- heartbeat. Only the city-level location Cloudflare attaches to a request is
-- kept (rounded to ~10 km); no IP address, account or page history. Apply with:
--   npx wrangler d1 migrations apply kiosk-accounts --local
--   npx wrangler d1 migrations apply kiosk-accounts --remote

CREATE TABLE IF NOT EXISTS presence (
  id TEXT PRIMARY KEY,                 -- SHA-256 of a random per-tab id
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  seen_at INTEGER NOT NULL             -- unix seconds
);
CREATE INDEX IF NOT EXISTS presence_seen ON presence(seen_at);
