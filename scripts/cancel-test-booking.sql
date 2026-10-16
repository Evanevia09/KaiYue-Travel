-- Cancel one clearly tagged TEST booking on staging D1 069aa442 only.
-- Safe: matches the exact reference and only enquiry/assigned rows.
-- Admin can also cancel from /admin/bookings/:reference.

UPDATE bookings
SET status = 'cancelled',
    updated_at = '2026-10-16T06:20:00.000Z'
WHERE reference = 'KY-PRDT5RZK'
  AND status IN ('enquiry', 'assigned')
  AND (
    contact_name LIKE 'TEST%'
    OR email LIKE '%@kaiyue.test'
  );

INSERT INTO audit_events (
  id, entity_type, entity_id, event_type, actor_id, from_value, to_value, request_id, created_at
)
SELECT
  lower(hex(randomblob(16))),
  'booking',
  id,
  'status_change',
  'test-admin-preview-remove-later',
  'enquiry',
  'cancelled',
  'preview-qa-cleanup',
  '2026-10-16T06:20:00.000Z'
FROM bookings
WHERE reference = 'KY-PRDT5RZK'
  AND status = 'cancelled';
