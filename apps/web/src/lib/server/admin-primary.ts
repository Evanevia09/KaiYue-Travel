import { AppError } from "@kaiyue/contracts";
import type { AdminOperatorRole } from "./admin-operator.ts";
import {
  isDedicatedAdminHost,
  isProductionHost,
  PRODUCTION_ADMIN_HOST,
  requestHost,
} from "./admin-gate.ts";
import type { AppEnv } from "./env.ts";

export const ADMIN_ROLE_STAFF = "staff";
export const ADMIN_ROLE_PRIMARY = "primary";
export const ADMIN_ROLES = [ADMIN_ROLE_STAFF, ADMIN_ROLE_PRIMARY] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Verified owner identity for the production primary operator. Not an allowlist label. */
export const VERIFIED_PRODUCTION_PRIMARY_EMAIL = "daniel@kaiyuemacau.com";

/** Isolated trial fixture identity. Never the production Daniel address. */
export const TRIAL_OPERATOR_EMAIL = "admin-trial@kaiyue.test";

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
    requestHost(request) === PRODUCTION_ADMIN_HOST &&
    (env.ENVIRONMENT ?? "").trim().toLowerCase() === "production"
  );
}

export function liveAdminRequiresPrimary(
  env: Pick<AppEnv, "ENVIRONMENT">,
  request: Request,
): boolean {
  return productionDedicatedHostRequiresPrimary(env, request) || isProductionHost(request);
}

export function temporaryAdminExpiryApplies(
  _env: Pick<AppEnv, "ENVIRONMENT">,
  request: Request,
): boolean {
  return !isDedicatedAdminHost(request);
}

export function effectiveAdminRole(
  email: string,
  env: Pick<AppEnv, "ADMIN_PRIMARY_EMAIL">,
): AdminRole {
  return isPrimaryAdminEmail(email, env) ? ADMIN_ROLE_PRIMARY : ADMIN_ROLE_STAFF;
}

export function assertPrimaryOperator(
  actor: { email: string },
  env: Pick<AppEnv, "ENVIRONMENT" | "ADMIN_PRIMARY_EMAIL" | "ADMIN_EMAILS">,
  request: Request,
): void {
  const primary = primaryAdminEmail(env);
  if (liveAdminRequiresPrimary(env, request) && !primary) {
    throw new AppError("FORBIDDEN", "Primary operator is not configured.");
  }
  if (primary && !isPrimaryAdminEmail(actor.email, env)) {
    throw new AppError("FORBIDDEN", "Primary operator authentication is required.");
  }
}

export type DisplayedAdminRole = AdminRole | AdminOperatorRole;

export function adminProfilePayload(
  actor: { id: string; email: string; operatorRole?: AdminOperatorRole | null },
  env: Pick<AppEnv, "ADMIN_PRIMARY_EMAIL">,
): { email: string; role: DisplayedAdminRole } {
  if (actor.operatorRole === "super_admin" || actor.operatorRole === "staff") {
    return { email: actor.email, role: actor.operatorRole };
  }
  return {
    email: actor.email,
    role: effectiveAdminRole(actor.email, env),
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
