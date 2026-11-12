/**
 * Idempotent Better Auth credential SQL. Keys on email, not a random id.
 * INSERT OR REPLACE by primary key with a new UUID trips the unique email
 * constraint on a second apply. Do not log passwords or hashes from callers.
 */

export function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function buildAdminCredentialSql({ email, name, passwordHash, now, userId, accountId }) {
  const emailSql = sqlString(email);
  const nameSql = sqlString(name);
  const hashSql = sqlString(passwordHash);
  const nowSql = sqlString(now);
  const userIdSql = sqlString(userId);
  const accountIdSql = sqlString(accountId);

  return `-- Temporary allowlisted operator. Remove after Cloudflare Access is live.
-- Idempotent on email: a second apply updates the credential hash and does not
-- insert a second user.
INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
SELECT ${userIdSql}, ${nameSql}, ${emailSql}, 1, NULL, ${nowSql}, ${nowSql}
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "email" = ${emailSql});

UPDATE "user"
SET "name" = ${nameSql}, "updatedAt" = ${nowSql}
WHERE "email" = ${emailSql};

UPDATE "account"
SET "password" = ${hashSql}, "updatedAt" = ${nowSql}
WHERE "providerId" = 'credential'
  AND "userId" = (SELECT "id" FROM "user" WHERE "email" = ${emailSql});

INSERT INTO "account" (
  "id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken",
  "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt"
)
SELECT
  ${accountIdSql},
  (SELECT "id" FROM "user" WHERE "email" = ${emailSql}),
  'credential',
  (SELECT "id" FROM "user" WHERE "email" = ${emailSql}),
  NULL, NULL, NULL, NULL, NULL, NULL,
  ${hashSql},
  ${nowSql},
  ${nowSql}
WHERE NOT EXISTS (
  SELECT 1 FROM "account"
  WHERE "providerId" = 'credential'
    AND "userId" = (SELECT "id" FROM "user" WHERE "email" = ${emailSql})
);
`;
}
