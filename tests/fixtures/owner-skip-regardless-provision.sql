-- HISTORICAL fixture copied from frozen 927bf1d provision SQL.
-- DO NOT APPLY to any remote D1. Tests execute it on local synthetic SQLite
-- to show that skipping an existing owner row regardless of role/enabled
-- can INSERT other users as staff before the trailing CHECK fails.

INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
SELECT src.user_id, src.role, 1, datetime('now'), datetime('now'), 'staging-bootstrap'
FROM (
  SELECT owner."id" AS user_id, 'super_admin' AS role
  FROM "user" AS owner
  WHERE owner."id" = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
    AND lower(owner."email") = 'scalingsmb@gmail.com'
  UNION ALL
  SELECT u."id", 'staff'
  FROM "user" AS u
  WHERE u."id" != 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
    AND EXISTS (
      SELECT 1 FROM "user" AS owner
      WHERE owner."id" = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
        AND lower(owner."email") = 'scalingsmb@gmail.com'
    )
) AS src
WHERE NOT EXISTS (
  SELECT 1 FROM admin_operator AS o WHERE o.user_id = src.user_id
);

CREATE TABLE IF NOT EXISTS "_staging_operator_bootstrap_guard" (
  ok INTEGER NOT NULL CHECK (ok = 1)
);
DELETE FROM "_staging_operator_bootstrap_guard";
INSERT INTO "_staging_operator_bootstrap_guard" ("ok")
SELECT CASE
  WHEN (
    (
      SELECT COUNT(*) FROM admin_operator AS o
      JOIN "user" AS u ON u."id" = o.user_id
      WHERE o.user_id = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
        AND o.role = 'super_admin'
        AND o.enabled = 1
        AND lower(u."email") = 'scalingsmb@gmail.com'
    ) = 1
    AND (
      SELECT COUNT(*) FROM admin_operator
      WHERE role = 'super_admin' AND enabled = 1
    ) = 1
  ) THEN 1
  ELSE 0
END;
DROP TABLE "_staging_operator_bootstrap_guard";
