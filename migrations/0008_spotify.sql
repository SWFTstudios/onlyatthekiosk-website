-- Spotify connections for Voyagers + KIOSK TV video matching.
-- Apply with:
--   npx wrangler d1 migrations apply kiosk-accounts --local
--   npx wrangler d1 migrations apply kiosk-accounts --remote

-- One Spotify account per Voyager. Tokens are AES-GCM encrypted
-- (functions/_lib/spotify.js); never store or ship them in plain text.
CREATE TABLE IF NOT EXISTS spotify_connections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  spotify_user_id TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  product TEXT NOT NULL DEFAULT '',
  scopes TEXT NOT NULL DEFAULT '',
  refresh_token_enc TEXT NOT NULL,
  access_token_enc TEXT,
  access_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Spotify track -> YouTube music video, shared across Voyagers.
-- verified=1 rows come from the curated list in js/kiosk-content.js.
CREATE TABLE IF NOT EXISTS tv_video_map (
  spotify_track_id TEXT PRIMARY KEY,
  youtube_id TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- "Not this video": a Voyager's rejected match is never served to them again.
CREATE TABLE IF NOT EXISTS tv_video_blocks (
  user_id TEXT NOT NULL,
  spotify_track_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, spotify_track_id)
);
