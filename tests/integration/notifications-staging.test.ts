import { describe, expect, it, vi } from "vitest";
import type { OutboundEmail } from "../../apps/web/src/lib/server/env.ts";
import {
  combineOutcomes,
  sendNotifications,
  type NotificationInput,
} from "../../apps/web/src/lib/server/notifications.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv, futurePickup } from "../helpers/memory-d1.ts";

const LOCK = "scalingsmb@gmail.com";

function fakeBinding(fail?: (message: OutboundEmail) => Error | undefined) {
  const sent: OutboundEmail[] = [];
  const send = vi.fn(async (message: OutboundEmail) => {
    const error = fail?.(message);
    if (error) throw error;
    sent.push(message);
    return { messageId: `msg-${sent.length}` };
  });
  return { binding: { send }, sent, send };
}

function stagingEnv(overrides: Record<string, unknown> = {}) {
  const { binding, sent, send } = fakeBinding();
  const env = createTestEnv({
    ENVIRONMENT: "production",
    DEV_ADMIN_BYPASS: "false",
    PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com",
    NOTIFICATIONS_ENABLED: "true",
    NOTIFY_FROM_EMAIL: "bookings@notify.kaiyuemacau.com",
    NOTIFY_FROM_NAME: "Kai Yue Travel",
    NOTIFY_STAFF_TO: LOCK,
    NOTIFY_ALLOWED_RECIPIENTS: LOCK,
    EMAIL: binding,
    ...overrides,
  });
  return { env, sent, send };
}

const input: NotificationInput = {
  kind: "booking",
  reference: "KY-TEST0001",
  requestId: "req-test",
  summary: "A new chauffeur booking request is waiting for review.",
  replyTo: LOCK,
  details: [{ label: "Name", value: "<script>x</script>" }],
  customer: {
    email: LOCK,
    locale: "en",
    name: "Synthetic Guest",
    serviceType: "airport_transfer",
    pickupAt: "2026-12-01T02:30:00.000Z",
  },
};

describe("mail policy gates", () => {
  it("never calls the binding unless NOTIFICATIONS_ENABLED is exactly true", async () => {
    for (const flag of [undefined, "", "false", "TRUE", "1", "yes"]) {
      const { env, send } = stagingEnv({ NOTIFICATIONS_ENABLED: flag });
      await expect(sendNotifications(env, input)).resolves.toBe("skipped");
      expect(send, String(flag)).not.toHaveBeenCalled();
    }
  });

  it("skips when the EMAIL binding is missing", async () => {
    const { env } = stagingEnv({ EMAIL: undefined });
    await expect(sendNotifications(env, input)).resolves.toBe("skipped");
  });

  it("derives site identity from PUBLIC_SITE_URL only, never ENVIRONMENT", async () => {
    for (const site of [
      undefined,
      "",
      "not-a-url",
      "http://staging.kaiyuemacau.com",
      "http://kaiyuemacau.com",
      "https://admin-staging.kaiyuemacau.com",
      "https://kaiyue-travel-staging.kai-yue.workers.dev",
      "https://kaiyue-travel.scalingsmb.workers.dev",
      "http://localhost:4321",
    ]) {
      const { env, send } = stagingEnv({ PUBLIC_SITE_URL: site });
      await expect(sendNotifications(env, input), String(site)).resolves.toBe("skipped");
      expect(send, String(site)).not.toHaveBeenCalled();
    }
  });

  it("refuses to send from staging without a valid recipient lock", async () => {
    for (const lock of [undefined, "", " , ", "not-an-email", `${LOCK},bad`]) {
      const { env, send } = stagingEnv({ NOTIFY_ALLOWED_RECIPIENTS: lock });
      await expect(sendNotifications(env, input), String(lock)).resolves.toBe("skipped");
      expect(send, String(lock)).not.toHaveBeenCalled();
    }
  });

  it("fails without sender or staff recipient once every gate is open", async () => {
    for (const missing of ["NOTIFY_FROM_EMAIL", "NOTIFY_STAFF_TO"]) {
      const { env, send } = stagingEnv({ [missing]: undefined });
      await expect(sendNotifications(env, input)).resolves.toBe("failed");
      expect(send).not.toHaveBeenCalled();
    }
  });

  it("does not mail a staff address outside the staging lock", async () => {
    const { env, send } = stagingEnv({ NOTIFY_STAFF_TO: "real-staff@kaiyuemacau.com" });
    await expect(sendNotifications(env, { ...input, customer: undefined })).resolves.toBe(
      "skipped",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("skips customer acknowledgements to guests outside the staging lock", async () => {
    const { env, sent } = stagingEnv();
    const state = await sendNotifications(env, {
      ...input,
      customer: { ...input.customer!, email: "real.guest@example.com" },
    });
    expect(state).toBe("sent");
    expect(sent.map((message) => message.to)).toEqual([LOCK]);
  });
});

describe("staging delivery through the EMAIL binding", () => {
  it("sends one staff notice and one customer acknowledgement to the locked inbox", async () => {
    const { env, sent } = stagingEnv();
    await expect(sendNotifications(env, input)).resolves.toBe("sent");
    expect(sent).toHaveLength(2);
    const [staff, customer] = sent;
    expect(staff!.to).toBe(LOCK);
    expect(staff!.from).toEqual({
      email: "bookings@notify.kaiyuemacau.com",
      name: "Kai Yue Travel",
    });
    expect(staff!.subject).toBe("[Staging test] New booking request KY-TEST0001");
    expect(staff!.replyTo).toBe(LOCK);
    expect(staff!.html).toContain("&lt;script&gt;");
    expect(staff!.html).not.toContain("<script>");
    expect(staff!.html).toContain("#ffffff");
    expect(staff!.html).not.toContain("#008c5e");
    expect(staff!.html).toContain(
      "https://staging.kaiyuemacau.com/images/kai-yue-travel-group-logo.png",
    );
    expect(customer!.subject).toBe("[Staging test] We received your request KY-TEST0001");
    expect(customer!.text).toContain("This is not a booking confirmation.");
    expect(customer!.replyTo).toBeUndefined();
  });

  it("reports partial and failed states without throwing", async () => {
    const failing = fakeBinding((message) =>
      String(message.subject).includes("We received")
        ? Object.assign(new Error("quota"), { code: "E_RATE_LIMIT_EXCEEDED" })
        : undefined,
    );
    const { env } = stagingEnv({ EMAIL: failing.binding });
    await expect(sendNotifications(env, input)).resolves.toBe("partial");

    const allFail = fakeBinding(() =>
      Object.assign(new Error("x"), { code: "E_SENDER_NOT_VERIFIED" }),
    );
    const second = stagingEnv({ EMAIL: allFail.binding });
    await expect(sendNotifications(second.env, input)).resolves.toBe("failed");
  });

  it("combines staff and customer outcomes", () => {
    expect(combineOutcomes("sent", "skipped")).toBe("sent");
    expect(combineOutcomes("sent", "sent")).toBe("sent");
    expect(combineOutcomes("sent", "failed")).toBe("partial");
    expect(combineOutcomes("failed", "sent")).toBe("partial");
    expect(combineOutcomes("failed", "skipped")).toBe("failed");
    expect(combineOutcomes("skipped", "skipped")).toBe("skipped");
    expect(combineOutcomes("skipped", "sent")).toBe("partial");
  });

  it("persists the booking first and does not resend on an idempotent replay", async () => {
    const { env, sent } = stagingEnv();
    const pickupAt = futurePickup();
    const request = () =>
      new Request("https://staging.kaiyuemacau.com/api/v1/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "staging-mail-replay-0001",
          origin: "https://staging.kaiyuemacau.com",
        },
        body: JSON.stringify({
          serviceType: "airport_transfer",
          pickupLocation: "Macau International Airport",
          destination: "Synthetic Hotel",
          pickupAt,
          passengerCount: 2,
          communicationChannel: "email",
          contactName: "Synthetic Guest",
          phone: "+853 6234 5678",
          email: LOCK,
          message: "Synthetic staging test.",
          privacyAccepted: true,
          sourcePage: "/",
          sourceTrigger: "hero-embed",
          sourceMode: "embedded",
          locale: "en",
        }),
      });
    const first = await handleApi(request(), env);
    expect(first.status).toBe(201);
    const { reference } = (await first.json()) as { reference: string };
    const row = await env.DB.prepare("SELECT notification_state FROM bookings WHERE reference = ?")
      .bind(reference)
      .first<{ notification_state: string }>();
    expect(row?.notification_state).toBe("sent");
    const replay = await handleApi(request(), env);
    expect(replay.status).toBe(201);
    expect(sent).toHaveLength(2);
  });

  it("keeps the booking when every send throws", async () => {
    const broken = fakeBinding(() => new Error("network"));
    const { env } = stagingEnv({ EMAIL: broken.binding });
    const response = await handleApi(
      new Request("https://staging.kaiyuemacau.com/api/v1/contacts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "staging-mail-contact-0001",
          origin: "https://staging.kaiyuemacau.com",
        },
        body: JSON.stringify({
          inquiryType: "general",
          name: "Synthetic Guest",
          phone: "+853 6234 5678",
          email: LOCK,
          message: "Synthetic staging inquiry.",
          privacyAccepted: true,
          sourcePage: "/contact",
          locale: "zh-Hant",
        }),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const { reference } = (await response.json()) as { reference: string };
    const row = await env.DB.prepare("SELECT notification_state FROM contacts WHERE reference = ?")
      .bind(reference)
      .first<{ notification_state: string }>();
    expect(row?.notification_state).toBe("failed");
  });
});
