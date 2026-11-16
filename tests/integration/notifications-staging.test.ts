import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendNotifications } from "../../apps/web/src/lib/server/notifications.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

const { sendMock, ResendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  ResendMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
    constructor(key: string) {
      ResendMock(key);
    }
  },
}));

const input = {
  kind: "booking" as const,
  reference: "KY-TEST-1",
  requestId: "req-test",
  summary: "test only",
};

const dummyDelivery = {
  ENVIRONMENT: "production",
  RESEND_API_KEY: "re_test_not_a_live_key",
  RESEND_FROM: "Kai Yue Travel <notifications@example.invalid>",
  RESEND_STAFF_TO: "ops@example.invalid",
} as const;

describe("staging notification fail-closed", () => {
  beforeEach(() => {
    sendMock.mockReset();
    ResendMock.mockReset();
    sendMock.mockResolvedValue({ error: null });
  });

  it("skips even when a Resend key is present because PUBLIC_SITE_URL is staging", async () => {
    const env = createTestEnv({
      ...dummyDelivery,
      PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com",
    });
    await expect(sendNotifications(env, input)).resolves.toBe("skipped");
    expect(ResendMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does not treat ENVIRONMENT=production as permission to send from staging", async () => {
    const env = createTestEnv({
      ...dummyDelivery,
      PUBLIC_SITE_URL: "https://admin-staging.kaiyuemacau.com/login",
    });
    await expect(sendNotifications(env, input)).resolves.toBe("skipped");
    expect(ResendMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("still skips production-shaped env when the Resend key is absent", async () => {
    const env = createTestEnv({
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: "https://kaiyuemacau.com",
      RESEND_API_KEY: undefined,
    });
    await expect(sendNotifications(env, input)).resolves.toBe("skipped");
    expect(ResendMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does not construct Resend for missing, malformed, or staging workers.dev site URLs", async () => {
    const cases = [
      { PUBLIC_SITE_URL: undefined },
      { PUBLIC_SITE_URL: "" },
      { PUBLIC_SITE_URL: "   " },
      { PUBLIC_SITE_URL: "not-a-url" },
      { PUBLIC_SITE_URL: "http://kaiyuemacau.com" },
      { PUBLIC_SITE_URL: "https://kaiyue-travel-staging.kai-yue.workers.dev" },
      { PUBLIC_SITE_URL: "https://kaiyue-travel.scalingsmb.workers.dev" },
    ];
    for (const site of cases) {
      sendMock.mockReset();
      ResendMock.mockReset();
      const env = createTestEnv({
        ...dummyDelivery,
        ...site,
      });
      await expect(sendNotifications(env, input)).resolves.toBe("skipped");
      expect(ResendMock, String(site.PUBLIC_SITE_URL)).not.toHaveBeenCalled();
      expect(sendMock, String(site.PUBLIC_SITE_URL)).not.toHaveBeenCalled();
    }
  });
});
