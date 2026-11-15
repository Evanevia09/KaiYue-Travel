import { AppError } from "@kaiyue/contracts";
import { hashPassword } from "better-auth/crypto";
import { adminPasswordMinLength } from "./admin-session.ts";
import type { AppEnv, D1Database, D1QueryResult, D1Statement } from "./env.ts";
import { json, readJson } from "./http.ts";

export const ADMIN_OPERATOR_ROLES = ["super_admin", "staff"] as const;
export type AdminOperatorRole = (typeof ADMIN_OPERATOR_ROLES)[number];

export const ADMIN_PASSWORD_MAX_LENGTH = 128;
export const LAST_ENABLED_SUPER_ADMIN_MESSAGE =
  "The last enabled super admin cannot be demoted or disabled.";

export type OperatorActor = {
  id: string;
  email: string;
  operatorRole?: AdminOperatorRole | null;
};

export type PublicOperator = {
  id: string;
  email: string;
  name: string;
  role: AdminOperatorRole;
  enabled: boolean;
  updatedAt: string;
};

type OperatorRow = {
  user_id: string;
  role: string;
  enabled: number;
};

type ListedOperatorRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  enabled: number;
  updatedAt: string;
};

function isMissingOperatorTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /no such table:\s*(admin_operator|operator_audit_events)/i.test(message);
}

function isLastSuperAdminGuardError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /last enabled super admin/i.test(message);
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseEnabledFlag(value: number | string | boolean | null | undefined): boolean {
  return value === 1 || value === "1" || value === true;
}

function parseOperatorRole(value: unknown): AdminOperatorRole | null {
  if (value === "super_admin" || value === "staff") {
    return value;
  }
  return null;
}

function publicOperator(row: ListedOperatorRow): PublicOperator {
  const role = parseOperatorRole(row.role);
  if (!role) {
    throw new AppError("UNAVAILABLE", "Operator role is invalid.", { expose: false });
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role,
    enabled: parseEnabledFlag(row.enabled),
    updatedAt: row.updatedAt,
  };
}

function assertNoSecrets(payload: unknown): void {
  const text = JSON.stringify(payload);
  if (/"password"\s*:/i.test(text) || /"hash"\s*:/i.test(text) || /"secret"\s*:/i.test(text)) {
    throw new AppError("UNAVAILABLE", "Operator payload refused.", { expose: false });
  }
}

export function isSuperAdmin(actor: OperatorActor): boolean {
  return actor.operatorRole === "super_admin";
}

export function requireSuperAdmin(actor: OperatorActor): void {
  if (!isSuperAdmin(actor)) {
    throw new AppError("FORBIDDEN", "User management is restricted to super admins.");
  }
}

export async function operatorsProvisioned(db: D1Database): Promise<boolean> {
  try {
    const row = await db.prepare("SELECT COUNT(*) AS n FROM admin_operator").first<{ n: number }>();
    return Number(row?.n ?? 0) > 0;
  } catch (error) {
    if (isMissingOperatorTable(error)) {
      return false;
    }
    throw error;
  }
}

export async function loadOperator(
  db: D1Database,
  userId: string,
): Promise<{ role: AdminOperatorRole; enabled: boolean } | null> {
  try {
    const row = await db
      .prepare("SELECT user_id, role, enabled FROM admin_operator WHERE user_id = ?")
      .bind(userId)
      .first<OperatorRow>();
    if (!row) {
      return null;
    }
    const role = parseOperatorRole(row.role);
    if (!role) {
      return null;
    }
    return { role, enabled: parseEnabledFlag(row.enabled) };
  } catch (error) {
    if (isMissingOperatorTable(error)) {
      return null;
    }
    throw error;
  }
}

export async function assertLivePasswordSession(
  db: D1Database,
  userId: string,
  sessionId: string,
): Promise<void> {
  if (!sessionId) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }
  const row = await db
    .prepare('SELECT id FROM "session" WHERE id = ? AND "userId" = ?')
    .bind(sessionId, userId)
    .first<{ id: string }>();
  if (!row) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }
}

export async function attachOperatorRole<T extends { id: string }>(
  db: D1Database,
  identity: T,
  livePasswordSession?: { id: string } | null,
): Promise<T & { operatorRole: AdminOperatorRole | null }> {
  if (livePasswordSession) {
    await assertLivePasswordSession(db, identity.id, livePasswordSession.id);
  }
  if (!(await operatorsProvisioned(db))) {
    return { ...identity, operatorRole: null };
  }
  const operator = await loadOperator(db, identity.id);
  if (!operator || !operator.enabled) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }
  return { ...identity, operatorRole: operator.role };
}

function auditStatement(
  db: D1Database,
  event: {
    userId: string;
    eventType: string;
    actorId: string;
    fromValue: string | null;
    toValue: string | null;
    requestId: string;
  },
): D1Statement {
  return db
    .prepare(
      `INSERT INTO operator_audit_events
        (id, user_id, event_type, actor_id, from_value, to_value, request_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      event.userId,
      event.eventType,
      event.actorId,
      event.fromValue,
      event.toValue,
      event.requestId,
      new Date().toISOString(),
    );
}

function revokeSessionsStatement(db: D1Database, userId: string): D1Statement {
  return db.prepare('DELETE FROM "session" WHERE "userId" = ?').bind(userId);
}

async function countOtherEnabledSuperAdmins(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM admin_operator WHERE role = 'super_admin' AND enabled = 1 AND user_id != ?",
    )
    .bind(userId)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

async function commitOperatorSecurityBatch(
  db: D1Database,
  statements: D1Statement[],
): Promise<D1QueryResult[]> {
  try {
    return await db.batch(statements);
  } catch (error) {
    if (isLastSuperAdminGuardError(error)) {
      throw new AppError("FORBIDDEN", LAST_ENABLED_SUPER_ADMIN_MESSAGE);
    }
    throw error;
  }
}

function validateEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) {
    throw new AppError("VALIDATION_FAILED", "Enter a valid email address.", {
      fields: { email: "Enter a valid email address." },
    });
  }
  return normalized;
}

function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new AppError("VALIDATION_FAILED", "Enter a name.", {
      fields: { name: "Enter a name between 1 and 80 characters." },
    });
  }
  return trimmed;
}

function validateNewPassword(password: string, confirmPassword: string, minLength: number): string {
  if (password.length < minLength) {
    throw new AppError(
      "VALIDATION_FAILED",
      `New password must be at least ${minLength} characters.`,
      { fields: { password: `Use at least ${minLength} characters.` } },
    );
  }
  if (password.length > ADMIN_PASSWORD_MAX_LENGTH) {
    throw new AppError("VALIDATION_FAILED", "New password is too long.", {
      fields: { password: "New password is too long." },
    });
  }
  if (password !== confirmPassword) {
    throw new AppError("VALIDATION_FAILED", "New password and confirmation do not match.", {
      fields: { confirmPassword: "New password and confirmation do not match." },
    });
  }
  return password;
}

async function getPublicOperator(db: D1Database, userId: string): Promise<PublicOperator> {
  const row = await db
    .prepare(
      `SELECT o.user_id AS id, u.email AS email, u.name AS name, o.role AS role,
              o.enabled AS enabled, o.updated_at AS updatedAt
       FROM admin_operator AS o
       JOIN "user" AS u ON u.id = o.user_id
       WHERE o.user_id = ?`,
    )
    .bind(userId)
    .first<ListedOperatorRow>();
  if (!row) {
    throw new AppError("NOT_FOUND", "Operator not found.");
  }
  const operator = publicOperator(row);
  assertNoSecrets(operator);
  return operator;
}

export async function listOperators(env: AppEnv): Promise<{ items: PublicOperator[] }> {
  const result = await env.DB.prepare(
    `SELECT o.user_id AS id, u.email AS email, u.name AS name, o.role AS role,
            o.enabled AS enabled, o.updated_at AS updatedAt
     FROM admin_operator AS o
     JOIN "user" AS u ON u.id = o.user_id
     ORDER BY u.email COLLATE NOCASE`,
  ).all<ListedOperatorRow>();
  const items = (result.results ?? []).map(publicOperator);
  assertNoSecrets(items);
  return { items };
}

export async function handleListOperators(
  env: AppEnv,
  actor: OperatorActor,
  requestId: string,
): Promise<Response> {
  requireSuperAdmin(actor);
  return json(await listOperators(env), 200, requestId);
}

export async function handleCreateStaff(
  request: Request,
  env: AppEnv,
  actor: OperatorActor,
  requestId: string,
): Promise<Response> {
  requireSuperAdmin(actor);
  if (!(await operatorsProvisioned(env.DB))) {
    throw new AppError("FORBIDDEN", "Operator directory is not provisioned.");
  }
  const body = (await readJson(request)) as Record<string, unknown>;
  if ("role" in body || "roles" in body || "superAdmin" in body) {
    throw new AppError("FORBIDDEN", "New operators are created as staff.");
  }
  const name = validateName(asNonEmptyString(body.name) ?? "");
  const email = validateEmail(asNonEmptyString(body.email) ?? "");
  const password = asNonEmptyString(body.password);
  const confirmPassword = asNonEmptyString(body.confirmPassword);
  if (!password) {
    throw new AppError("VALIDATION_FAILED", "New password is required.", {
      fields: { password: "New password is required." },
    });
  }
  if (!confirmPassword) {
    throw new AppError("VALIDATION_FAILED", "Confirm the new password.", {
      fields: { confirmPassword: "Confirm the new password." },
    });
  }
  const minLength = adminPasswordMinLength(env, request);
  const nextPassword = validateNewPassword(password, confirmPassword, minLength);

  const existing = await env.DB.prepare('SELECT id FROM "user" WHERE lower(email) = ?')
    .bind(email)
    .first<{ id: string }>();
  if (existing) {
    throw new AppError("CONFLICT", "An operator with this email already exists.", {
      fields: { email: "An operator with this email already exists." },
    });
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const passwordHash = await hashPassword(nextPassword);
  await commitOperatorSecurityBatch(env.DB, [
    env.DB.prepare(
      `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
       VALUES (?, ?, ?, 1, NULL, ?, ?)`,
    ).bind(userId, name, email, now, now),
    env.DB.prepare(
      `INSERT INTO "account" (
         "id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken",
         "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt"
       ) VALUES (?, ?, 'credential', ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?)`,
    ).bind(accountId, userId, userId, passwordHash, now, now),
    env.DB.prepare(
      `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
       VALUES (?, 'staff', 1, ?, ?, ?)`,
    ).bind(userId, now, now, actor.id),
    auditStatement(env.DB, {
      userId,
      eventType: "operator_created",
      actorId: actor.id,
      fromValue: null,
      toValue: "staff:enabled",
      requestId,
    }),
  ]);
  const item = await getPublicOperator(env.DB, userId);
  return json({ item }, 201, requestId);
}

export async function handlePatchOperator(
  request: Request,
  env: AppEnv,
  actor: OperatorActor,
  userId: string,
  requestId: string,
): Promise<Response> {
  requireSuperAdmin(actor);
  const body = (await readJson(request)) as Record<string, unknown>;
  if ("password" in body || "hash" in body || "secret" in body) {
    throw new AppError("FORBIDDEN", "Use the password reset endpoint to change credentials.");
  }
  const hasRole = "role" in body;
  const hasEnabled = "enabled" in body;
  if (!hasRole && !hasEnabled) {
    throw new AppError("VALIDATION_FAILED", "Provide a role or enabled flag.");
  }

  const current = await loadOperator(env.DB, userId);
  if (!current) {
    throw new AppError("NOT_FOUND", "Operator not found.");
  }

  let nextRole = current.role;
  if (hasRole) {
    const parsed = parseOperatorRole(body.role);
    if (!parsed) {
      throw new AppError("FORBIDDEN", "Operator role must be super_admin or staff.");
    }
    nextRole = parsed;
  }

  let nextEnabled = current.enabled;
  if (hasEnabled) {
    if (typeof body.enabled !== "boolean") {
      throw new AppError("VALIDATION_FAILED", "Enabled must be true or false.", {
        fields: { enabled: "Enabled must be true or false." },
      });
    }
    nextEnabled = body.enabled;
  }

  const roleChanged = nextRole !== current.role;
  const enabledChanged = nextEnabled !== current.enabled;
  if (!roleChanged && !enabledChanged) {
    return json({ item: await getPublicOperator(env.DB, userId) }, 200, requestId);
  }

  const wouldRemoveLastSuperAdmin =
    current.role === "super_admin" &&
    current.enabled &&
    (nextRole !== "super_admin" || nextEnabled === false) &&
    (await countOtherEnabledSuperAdmins(env.DB, userId)) === 0;
  if (wouldRemoveLastSuperAdmin) {
    throw new AppError("FORBIDDEN", LAST_ENABLED_SUPER_ADMIN_MESSAGE);
  }

  const now = new Date().toISOString();
  const nextEnabledFlag = nextEnabled ? 1 : 0;
  const statements: D1Statement[] = [
    env.DB.prepare(
      `UPDATE admin_operator
       SET role = ?, enabled = ?, updated_at = ?, updated_by = ?
       WHERE user_id = ?`,
    ).bind(nextRole, nextEnabledFlag, now, actor.id, userId),
  ];
  if (roleChanged) {
    statements.push(
      auditStatement(env.DB, {
        userId,
        eventType: "operator_role_changed",
        actorId: actor.id,
        fromValue: current.role,
        toValue: nextRole,
        requestId,
      }),
    );
  }
  if (enabledChanged) {
    statements.push(
      auditStatement(env.DB, {
        userId,
        eventType: nextEnabled ? "operator_enabled" : "operator_disabled",
        actorId: actor.id,
        fromValue: current.enabled ? "enabled" : "disabled",
        toValue: nextEnabled ? "enabled" : "disabled",
        requestId,
      }),
    );
  }
  statements.push(revokeSessionsStatement(env.DB, userId));

  await commitOperatorSecurityBatch(env.DB, statements);
  return json({ item: await getPublicOperator(env.DB, userId) }, 200, requestId);
}

export async function handleResetOperatorPassword(
  request: Request,
  env: AppEnv,
  actor: OperatorActor,
  userId: string,
  requestId: string,
): Promise<Response> {
  requireSuperAdmin(actor);
  const current = await loadOperator(env.DB, userId);
  if (!current) {
    throw new AppError("NOT_FOUND", "Operator not found.");
  }
  const body = (await readJson(request)) as Record<string, unknown>;
  const password = asNonEmptyString(body.password) ?? asNonEmptyString(body.newPassword);
  const confirmPassword = asNonEmptyString(body.confirmPassword);
  if (!password) {
    throw new AppError("VALIDATION_FAILED", "New password is required.", {
      fields: { password: "New password is required." },
    });
  }
  if (!confirmPassword) {
    throw new AppError("VALIDATION_FAILED", "Confirm the new password.", {
      fields: { confirmPassword: "Confirm the new password." },
    });
  }
  const minLength = adminPasswordMinLength(env, request);
  const nextPassword = validateNewPassword(password, confirmPassword, minLength);
  const account = await env.DB.prepare(
    'SELECT id FROM "account" WHERE "userId" = ? AND "providerId" = ?',
  )
    .bind(userId, "credential")
    .first<{ id: string }>();
  if (!account) {
    throw new AppError("FORBIDDEN", "Password reset is not available for this sign-in method.");
  }
  const passwordHash = await hashPassword(nextPassword);
  const now = new Date().toISOString();
  await commitOperatorSecurityBatch(env.DB, [
    env.DB.prepare('UPDATE "account" SET "password" = ?, "updatedAt" = ? WHERE "id" = ?').bind(
      passwordHash,
      now,
      account.id,
    ),
    revokeSessionsStatement(env.DB, userId),
    auditStatement(env.DB, {
      userId,
      eventType: "operator_password_reset",
      actorId: actor.id,
      fromValue: null,
      toValue: "reset",
      requestId,
    }),
  ]);
  return json({ ok: true }, 200, requestId);
}
