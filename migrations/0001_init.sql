-- Release 1 logical model. Append-only after this migration is shared.

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('new', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  service_type TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  destination TEXT,
  pickup_at TEXT NOT NULL,
  return_at TEXT,
  passenger_count INTEGER NOT NULL CHECK (passenger_count >= 1 AND passenger_count <= 14),
  luggage_count INTEGER CHECK (luggage_count IS NULL OR (luggage_count >= 0 AND luggage_count <= 20)),
  vehicle_preference TEXT,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  email TEXT,
  company TEXT,
  notes TEXT,
  source_page TEXT NOT NULL,
  source_trigger TEXT NOT NULL,
  source_mode TEXT NOT NULL,
  locale TEXT NOT NULL,
  notification_state TEXT NOT NULL CHECK (
    notification_state IN ('pending', 'sent', 'partial', 'failed', 'skipped')
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_bookings_pickup_at ON bookings (pickup_at);
CREATE INDEX idx_bookings_status_pickup ON bookings (status, pickup_at);
CREATE INDEX idx_bookings_created_at ON bookings (created_at);

CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('new', 'replied', 'closed')),
  inquiry_type TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  email TEXT,
  company TEXT,
  message TEXT NOT NULL,
  source_page TEXT NOT NULL,
  locale TEXT NOT NULL,
  notification_state TEXT NOT NULL CHECK (
    notification_state IN ('pending', 'sent', 'partial', 'failed', 'skipped')
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_contacts_status_created ON contacts (status, created_at);
CREATE INDEX idx_contacts_created_at ON contacts (created_at);

CREATE TABLE admin_notes (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('booking', 'contact')),
  entity_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_admin_notes_entity ON admin_notes (entity_type, entity_id, created_at);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('booking', 'contact')),
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_audit_events_entity ON audit_events (entity_type, entity_id, created_at);

CREATE TABLE idempotency_keys (
  key_hash TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys (expires_at);

CREATE TABLE rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start TEXT NOT NULL
);
