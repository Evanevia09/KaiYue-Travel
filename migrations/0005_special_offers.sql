-- Staff-managed special offers. Additive only; does not alter existing tables.

CREATE TABLE offers (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_from REAL CHECK (price_from IS NULL OR price_from > 0),
  terms TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_offers_status_updated ON offers (status, updated_at DESC);

CREATE TABLE offer_photos (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  is_main INTEGER NOT NULL DEFAULT 0 CHECK (is_main IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_offer_photos_offer ON offer_photos (offer_id, sort_order, created_at);

CREATE TABLE offer_audit_events (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_offer_audit_offer ON offer_audit_events (offer_id, created_at);
