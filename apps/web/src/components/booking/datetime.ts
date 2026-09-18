const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
export const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const;
export const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
export const HOURS_24 = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
] as const;
export const DEFAULT_HOUR = 12;
export const DEFAULT_MINUTE = 0;

export type HourCycle = "12" | "24";
export type DayPeriod = "AM" | "PM";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseLocalDateTime(value: string): Date | null {
  const match = LOCAL_RE.exec(value);
  if (!match) {
    return null;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toLocalDateTimeValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isBeforeDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

export function roundMinutes(minutes: number): number {
  return MINUTE_OPTIONS.reduce((best, option) =>
    Math.abs(option - minutes) < Math.abs(best - minutes) ? option : best,
  );
}

export function combineDateAndTime(
  day: Date,
  timeSource?: string,
  fallbackHour = DEFAULT_HOUR,
  fallbackMinute = DEFAULT_MINUTE,
): string {
  const existing = timeSource ? parseLocalDateTime(timeSource) : null;
  const hours = existing ? existing.getHours() : fallbackHour;
  const minutes = existing ? roundMinutes(existing.getMinutes()) : fallbackMinute;
  return toLocalDateTimeValue(
    new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes),
  );
}

export function formatTime24(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatTime12(date: Date): string {
  const hours = date.getHours();
  const period: DayPeriod = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${pad(hour12)}:${pad(date.getMinutes())} ${period}`;
}

export function formatFieldDateTime(value: string): string {
  const date = parseLocalDateTime(value);
  if (!date) {
    return "";
  }
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${weekday}, ${month} ${date.getDate()} · ${formatTime24(date)}`;
}

export function formatCompactDateTime(value: string): string {
  const date = parseLocalDateTime(value);
  if (!date) {
    return "";
  }
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${month} ${date.getDate()} · ${formatTime24(date)}`;
}

export function formatFooterDate(value: string): string {
  const date = parseLocalDateTime(value);
  if (!date) {
    return "";
  }
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${weekday}, ${month} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const mondayIndex = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const cells: (Date | null)[] = Array.from({ length: mondayIndex }, () => null);
  for (let day = 1; day <= lastDate; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function toHours24(hour12: number, period: DayPeriod): number {
  if (period === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function applyTime(dateValue: string, hours24: number, minutes: number): string {
  const date = parseLocalDateTime(dateValue) ?? new Date();
  return toLocalDateTimeValue(
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours24, roundMinutes(minutes)),
  );
}

export function splitTime(value: string | undefined): {
  hours24: number;
  hours12: number;
  minutes: number;
  period: DayPeriod;
} {
  const date = value ? parseLocalDateTime(value) : null;
  const hours24 = date?.getHours() ?? DEFAULT_HOUR;
  const minutes = roundMinutes(date?.getMinutes() ?? DEFAULT_MINUTE);
  const period: DayPeriod = hours24 >= 12 ? "PM" : "AM";
  return {
    hours24,
    hours12: hours24 % 12 || 12,
    minutes,
    period,
  };
}

export function isPastDay(day: Date, now = new Date()): boolean {
  return isBeforeDay(day, now);
}
