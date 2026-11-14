import { describe, expect, it } from "vitest";
import {
  ACCESS_ADMIN_HOST,
  STAGING_HOSTS,
  adminPasswordMinLength,
  passwordMeetsAdminMin,
  stagingTestPasswordMinEnabled,
} from "../../apps/web/src/lib/server/admin-gate.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

const stagingOrigin = `https://${STAGING_HOSTS[0]}`;
const productionOrigin = "https://kaiyuemacau.com";
const wwwOrigin = "https://www.kaiyuemacau.com";
const legacyOrigin = "https://kaiyue-travel.scalingsmb.workers.dev";
const accessOrigin = `https://${ACCESS_ADMIN_HOST}`;
const previewOrigin = "https://preview-kaiyue-travel.scalingsmb.workers.dev";
const six = "uat6pw";
const five = "uat5x";
const sixteen = "local-only-test-password-2026";
const futureExpiry = "2099-01-01T00:00:00.000Z";

function stagingFlagEnv() {
  return createTestEnv({
    ENVIRONMENT: "preview",
    DEV_ADMIN_BYPASS: "false",
    ADMIN_EMAILS: "operator@example.invalid",
    TEMP_ADMIN_EXPIRES_AT: futureExpiry,
    ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
    BETTER_AUTH_SECRET: "test-only-isolated-d1-secret-0123456789abcdef",
    PUBLIC_SITE_URL: stagingOrigin,
  });
}

describe("staging-only six-character admin password minimum", () => {
  it("allows six on the staging host with the exact flag, and rejects shorter", () => {
    const env = stagingFlagEnv();
    const request = new Request(`${stagingOrigin}/login`);
    expect(stagingTestPasswordMinEnabled(env, request)).toBe(true);
    expect(adminPasswordMinLength(env, request)).toBe(6);
    expect(passwordMeetsAdminMin(six, 6)).toBe(true);
    expect(passwordMeetsAdminMin(five, 6)).toBe(false);
    expect(passwordMeetsAdminMin(sixteen, 6)).toBe(true);
  });

  it("keeps production at 16 despite staging flags and spoofed hosts", () => {
    const flaggedPreview = stagingFlagEnv();
    const flaggedProduction = createTestEnv({
      ENVIRONMENT: "production",
      DEV_ADMIN_BYPASS: "false",
      ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
      ADMIN_EMAILS: "operator@example.invalid",
      TEMP_ADMIN_EXPIRES_AT: futureExpiry,
      PUBLIC_SITE_URL: productionOrigin,
    });

    for (const origin of [productionOrigin, wwwOrigin, legacyOrigin, accessOrigin]) {
      const request = new Request(`${origin}/login`);
      expect(adminPasswordMinLength(flaggedPreview, request), origin).toBe(16);
      expect(adminPasswordMinLength(flaggedProduction, request), origin).toBe(16);
    }

    const spoofedStaging = new Request(`${stagingOrigin}/login`);
    expect(adminPasswordMinLength(flaggedProduction, spoofedStaging)).toBe(16);
    expect(adminPasswordMinLength(flaggedPreview, spoofedStaging)).toBe(6);

    expect(adminPasswordMinLength(flaggedPreview, new Request(`${previewOrigin}/login`))).toBe(16);
    expect(adminPasswordMinLength(flaggedPreview)).toBe(16);
    expect(
      adminPasswordMinLength(
        { ...flaggedPreview, ADMIN_STAGING_TEST_PASSWORD_MIN: "16" },
        spoofedStaging,
      ),
    ).toBe(16);
    expect(
      adminPasswordMinLength(
        { ...flaggedPreview, ADMIN_STAGING_TEST_PASSWORD_MIN: "" },
        spoofedStaging,
      ),
    ).toBe(16);
  });
});
