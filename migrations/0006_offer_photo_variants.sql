-- Photo variants, content hashes, and dashboard query indexes. Additive only.

ALTER TABLE offer_photos ADD COLUMN content_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE offer_photos ADD COLUMN thumb_object_key TEXT;
ALTER TABLE offer_photos ADD COLUMN width INTEGER;
ALTER TABLE offer_photos ADD COLUMN height INTEGER;
ALTER TABLE offer_photos ADD COLUMN byte_size INTEGER;

CREATE INDEX IF NOT EXISTS idx_offers_updated ON offers (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_photos_hash ON offer_photos (offer_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings (status, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status_updated ON bookings (status, updated_at);
CREATE INDEX IF NOT EXISTS idx_bookings_notification_state ON bookings (notification_state);
