-- KIOSK taste profiles: the answers from onboarding ("Check-in").
-- One row per signed-in user; `taste` is JSON validated by
-- functions/_lib/taste.js. Apply with:
--   npx wrangler d1 migrations apply kiosk-accounts --local
--   npx wrangler d1 migrations apply kiosk-accounts

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  taste TEXT NOT NULL DEFAULT '{}',
  onboarded_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
