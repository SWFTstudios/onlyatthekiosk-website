-- KIOSK checkout (Stripe) until the Shopify store is live: carts, checkout
-- snapshots, orders and stock. Prices come from js/kiosk-content.js; amounts
-- are stored in cents. See docs/COMMERCE.md. Apply with:
--   npx wrangler d1 migrations apply kiosk-accounts --local
--   npx wrangler d1 migrations apply kiosk-accounts --remote

-- Bags for guests and members. Members' bag id is also kept in carts.shopify_cart_id
-- (the column predates Stripe; it holds whichever cart id the provider uses).
CREATE TABLE IF NOT EXISTS kiosk_carts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  lines TEXT NOT NULL DEFAULT '[]',          -- JSON [{ id, variantId, quantity }]
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS kiosk_carts_updated ON kiosk_carts(updated_at);

-- What was in the bag when a Stripe Checkout Session was opened, priced
-- server-side. The webhook turns a paid one into an order.
CREATE TABLE IF NOT EXISTS checkouts (
  session_id TEXT PRIMARY KEY,               -- Stripe cs_...
  cart_id TEXT,
  user_id TEXT,
  country TEXT NOT NULL,
  lines TEXT NOT NULL,                       -- JSON [{ productId, cw, size, colour, sku, title, quantity, unitAmount }]
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS checkouts_status ON checkouts(status, created_at);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,                      -- KIOSK-7Q4M2X, shown to customers
  stripe_session_id TEXT NOT NULL,
  payment_intent TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  ship_to TEXT NOT NULL DEFAULT '{}',        -- JSON { name, line1, line2, city, state, postal_code, country }
  country TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'usd',
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partially_refunded', 'refunded')),
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled'
    CHECK (fulfillment_status IN ('unfulfilled', 'packed', 'shipped', 'delivered', 'cancelled')),
  carrier TEXT NOT NULL DEFAULT '',
  tracking TEXT NOT NULL DEFAULT '',
  shipped_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  airtable_record_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS orders_session ON orders(stripe_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_number ON orders(number);
CREATE INDEX IF NOT EXISTS orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status ON orders(fulfillment_status, created_at);
CREATE INDEX IF NOT EXISTS orders_payment_intent ON orders(payment_intent);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  cw INTEGER NOT NULL DEFAULT 0,
  colour TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  sku TEXT NOT NULL,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_amount INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product ON order_items(product_id);

-- Stock per SKU. No row = made to order (never sells out). `reserved` holds
-- units in open checkouts (30 minutes) so a limited drop can't oversell.
CREATE TABLE IF NOT EXISTS inventory (
  sku TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  on_hand INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
