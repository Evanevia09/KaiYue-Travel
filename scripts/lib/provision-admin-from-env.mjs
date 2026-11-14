/**
 * One-shot Better Auth hash from process env. No HTTP listener.
 * Does not log email, password, hash, or SQL. hashPassword is scrypt
 * and does not read BETTER_AUTH_SECRET.
 *
 * Default minimum is 16. Six characters are accepted only when
 * ADMIN_SEED_STAGING_TEST=1 (isolated staging UAT hasher mode).
 */
import { buildAdminCredentialSql } from "./admin-seed-sql.mjs";

export const MIN_PASSWORD = 16;
export const STAGING_TEST_MIN_PASSWORD = 6;

export function seedPasswordMin(env = process.env) {
  const mode = (env.ADMIN_SEED_STAGING_TEST ?? "").trim().toLowerCase();
  if (mode === "1" || mode === "true" || mode === "yes") {
    return STAGING_TEST_MIN_PASSWORD;
  }
  return MIN_PASSWORD;
}

export function readSeedEnv(env = process.env) {
  return {
    email: env.ADMIN_SEED_EMAIL?.trim().toLowerCase() ?? "",
    password: env.ADMIN_SEED_PASSWORD ?? "",
    name: env.ADMIN_SEED_NAME?.trim() || "Temporary staff operator",
    userId: env.ADMIN_SEED_USER_ID?.trim() || crypto.randomUUID(),
    accountId: env.ADMIN_SEED_ACCOUNT_ID?.trim() || crypto.randomUUID(),
  };
}

export function seedEnvPresent(env = process.env) {
  return Boolean(env.ADMIN_SEED_EMAIL && env.ADMIN_SEED_PASSWORD);
}

export async function sqlFromSeedEnv({
  hashPassword,
  env = process.env,
  now = new Date().toISOString(),
}) {
  const seed = readSeedEnv(env);
  const minPassword = seedPasswordMin(env);
  if (!seed.email) {
    throw Object.assign(new Error("Set ADMIN_SEED_EMAIL."), { code: "MISSING_EMAIL" });
  }
  if (seed.password.length < minPassword) {
    throw Object.assign(
      new Error(`ADMIN_SEED_PASSWORD must be at least ${minPassword} characters.`),
      {
        code: "PASSWORD_TOO_SHORT",
      },
    );
  }
  const passwordHash = await hashPassword(seed.password);
  return buildAdminCredentialSql({
    email: seed.email,
    name: seed.name,
    passwordHash,
    now,
    userId: seed.userId,
    accountId: seed.accountId,
  });
}
