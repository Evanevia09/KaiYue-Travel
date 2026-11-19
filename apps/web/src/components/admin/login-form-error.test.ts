import { describe, expect, it } from "vitest";
import { PASSWORD_LOCKOUT_MESSAGE } from "../../lib/password-sign-in-copy.ts";
import {
  isPasswordLockoutError,
  loginFormErrorMessage,
  minutesFromRetryAfter,
} from "./login-form-error.ts";

describe("login form lockout copy", () => {
  it("maps 429 and RATE_LIMITED to generic five-minute wait copy", () => {
    expect(isPasswordLockoutError({ status: 429 })).toBe(true);
    expect(isPasswordLockoutError({ code: "RATE_LIMITED" })).toBe(true);
    expect(isPasswordLockoutError({ message: PASSWORD_LOCKOUT_MESSAGE })).toBe(true);
    expect(isPasswordLockoutError({ error: { code: "RATE_LIMITED", retryAfter: 297 } })).toBe(true);
    expect(isPasswordLockoutError({ status: 401, message: "Invalid email or password" })).toBe(
      false,
    );

    expect(loginFormErrorMessage("en", { status: 429 }, "297")).toBe(
      "Too many sign-in attempts. Please wait 5 minutes and try again.",
    );
    expect(loginFormErrorMessage("zh-Hant", { code: "RATE_LIMITED" }, 120)).toBe(
      "登入嘗試次數過多。請等待 2 分鐘後再試。",
    );
    expect(loginFormErrorMessage("en", { status: 429 }, 60)).toBe(
      "Too many sign-in attempts. Please wait 1 minute and try again.",
    );
    expect(loginFormErrorMessage("en", { status: 401, message: "Invalid email or password" })).toBe(
      "Sign-in failed. Check your credentials or ask the administrator for access.",
    );
    expect(JSON.stringify(loginFormErrorMessage("en", { status: 429 }, "300"))).not.toMatch(
      /exists|unknown|disabled|staff@/i,
    );
  });

  it("ceils Retry-After seconds to whole minutes and defaults to five", () => {
    expect(minutesFromRetryAfter("297")).toBe(5);
    expect(minutesFromRetryAfter(60)).toBe(1);
    expect(minutesFromRetryAfter(null)).toBe(5);
  });
});
