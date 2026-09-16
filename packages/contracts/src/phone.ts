export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const plus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return plus ? `+${digits}` : digits;
}

export function isPlausiblePhone(normalized: string): boolean {
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}
