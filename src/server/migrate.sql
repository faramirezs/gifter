CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_usd TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  image_url TEXT,
  tag TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  gift_id TEXT NOT NULL REFERENCES gifts(id),
  buyer_address TEXT NOT NULL,
  amount_paid TEXT NOT NULL,
  network TEXT NOT NULL,
  payment_tx TEXT,
  token TEXT NOT NULL UNIQUE,
  message TEXT,
  recipient_name TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  fulfilled_at INTEGER
);
