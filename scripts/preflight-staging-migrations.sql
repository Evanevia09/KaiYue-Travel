-- SELECT-only migration-list precheck for official UAT D1
--   043cd0ff-a1e6-4b5e-98c1-968c286e0c70
-- Uses sqlite_master only. Does not read admin_operator rows.
-- Apply migrations/0009_admin_operator.sql and
-- migrations/0010_admin_operator_last_super.sql when any of these counts is 0.
-- Then run scripts/preflight-staging-operators.sql. Do NOT run against
-- production D1 06cf879d-8fea-4088-8881-7d382e1b8c11, trial 06aa844b, or
-- obsolete 069aa442.

SELECT
  (
    SELECT COUNT(*) FROM sqlite_master
    WHERE type = 'table' AND name = 'admin_operator'
  ) AS admin_operator_table,
  (
    SELECT COUNT(*) FROM sqlite_master
    WHERE type = 'table' AND name = 'operator_audit_events'
  ) AS operator_audit_table,
  (
    SELECT COUNT(*) FROM sqlite_master
    WHERE type = 'trigger' AND name = 'protect_last_enabled_super_admin_update'
  ) AS last_super_update_trigger,
  (
    SELECT COUNT(*) FROM sqlite_master
    WHERE type = 'trigger' AND name = 'protect_last_enabled_super_admin_delete'
  ) AS last_super_delete_trigger;
