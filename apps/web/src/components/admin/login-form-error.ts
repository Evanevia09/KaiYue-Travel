import {
  PASSWORD_LOCKOUT_MESSAGE,
  PASSWORD_LOCKOUT_MINUTES,
} from "../../lib/password-sign-in-copy.ts";
import { t, type AdminLocale } from "../../lib/admin-i18n.ts";

export type SignInClientError = {
  status?: number;
  statusText?: string;
  message?: string;
  code?: string;
  retryAfter?: number;
  error?: SignInClientError;
};

export function minutesFromRetryAfter(retryAfter: string | number | null | undefined): number {
  const seconds = typeof retryAfter === "number" ? retryAfter : Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) return PASSWORD_LOCKOUT_MINUTES;
  return Math.max(1, Math.ceil(seconds / 60));
}

function nestedError(error: SignInClientError | null | undefined): SignInClientError | undefined {
  return error?.error && typeof error.error === "object" ? error.error : undefined;
}

export function isPasswordLockoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as SignInClientError;
  const inner = nestedError(record);
  return (
    record.status === 429 ||
    record.code === "RATE_LIMITED" ||
    record.message === PASSWORD_LOCKOUT_MESSAGE ||
    inner?.status === 429 ||
    inner?.code === "RATE_LIMITED" ||
    inner?.message === PASSWORD_LOCKOUT_MESSAGE
  );
}

function retryAfterFromError(error: SignInClientError): number | undefined {
  const inner = nestedError(error);
  if (typeof error.retryAfter === "number") return error.retryAfter;
  if (typeof inner?.retryAfter === "number") return inner.retryAfter;
  return undefined;
}

export function loginFormErrorMessage(
  locale: AdminLocale,
  error: unknown,
  retryAfterHeader?: string | number | null,
): string {
  if (isPasswordLockoutError(error)) {
    const record = error && typeof error === "object" ? (error as SignInClientError) : undefined;
    const minutes = minutesFromRetryAfter(
      retryAfterHeader ?? (record ? retryAfterFromError(record) : undefined),
    );
    if (minutes === 1) return t(locale, "login.errorLockoutOne");
    return t(locale, "login.errorLockout", { minutes });
  }
  return t(locale, "login.errorCredentials");
}
