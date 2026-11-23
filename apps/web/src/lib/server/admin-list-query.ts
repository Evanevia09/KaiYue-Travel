import { AppError } from "@kaiyue/contracts";

const SEARCH_MIN = 2;
const SEARCH_MAX = 100;
const ZONED_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

export function parseSearchQuery(raw: string | null): string | undefined {
  const value = (raw ?? "").trim();
  if (!value) {
    return undefined;
  }
  if (value.length < SEARCH_MIN || value.length > SEARCH_MAX) {
    throw new AppError("VALIDATION_FAILED", "Search must be between 2 and 100 characters.");
  }
  return value;
}

/** LIKE pattern with `\` as the escape character; use with `ESCAPE '\'`. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export function parseUpdatedSince(raw: string | null): string | undefined {
  const value = (raw ?? "").trim();
  if (!value) {
    return undefined;
  }
  const parsed = Date.parse(value);
  if (!ZONED_ISO.test(value) || !Number.isFinite(parsed)) {
    throw new AppError(
      "VALIDATION_FAILED",
      "updatedSince must be an ISO 8601 date-time with a time zone.",
    );
  }
  return new Date(parsed).toISOString();
}

export type CreatedCursor = { createdAt: string; id: string };

export function encodeCreatedCursor(cursor: CreatedCursor): string {
  return btoa(JSON.stringify(cursor));
}

export function decodeCreatedCursor(raw: string): CreatedCursor {
  let decoded: unknown;
  try {
    decoded = JSON.parse(atob(raw));
  } catch {
    throw new AppError("VALIDATION_FAILED", "Invalid page cursor.");
  }
  const value = decoded as Partial<CreatedCursor> | null;
  if (!value || typeof value.createdAt !== "string" || typeof value.id !== "string") {
    throw new AppError("VALIDATION_FAILED", "Invalid page cursor.");
  }
  return { createdAt: value.createdAt, id: value.id };
}
