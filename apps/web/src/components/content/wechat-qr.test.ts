import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { site } from "../../lib/site.ts";

const OWNER_QR_SHA256 = "3877f629e7dd6a91f9e644ec06da14fd6c444309d8bbe505a76a8d5138cc67dc";

describe("owner WeChat QR asset", () => {
  it("embeds the original JPEG bytes without regeneration", () => {
    const path = fileURLToPath(new URL("../../../public/images/wechat-qr.jpg", import.meta.url));
    const bytes = readFileSync(path);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(OWNER_QR_SHA256);
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
  });

  it("keeps office telephone distinct from WhatsApp enquiry number", () => {
    expect(site.phone.replaceAll(/\D/g, "")).toBe("85328338882");
    expect(site.whatsapp.replaceAll(/\D/g, "")).toBe("85363128081");
  });

  it("does not keep the coming-soon overlay or the placeholder SVG", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./WeChatQr.astro", import.meta.url)),
      "utf8",
    );
    expect(source).toContain("/images/wechat-qr.jpg");
    expect(source).not.toContain("wechat-qr.svg");
    expect(source).not.toMatch(/coming soon/i);
    expect(source).not.toContain("wechat-qr__overlay");
  });
});
