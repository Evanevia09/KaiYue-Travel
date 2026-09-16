import type { NotificationState } from "@kaiyue/contracts";
import { Resend } from "resend";
import type { AppEnv } from "./env.ts";
import { logSafe } from "./http.ts";

type NotificationKind = "booking" | "contact";

export type NotificationInput = {
  kind: NotificationKind;
  reference: string;
  requestId: string;
  summary: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendNotifications(
  env: AppEnv,
  input: NotificationInput,
): Promise<NotificationState> {
  if (!env.RESEND_API_KEY) {
    logSafe("info", "notification_skipped", {
      kind: input.kind,
      reference: input.reference,
      requestId: input.requestId,
      reason: "missing_resend_key",
    });
    return "skipped";
  }

  const from = env.RESEND_FROM;
  const staffTo = env.RESEND_STAFF_TO;
  if (!from || !staffTo) {
    logSafe("warn", "notification_failed", {
      kind: input.kind,
      reference: input.reference,
      requestId: input.requestId,
      reason: "missing_sender_or_recipient",
    });
    return "failed";
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const subject =
    input.kind === "booking"
      ? `New booking request ${input.reference}`
      : `New inquiry ${input.reference}`;
  const html = `<p>${escapeHtml(input.summary)}</p><p>Reference: <strong>${escapeHtml(input.reference)}</strong></p>`;

  const { error } = await resend.emails.send(
    {
      from,
      to: [staffTo],
      ...(env.RESEND_REPLY_TO ? { replyTo: env.RESEND_REPLY_TO } : {}),
      subject,
      html,
    },
    { idempotencyKey: `${input.kind}-staff/${input.reference}` },
  );

  if (error) {
    logSafe("error", "notification_failed", {
      kind: input.kind,
      reference: input.reference,
      requestId: input.requestId,
      reason: "resend_error",
    });
    return "failed";
  }

  return "sent";
}
