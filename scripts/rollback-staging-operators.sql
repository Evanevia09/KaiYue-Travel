-- Rollback of 0009_admin_operator + staging bootstrap only.
-- STAGING D1 043cd0ff-a1e6-4b5e-98c1-968c286e0c70.
-- Does not delete Better Auth users, sessions, or credentials.
-- Does not touch production D1 06cf879d.

DROP TABLE IF EXISTS "_staging_operator_bootstrap_guard";
DROP TABLE IF EXISTS operator_audit_events;
DROP TABLE IF EXISTS admin_operator;
