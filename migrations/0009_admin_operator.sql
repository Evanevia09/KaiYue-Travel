-- Persisted operator directory. Exactly two roles: super_admin and staff.
-- Better Auth continues to own "user" / "session" / "account". This sidecar
-- is the authorization source once provisioned. No passwords or hashes here.
-- Do not treat an empty table as implicit super-admin elevation.

CREATE TABLE admin_operator (user_id TEXT NOT NULL PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE, role TEXT NOT NULL CHECK (role IN ('super_admin', 'staff')), enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT);

CREATE INDEX idx_admin_operator_role ON admin_operator (role, enabled);

CREATE TABLE operator_audit_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, event_type TEXT NOT NULL, actor_id TEXT NOT NULL, from_value TEXT, to_value TEXT, request_id TEXT NOT NULL, created_at TEXT NOT NULL);

CREATE INDEX idx_operator_audit_user ON operator_audit_events (user_id, created_at);
