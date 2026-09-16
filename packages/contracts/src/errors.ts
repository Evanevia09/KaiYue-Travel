export const ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "IDEMPOTENCY_CONFLICT",
  "INVALID_TRANSITION",
  "UNAVAILABLE",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type FieldErrors = Record<string, string>;

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    fields?: FieldErrors;
    requestId: string;
  };
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: FieldErrors;
  readonly expose: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { status?: number; fields?: FieldErrors; expose?: boolean; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? statusForCode(code);
    this.fields = options?.fields;
    this.expose = options?.expose ?? true;
  }
}

export function statusForCode(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_FAILED":
      return 422;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
    case "IDEMPOTENCY_CONFLICT":
    case "INVALID_TRANSITION":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "UNAVAILABLE":
      return 503;
    default:
      return 500;
  }
}

export function toErrorBody(error: AppError, requestId: string): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.expose ? error.message : "Something went wrong. Please try again.",
      ...(error.fields ? { fields: error.fields } : {}),
      requestId,
    },
  };
}
