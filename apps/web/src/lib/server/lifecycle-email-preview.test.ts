import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PREVIEW_ADMIN_URL,
  PREVIEW_FROM,
  PREVIEW_SITE_URL,
  PREVIEW_TO,
  buildLifecyclePreviewSet,
  writeLifecyclePreviewArtifacts,
} from "./lifecycle-email-preview.ts";
import { ENGLISH_REFERENCE_LABEL } from "./notification-templates.ts";

describe("lifecycle email preview set", () => {
  it("builds four English staging messages with one KY00042 reference number", () => {
    const manifest = buildLifecyclePreviewSet("2026-11-23T04:30:00.000Z");
    expect(manifest.recipients).toEqual([PREVIEW_TO]);
    expect(manifest.from).toEqual(PREVIEW_FROM);
    expect(manifest.reference).toBe("KY00042");
    expect(manifest.messages.map((message) => message.id)).toEqual([
      "staff-new-enquiry",
      "customer-request-received",
      "customer-confirmed",
      "customer-cancelled",
    ]);
    for (const message of manifest.messages) {
      expect(message.to).toEqual([PREVIEW_TO]);
      expect(message.from).toEqual(PREVIEW_FROM);
      expect(message.subject.startsWith("[Staging test] ")).toBe(true);
      expect(message.subject).toContain("KY00042");
      expect(message.subject).not.toContain("IN-KY");
      expect(message.subject).not.toContain("CF-KY");
      expect(message.subject).not.toContain("CL-KY");
      expect(message.html).toContain("SYNTHETIC PREVIEW");
      expect(message.html).toContain(PREVIEW_SITE_URL);
      expect(message.html).toContain(ENGLISH_REFERENCE_LABEL);
      expect(message.html).toContain("KY00042");
      expect(message.html).not.toContain("Confirmation number");
      expect(message.html).not.toContain("Cancellation number");
      expect(message.html).not.toContain("Original enquiry");
      expect(message.html).not.toContain("KY-PYPM8Y3E");
      expect(message.text.toLowerCase()).not.toMatch(/refund|payment/);
    }
    const [staff, receipt, confirmed, cancelled] = manifest.messages;
    expect(staff!.replyTo).toBe(PREVIEW_TO);
    expect(staff!.html).toContain(PREVIEW_ADMIN_URL);
    expect(receipt!.text).toContain("This is not a booking confirmation.");
    expect(confirmed!.text).not.toContain("not a booking confirmation");
    expect(confirmed!.subject).toBe("[Staging test] Your chauffeur booking is confirmed KY00042");
    expect(cancelled!.subject).toBe(
      "[Staging test] Your chauffeur booking has been cancelled KY00042",
    );
  });

  it("writes portable html, text, and one JSON manifest", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kaiyue-email-preview-"));
    const manifest = await writeLifecyclePreviewArtifacts(dir, "2026-11-23T04:30:00.000Z");
    const raw = await readFile(path.join(dir, "manifest.json"), "utf8");
    const saved = JSON.parse(raw) as typeof manifest;
    expect(saved.messages).toHaveLength(4);
    expect(saved.reference).toBe("KY00042");
    expect(saved.messages[0]?.html).toBe(
      (await readFile(path.join(dir, "staff-new-enquiry.html"), "utf8")).toString(),
    );
    expect(await readFile(path.join(dir, "customer-confirmed.txt"), "utf8")).toContain("KY00042");
  });
});
