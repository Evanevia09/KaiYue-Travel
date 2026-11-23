import { describe, expect, it, vi } from "vitest";
import type { OutboundEmail } from "../../apps/web/src/lib/server/env.ts";
import { sendLifecycleCustomerMail } from "../../apps/web/src/lib/server/notifications.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv, futurePickup } from "../helpers/memory-d1.ts";

const LOCK = "scalingsmb@gmail.com";
const LEGACY = "KY-ABCDEFGH";

function fakeBinding() {
  const sent: OutboundEmail[] = [];
  const send = vi.fn(async (message: OutboundEmail) => {
    sent.push(message);
    return { messageId: `msg-${sent.length}` };
  });
  return { binding: { send }, sent, send };
}

function lifecycleEnv() {
  const { binding, sent, send } = fakeBinding();
  const env = createTestEnv({
    PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com",
    NOTIFICATIONS_ENABLED: "true",
    NOTIFY_FROM_EMAIL: "bookings@notify.kaiyuemacau.com",
    NOTIFY_FROM_NAME: "Kai Yue Travel",
    NOTIFY_STAFF_TO: LOCK,
    NOTIFY_ALLOWED_RECIPIENTS: LOCK,
    EMAIL: binding,
  });
  return { env, sent, send };
}

function bookingPayload(overrides: Record<string, unknown> = {}) {
  return {
    serviceType: "airport_transfer",
    pickupLocation: "Macau International Airport",
    destination: "Synthetic Hotel",
    pickupAt: futurePickup(),
    passengerCount: 2,
    communicationChannel: "email",
    contactName: "Synthetic Guest",
    phone: "+853 6234 5678",
    email: LOCK,
    message: "Synthetic lifecycle fixture.",
    privacyAccepted: true,
    sourcePage: "/",
    sourceTrigger: "hero-embed",
    sourceMode: "embedded",
    locale: "en",
    ...overrides,
  };
}

async function postBooking(
  env: ReturnType<typeof createTestEnv>,
  overrides: Record<string, unknown> = {},
) {
  const response = await handleApi(
    new Request("http://localhost/api/v1/bookings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
        origin: "http://localhost:4321",
      },
      body: JSON.stringify(bookingPayload(overrides)),
    }),
    env,
  );
  const body = (await response.json()) as { reference?: string; status?: string };
  return { response, body };
}

async function patchStatus(
  env: ReturnType<typeof createTestEnv>,
  reference: string,
  status: string,
  expectedUpdatedAt: string,
) {
  return handleApi(
    new Request(`http://localhost/api/v1/admin/bookings/${reference}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "https://staging.kaiyuemacau.com",
      },
      body: JSON.stringify({ status, expectedUpdatedAt }),
    }),
    env,
  );
}

async function getBooking(env: ReturnType<typeof createTestEnv>, reference: string) {
  const response = await handleApi(
    new Request(`http://localhost/api/v1/admin/bookings/${reference}`, {
      headers: { origin: "https://staging.kaiyuemacau.com" },
    }),
    env,
  );
  const body = (await response.json()) as {
    booking?: { reference: string; status: string; updatedAt: string };
  };
  return { response, booking: body.booking };
}

function customerMails(sent: OutboundEmail[]) {
  return sent.filter((message) => !String(message.subject).includes("New booking request"));
}

describe("durable KY##### chauffeur references", () => {
  it("allocates sequential KY##### refs, never wraps, and looks up both serial and legacy values", async () => {
    const { env, sent } = lifecycleEnv();
    const first = await postBooking(env);
    expect(first.response.status).toBe(201);
    expect(first.body.reference).toBe("KY00001");
    const stored = await env.DB.prepare(
      "SELECT lifecycle_serial, reference FROM bookings WHERE reference = ?",
    )
      .bind("KY00001")
      .first<{ lifecycle_serial: number; reference: string }>();
    expect(stored).toEqual({ lifecycle_serial: 1, reference: "KY00001" });

    const second = await postBooking(env);
    expect(second.body.reference).toBe("KY00002");

    await env.DB.prepare(
      "UPDATE chauffeur_booking_serial SET last_issued = 99999 WHERE id = 1",
    ).run();
    const overflow = await postBooking(env);
    expect(overflow.body.reference).toBe("KY100000");
    expect(overflow.body.reference).not.toMatch(/^KY[0-9]{1,4}$/);

    const listed = await handleApi(
      new Request("http://localhost/api/v1/admin/bookings?q=KY00001", {
        headers: { origin: "https://staging.kaiyuemacau.com" },
      }),
      env,
    );
    expect(listed.status).toBe(200);
    const listBody = (await listed.json()) as { items: Array<{ reference: string }> };
    expect(listBody.items.some((item) => item.reference === "KY00001")).toBe(true);

    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO bookings (
        id, reference, lifecycle_serial, status, service_type, pickup_location, destination, pickup_at,
        passenger_count, communication_channel, contact_name, phone, phone_display, email, message,
        source_page, source_trigger, source_mode, locale, notification_state, created_at, updated_at
      ) VALUES (?, ?, NULL, 'enquiry', 'airport_transfer', 'Macau International Airport', 'Legacy Hotel', ?, 2,
        'email', 'Legacy Guest', '+853 6234 5678', '+853 6234 5678', ?, '', '/', 'hero-embed', 'embedded', 'en',
        'skipped', ?, ?)`,
    )
      .bind(crypto.randomUUID(), LEGACY, futurePickup(), LOCK, now, now)
      .run();
    const legacy = await getBooking(env, LEGACY);
    expect(legacy.response.status).toBe(200);
    expect(legacy.booking?.reference).toBe(LEGACY);
    expect(sent.filter((message) => String(message.subject).includes("KY00001"))).toHaveLength(2);
  });

  it("sends confirm then cancel mail on the same KY##### and skips WhatsApp and denied", async () => {
    const { env, sent } = lifecycleEnv();
    const created = await postBooking(env);
    const reference = created.body.reference!;
    expect(reference).toBe("KY00001");
    expect(sent).toHaveLength(2);

    const enquiry = await getBooking(env, reference);
    expect((await patchStatus(env, reference, "approved", enquiry.booking!.updatedAt)).status).toBe(
      200,
    );
    expect(customerMails(sent)).toHaveLength(1);

    const approved = await getBooking(env, reference);
    const confirmed = await patchStatus(env, reference, "confirmed", approved.booking!.updatedAt);
    expect(confirmed.status).toBe(200);
    expect(customerMails(sent)).toHaveLength(2);
    const confirmMail = customerMails(sent).at(-1)!;
    expect(confirmMail.to).toBe(LOCK);
    expect(confirmMail.subject).toBe("[Staging test] Your chauffeur booking is confirmed KY00001");
    expect(confirmMail.text).toMatch(/Reference number\s*: KY00001/);
    expect(confirmMail.text).not.toMatch(/not a booking confirmation/i);
    expect(confirmMail.text).not.toMatch(/IN-|CF-|CL-/);
    const confirmState = await env.DB.prepare(
      "SELECT confirm_mail_state FROM bookings WHERE reference = ?",
    )
      .bind(reference)
      .first<{ confirm_mail_state: string }>();
    expect(confirmState?.confirm_mail_state).toBe("sent");

    const afterConfirm = await getBooking(env, reference);
    expect(afterConfirm.booking?.status).toBe("confirmed");
    const cancelled = await patchStatus(
      env,
      reference,
      "cancelled",
      afterConfirm.booking!.updatedAt,
    );
    expect(cancelled.status).toBe(200);
    expect(customerMails(sent)).toHaveLength(3);
    const cancelMail = customerMails(sent).at(-1)!;
    expect(cancelMail.subject).toBe(
      "[Staging test] Your chauffeur booking has been cancelled KY00001",
    );
    expect(cancelMail.text).toMatch(/Reference number\s*: KY00001/);
    expect(cancelMail.text).not.toMatch(/refund|payment|IN-|CF-|CL-/i);
    const cancelState = await env.DB.prepare(
      "SELECT cancel_mail_state, reference FROM bookings WHERE reference = ?",
    )
      .bind(reference)
      .first<{ cancel_mail_state: string; reference: string }>();
    expect(cancelState).toEqual({ cancel_mail_state: "sent", reference: "KY00001" });

    const replay = await sendLifecycleCustomerMail(env, {
      kind: "cancelled",
      reference,
      requestId: "req-already-sent",
      communicationChannel: "email",
      locale: "en",
      name: "Synthetic Guest",
      email: LOCK,
      alreadySent: true,
    });
    expect(replay).toBe("skipped");
    expect(customerMails(sent)).toHaveLength(3);
  });

  it("does not mail on WhatsApp, denied, or missing guest email, and quotes legacy KY- refs unchanged", async () => {
    const { env, sent } = lifecycleEnv();
    const whatsapp = await postBooking(env, {
      communicationChannel: "whatsapp",
      email: undefined,
      contactName: "WhatsApp Guest",
    });
    expect(whatsapp.body.reference).toBe("KY00001");
    expect(sent).toHaveLength(0);
    const whatsappRow = await getBooking(env, "KY00001");
    expect(
      (await patchStatus(env, "KY00001", "approved", whatsappRow.booking!.updatedAt)).status,
    ).toBe(200);
    const approvedWhatsapp = await getBooking(env, "KY00001");
    expect(
      (await patchStatus(env, "KY00001", "confirmed", approvedWhatsapp.booking!.updatedAt)).status,
    ).toBe(200);
    expect(sent).toHaveLength(0);
    const whatsappMail = await env.DB.prepare(
      "SELECT confirm_mail_state FROM bookings WHERE reference = ?",
    )
      .bind("KY00001")
      .first<{ confirm_mail_state: string }>();
    expect(whatsappMail?.confirm_mail_state).toBe("skipped");

    const denied = await postBooking(env);
    expect(denied.body.reference).toBe("KY00002");
    const createCount = sent.length;
    const deniedRow = await getBooking(env, "KY00002");
    expect((await patchStatus(env, "KY00002", "denied", deniedRow.booking!.updatedAt)).status).toBe(
      200,
    );
    expect(sent).toHaveLength(createCount);
    const deniedMail = await env.DB.prepare(
      "SELECT cancel_mail_state FROM bookings WHERE reference = ?",
    )
      .bind("KY00002")
      .first<{ cancel_mail_state: string | null }>();
    expect(deniedMail?.cancel_mail_state ?? null).toBeNull();

    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO bookings (
        id, reference, lifecycle_serial, status, service_type, pickup_location, destination, pickup_at,
        passenger_count, communication_channel, contact_name, phone, phone_display, email, message,
        source_page, source_trigger, source_mode, locale, notification_state, created_at, updated_at
      ) VALUES (?, ?, NULL, 'enquiry', 'airport_transfer', 'Macau International Airport', 'Legacy Hotel', ?, 2,
        'email', 'Legacy Guest', '+853 6234 5678', '+853 6234 5678', ?, '', '/', 'hero-embed', 'embedded', 'en',
        'skipped', ?, ?)`,
    )
      .bind(crypto.randomUUID(), LEGACY, futurePickup(), LOCK, now, now)
      .run();
    const legacy = await getBooking(env, LEGACY);
    expect((await patchStatus(env, LEGACY, "cancelled", legacy.booking!.updatedAt)).status).toBe(
      200,
    );
    const legacyMail = customerMails(sent).at(-1)!;
    expect(legacyMail.subject).toContain(LEGACY);
    expect(legacyMail.text).toMatch(new RegExp(`Reference number\\s*: ${LEGACY}`));
    const legacyStored = await env.DB.prepare(
      "SELECT reference, lifecycle_serial FROM bookings WHERE reference = ?",
    )
      .bind(LEGACY)
      .first<{ reference: string; lifecycle_serial: number | null }>();
    expect(legacyStored).toEqual({ reference: LEGACY, lifecycle_serial: null });
  });
});
