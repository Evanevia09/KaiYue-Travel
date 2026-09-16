import { AppError, createRequestId, toErrorBody, type ErrorCode } from "@kaiyue/contracts";

export const JSON_LIMIT_BYTES = 16_384;

export function requestIdFrom(request: Request, existing?: string): string {
  return existing || request.headers.get("cf-ray") || createRequestId();
}

export function json(data: unknown, status = 200, requestId?: string): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (requestId) {
    headers.set("x-request-id", requestId);
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof AppError) {
    return json(toErrorBody(error, requestId), error.status, requestId);
  }
  return json(
    toErrorBody(
      new AppError("UNAVAILABLE", "Something went wrong. Please try again.", { expose: false }),
      requestId,
    ),
    500,
    requestId,
  );
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new AppError("VALIDATION_FAILED", "Send a JSON request.", { status: 400 });
  }
  const text = await request.text();
  if (text.length > JSON_LIMIT_BYTES) {
    throw new AppError("VALIDATION_FAILED", "Request is too large.", { status: 413 });
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("VALIDATION_FAILED", "Request JSON is invalid.", { status: 400 });
  }
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local"
  );
}

export function fail(code: ErrorCode, message: string, fields?: Record<string, string>): never {
  throw new AppError(code, message, { fields });
}

export function logSafe(
  level: "info" | "warn" | "error",
  message: string,
  meta: Record<string, string | number | boolean | undefined>,
): void {
  const payload = { level, message, ...meta, ts: new Date().toISOString() };
  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }
  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }
  console.log(JSON.stringify(payload));
}
