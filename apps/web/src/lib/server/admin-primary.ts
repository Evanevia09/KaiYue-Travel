import { AppError } from "@kaiyue/contracts";
import { ACCESS_ADMIN_HOST, requestHost } from "./admin-gate.ts";
import type { AppEnv } from "./env.ts";

export const ADMIN_ROLE_STAFF = "staff";
export const ADMIN_ROLE_PRIMARY = "primary";
export const ADMIN_ROLES = [ADMIN_ROLE_STAFF, ADMIN_ROLE_PRIMARY] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Verified owner identity for the production primary operator. Not an allowlist label. */
export const VERIFIED_PRODUCTION_PRIMARY_EMAIL = "daniel@kaiyuemacau.com";

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function primaryAdminEmail(env: Pick<AppEnv, "ADMIN_PRIMARY_EMAIL">): string | null {
  const email = env.ADMIN_PRIMARY_EMAIL?.trim().toLowerCase();
  return email || null;
}

export function isPrimaryAdminEmail(
  email: string,
  env: Pick<AppEnv, "ADMIN_PRIMARY_EMAIL">,
): boolean {
  const primary = primaryAdminEmail(env);
  return Boolean(primary && normalizeAdminEmail(email) === primary);
}

export function productionDedicatedHostRequiresPrimary(
  env: Pick<AppEnv, "ENVIRONMENT">,
  request: Request,
): boolean {
  return (
    requestHost(request) === ACCESS_ADMIN_HOST &&
    (env.ENVIRONMENT ?? "").trim().toLowerCase() === "production"
  );
}

export function temporaryAdminExpiryApplies(
  env: Pick<AppEnv, "ENVIRONMENT">,
  request: Request,
): boolean {
  return !productionDedicatedHostRequiresPrimary(env, request);
}

export async function readPersistedAdminRole(
  env: AppEnv,
  userId: string,
): Promise<AdminRole | null> {
  try {
    const row = await env.DB.prepare('SELECT "role" FROM "user" WHERE "id" = ?')
      .bind(userId)
      .first<{ role?: string }>();
    if (row?.role === ADMIN_ROLE_PRIMARY || row?.role === ADMIN_ROLE_STAFF) {
      return row.role;
    }
    return null;
  } catch {
    // Live D1 06cf879d at 2026-11-15 14:18 had no role column. Additive 0009 is not applied yet.
    return null;
  }
}

export function effectiveAdminRole(
  email: string,
  persisted: AdminRole | null,
  env: Pick<AppEnv, "ADMIN_PRIMARY_EMAIL">,
): AdminRole {
  if (isPrimaryAdminEmail(email, env)) {
    return ADMIN_ROLE_PRIMARY;
  }
  if (persisted === ADMIN_ROLE_PRIMARY) {
    return ADMIN_ROLE_STAFF;
  }
  return persisted ?? ADMIN_ROLE_STAFF;
}

export function assertProductionPrimaryOperator(
  actor: { email: string },
  env: Pick<AppEnv, "ENVIRONMENT" | "ADMIN_PRIMARY_EMAIL" | "ADMIN_EMAILS">,
  request: Request,
  allowedEmails: Set<string>,
): void {
  if (!productionDedicatedHostRequiresPrimary(env, request)) {
    return;
  }
  const primary = primaryAdminEmail(env);
  if (!primary || !allowedEmails.has(primary)) {
    throw new AppError("FORBIDDEN", "Primary operator is not configured.");
  }
  if (!isPrimaryAdminEmail(actor.email, env)) {
    throw new AppError("FORBIDDEN", "Primary operator authentication is required.");
  }
}

export async function adminProfilePayload(
  actor: { id: string; email: string },
  env: AppEnv,
): Promise<{ email: string; role: AdminRole }> {
  const persisted = await readPersistedAdminRole(env, actor.id);
  return {
    email: actor.email,
    role: effectiveAdminRole(actor.email, persisted, env),
  };
}

export function rejectRoleMutation(record: Record<string, unknown>): void {
  if ("role" in record || "roles" in record || "isPrimary" in record || "superAdmin" in record) {
    throw new AppError("FORBIDDEN", "Operator roles cannot be changed from this workspace.");
  }
}

export function refuseRoleChange(): never {
  throw new AppError("FORBIDDEN", "Operator roles cannot be changed from this workspace.");
}
