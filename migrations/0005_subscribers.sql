-- KIOSK subscribers: everyone who joins the Dispatch or asks to be told about
-- a drop, a stockist pack or partnering, from any email form on the site
-- (/api/subscribe). One row per email and interest; Airtable "Incoming
-- Interest" gets a copy too. Apply with:
--   npx wrangler d1 migrations apply kiosk-accounts --local
--   npx wrangler d1 migrations apply kiosk-accounts --remote

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE,
  interest TEXT NOT NULL DEFAULT 'dispatch',   -- dispatch | stockist | partner | a product / film id
  title TEXT,                                  -- what they asked about, as shown on the site
  source TEXT,                                 -- the page the form was on
  confirmed_at TEXT,                           -- when the confirmation email went out
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (email, interest)
);
CREATE INDEX IF NOT EXISTS subscribers_interest ON subscribers(interest);
