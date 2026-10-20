-- KIOSK Partner Hub: stores, brands and sponsors with a profile on the kiosk.
-- A partner is a signed-in member (users) with one partner profile and the
-- pieces they list. New profiles wait in 'pending' until KIOSK sets them
-- 'live' (see docs/PARTNER_HUB.md). Apply with:
--   npx wrangler d1 migrations apply kiosk-accounts --local
--   npx wrangler d1 migrations apply kiosk-accounts --remote

CREATE TABLE IF NOT EXISTS partners (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL COLLATE NOCASE,
  kind TEXT NOT NULL CHECK (kind IN ('store', 'brand', 'sponsor')),
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  -- JSON, cleaned by functions/_lib/partner.js (contact, listing, notices, payouts)
  settings TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'paused')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (handle)
);
CREATE INDEX IF NOT EXISTS partners_status ON partners(status);

CREATE TABLE IF NOT EXISTS partner_products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES partners(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL,
  currency TEXT NOT NULL DEFAULT 'USD',
  url TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live')),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS partner_products_user ON partner_products(user_id, sort);
