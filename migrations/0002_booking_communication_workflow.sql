-- Align the booking pipeline with the operator workflow and support
-- WhatsApp/email as explicit communication channels.

CREATE TABLE bookings_v2 (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('enquiry', 'assigned', 'completed', 'cancelled')),
  service_type TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  destination TEXT,
  pickup_at TEXT NOT NULL,
  return_at TEXT,
  passenger_count INTEGER NOT NULL CHECK (passenger_count >= 1 AND passenger_count <= 14),
  luggage_count INTEGER CHECK (luggage_count IS NULL OR (luggage_count >= 0 AND luggage_count <= 20)),
  vehicle_preference TEXT,
  communication_channel TEXT NOT NULL CHECK (communication_channel IN ('whatsapp', 'email', 'admin')),
  contact_name TEXT,
  phone TEXT,
  phone_display TEXT,
  email TEXT,
  company TEXT,
  message TEXT NOT NULL DEFAULT '',
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

INSERT INTO bookings_v2 (
  id, reference, status, service_type, pickup_location, destination, pickup_at, return_at,
  passenger_count, luggage_count, vehicle_preference, communication_channel, contact_name,
  phone, phone_display, email, company, message, notes, source_page, source_trigger,
  source_mode, locale, notification_state, created_at, updated_at
)
SELECT
  id,
  reference,
  CASE status
    WHEN 'new' THEN 'enquiry'
    WHEN 'confirmed' THEN 'assigned'
    WHEN 'in_progress' THEN 'assigned'
    ELSE status
  END,
  service_type, pickup_location, destination, pickup_at, return_at, passenger_count,
  luggage_count, vehicle_preference, 'email', contact_name, phone, phone_display, email,
  company, COALESCE(notes, ''), notes, source_page, source_trigger, source_mode, locale,
  notification_state, created_at, updated_at
FROM bookings;

DROP TABLE bookings;
ALTER TABLE bookings_v2 RENAME TO bookings;

CREATE INDEX idx_bookings_pickup_at ON bookings (pickup_at);
CREATE INDEX idx_bookings_status_pickup ON bookings (status, pickup_at);
CREATE INDEX idx_bookings_created_at ON bookings (created_at);
