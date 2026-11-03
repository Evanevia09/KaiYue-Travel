import { describe, expect, it } from "vitest";
import {
  applyTime,
  combineDateAndTime,
  formatCompactDateTime,
  formatFieldDateTime,
  formatFooterDate,
  formatTimeOrPlaceholder,
  HOURS_24,
  isTimeDraftComplete,
  monthGrid,
  nextWheelValue,
  parseLocalDateTime,
  roundMinutes,
  splitTime,
  TIME_PLACEHOLDER,
  toHours24,
} from "./datetime.ts";

describe("booking datetime helpers", () => {
  it("formats the closed field and footer the way the picker displays them", () => {
    expect(formatFieldDateTime("2026-09-23T14:45")).toBe("Wed, Sep 23 · 14:45");
    expect(formatCompactDateTime("2026-10-20T14:45")).toBe("Oct 20 · 14:45");
    expect(formatFooterDate("2026-09-23T14:45")).toBe("Wed, Sep 23, 2026");
  });

  it("builds a Monday-first September 2026 grid", () => {
    const cells = monthGrid(2026, 8);
    expect(cells[0]).toBeNull();
    expect(cells[1]?.getDate()).toBe(1);
    expect(cells[1]?.getDay()).toBe(2);
    expect(cells.filter(Boolean)).toHaveLength(30);
  });

  it("keeps an existing time when a new day is chosen", () => {
    const next = combineDateAndTime(new Date(2026, 9, 20), "2026-09-23T14:45");
    expect(next).toBe("2026-10-20T14:45");
    expect(parseLocalDateTime(next)?.getHours()).toBe(14);
  });

  it("converts 12-hour wheels and rounded minutes back to a local value", () => {
    expect(toHours24(2, "PM")).toBe(14);
    expect(toHours24(12, "AM")).toBe(0);
    expect(roundMinutes(47)).toBe(45);
    expect(applyTime("2026-09-23T12:00", 14, 45)).toBe("2026-09-23T14:45");
  });

  it("starts a time draft blank so the visitor must choose hour and minute", () => {
    const blank = splitTime(undefined);
    expect(blank.hours24).toBeUndefined();
    expect(blank.minutes).toBeUndefined();
    expect(isTimeDraftComplete(blank)).toBe(false);
    expect(formatTimeOrPlaceholder(null, false)).toBe(TIME_PLACEHOLDER);
    expect(TIME_PLACEHOLDER).toBe("--:--");
    expect(isTimeDraftComplete(splitTime("2026-09-23T14:45"))).toBe(true);
    expect(nextWheelValue(HOURS_24, undefined, 1)).toBe(0);
    expect(nextWheelValue(HOURS_24, undefined, -1)).toBe(23);
    expect(nextWheelValue(HOURS_24, 0, 1)).toBe(1);
  });
});
