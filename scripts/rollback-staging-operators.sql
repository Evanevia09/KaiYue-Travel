-- Non-destructive rollback of staging bootstrap rows only.
-- STAGING D1 043cd0ff-a1e6-4b5e-98c1-968c286e0c70.
-- Does not DROP admin_operator, operator_audit_events, or Better Auth tables.
-- Does not delete Better Auth users, sessions, or credentials.
-- Does not touch production D1 06cf879d.
-- Last enabled super_admin is protected by 0010; bootstrap staff are removed
-- first, then the bootstrap super_admin only when another enabled super_admin
-- exists. If the bootstrap super_admin is still the last enabled super_admin,
-- that row remains.

DELETE FROM admin_operator
WHERE updated_by = 'staging-bootstrap'
  AND role = 'staff';

DELETE FROM admin_operator
WHERE updated_by = 'staging-bootstrap'
  AND role = 'super_admin'
  AND EXISTS (
    SELECT 1 FROM admin_operator AS other
    WHERE other.role = 'super_admin'
      AND other.enabled = 1
      AND other.user_id != admin_operator.user_id
  );
