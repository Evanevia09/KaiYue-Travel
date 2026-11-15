-- SELECT-only preflight for official UAT D1 043cd0ff-a1e6-4b5e-98c1-968c286e0c70.
-- No DML. Abort provision unless user_id still maps to scalingsmb@gmail.com
-- and supported_prestate = 1 (empty admin_operator, or that owner is already
-- the only enabled super_admin). Do NOT run against production D1
-- 06cf879d-8fea-4088-8881-7d382e1b8c11, trial D1 06aa844b, or obsolete 069aa442.

SELECT
  u."id" AS user_id,
  lower(u."email") AS email,
  o.role AS owner_role,
  o.enabled AS owner_enabled,
  (SELECT COUNT(*) FROM admin_operator) AS operator_count,
  (
    SELECT COUNT(*) FROM admin_operator
    WHERE role = 'super_admin' AND enabled = 1
  ) AS enabled_super_count,
  CASE
    WHEN (SELECT COUNT(*) FROM admin_operator) = 0 THEN 1
    WHEN (
      o.role = 'super_admin'
      AND o.enabled = 1
      AND lower(u."email") = 'scalingsmb@gmail.com'
      AND (
        SELECT COUNT(*) FROM admin_operator
        WHERE role = 'super_admin' AND enabled = 1
      ) = 1
    ) THEN 1
    ELSE 0
  END AS supported_prestate
FROM "user" AS u
LEFT JOIN admin_operator AS o ON o.user_id = u."id"
WHERE u."id" = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9';
