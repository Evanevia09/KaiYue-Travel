import { AppError } from "@kaiyue/contracts";
import { passwordAdminAllowed } from "./admin-gate.ts";
import { adminProfilePayload, refuseRoleChange, rejectRoleMutation } from "./admin-primary.ts";
import { ADMIN_PASSWORD_MIN_LENGTH, createAdminSessionAuth } from "./admin-session.ts";
import type { AdminIdentity } from "./auth.ts";
import type { AppEnv } from "./env.ts";
import { json, readJson } from "./http.ts";

const IDENTITY_FIELDS = ["userId", "id", "email", "targetEmail", "targetUserId"] as const;

export async function readOwnAdminProfile(
  env: AppEnv,
  actor: AdminIdentity,
  requestId: string,
): Promise<Response> {
  return json(await adminProfilePayload(actor, env), 200, requestId);
}

export function refuseAdminRoleChange(): never {
  refuseRoleChange();
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mapPasswordChangeError(error: unknown): never {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";
  if (/invalid password/i.test(message)) {
    throw new AppError("VALIDATION_FAILED", "Current password is incorrect.");
  }
  if (/too short/i.test(message) || /PASSWORD_TOO_SHORT/i.test(message)) {
    throw new AppError(
      "VALIDATION_FAILED",
      `New password must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters.`,
    );
  }
  if (/too long/i.test(message) || /PASSWORD_TOO_LONG/i.test(message)) {
    throw new AppError("VALIDATION_FAILED", "New password is too long.");
  }
  if (/credential account/i.test(message)) {
    throw new AppError("FORBIDDEN", "Password change is not available for this sign-in method.");
  }
  throw new AppError("UNAVAILABLE", "Could not change password.", { expose: false });
}

export async function changeOwnAdminPassword(
  request: Request,
  env: AppEnv,
  actor: AdminIdentity,
  requestId: string,
): Promise<Response> {
  if (!passwordAdminAllowed(env, request)) {
    throw new AppError("FORBIDDEN", "Password change is not available for this sign-in method.");
  }
  if (actor.id === "dev-admin") {
    throw new AppError("FORBIDDEN", "Password change is not available for this sign-in method.");
  }

  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("VALIDATION_FAILED", "Send a JSON request.");
  }
  const record = body as Record<string, unknown>;
  rejectRoleMutation(record);
  for (const field of IDENTITY_FIELDS) {
    if (field in record) {
      throw new AppError("FORBIDDEN", "You can only change your own password.");
    }
  }

  const currentPassword = asNonEmptyString(record.currentPassword);
  const newPassword = asNonEmptyString(record.newPassword);
  const confirmPassword = asNonEmptyString(record.confirmPassword);
  if (!currentPassword) {
    throw new AppError("VALIDATION_FAILED", "Current password is required.", {
      fields: { currentPassword: "Required" },
    });
  }
  if (!newPassword) {
    throw new AppError("VALIDATION_FAILED", "New password is required.", {
      fields: { newPassword: "Required" },
    });
  }
  if (!confirmPassword) {
    throw new AppError("VALIDATION_FAILED", "Confirm the new password.", {
      fields: { confirmPassword: "Required" },
    });
  }
  if (newPassword !== confirmPassword) {
    throw new AppError("VALIDATION_FAILED", "New password and confirmation do not match.", {
      fields: { confirmPassword: "Must match" },
    });
  }
  if (newPassword.length < ADMIN_PASSWORD_MIN_LENGTH) {
    throw new AppError(
      "VALIDATION_FAILED",
      `New password must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters.`,
      { fields: { newPassword: `At least ${ADMIN_PASSWORD_MIN_LENGTH} characters` } },
    );
  }

  const auth = createAdminSessionAuth(env, false, request);
  try {
    const authResponse = await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      headers: request.headers,
      asResponse: true,
    });
    if (!authResponse.ok) {
      const payload = (await authResponse.json().catch(() => ({}))) as { message?: string };
      mapPasswordChangeError(payload);
    }
    const response = json({ ok: true }, 200, requestId);
    for (const cookie of authResponse.headers.getSetCookie()) {
      response.headers.append("set-cookie", cookie);
    }
    return response;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    mapPasswordChangeError(error);
  }
}
