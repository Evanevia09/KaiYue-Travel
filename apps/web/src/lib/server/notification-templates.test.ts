import { describe, expect, it } from "vitest";
import {
  EMAIL_LOGO_HEIGHT,
  EMAIL_LOGO_WIDTH,
  emailLogoUrl,
  formatLifecycleNumber,
  renderCustomerAck,
  renderCustomerCancelled,
  renderCustomerConfirmed,
  renderQuoteEmail,
  renderStaffMessage,
} from "./notification-templates.ts";

const siteUrl = "https://staging.kaiyuemacau.com";
const logoUrl = emailLogoUrl(siteUrl);
const brand = { logoUrl, siteUrl };

describe("lifecycle display numbers", () => {
  it("pads IN to 4 digits and CF/CL to 5, then expands", () => {
    expect(formatLifecycleNumber("enquiry", 1)).toBe("IN-KY0001");
    expect(formatLifecycleNumber("enquiry", 42)).toBe("IN-KY0042");
    expect(formatLifecycleNumber("confirmation", 42)).toBe("CF-KY00042");
    expect(formatLifecycleNumber("cancellation", 42)).toBe("CL-KY00042");
    expect(formatLifecycleNumber("enquiry", 10000)).toBe("IN-KY10000");
    expect(formatLifecycleNumber("confirmation", 10000)).toBe("CF-KY10000");
    expect(formatLifecycleNumber("cancellation", 100000)).toBe("CL-KY100000");
  });

  it("rejects non-positive serials", () => {
    expect(() => formatLifecycleNumber("enquiry", 0)).toThrow("invalid_lifecycle_serial");
    expect(() => formatLifecycleNumber("confirmation", 1.5)).toThrow("invalid_lifecycle_serial");
  });
});

describe("branded notification templates", () => {
  it("uses a white logo-only header, gold divider, and filled two-column table", () => {
    const staff = renderStaffMessage(
      "staging",
      {
        kind: "booking",
        reference: "IN-KY0042",
        summary: "A new chauffeur booking request is waiting for review.",
        details: [
          { label: "Name", value: "<script>x</script>" },
          { label: "Email", value: "" },
          { label: "Pickup", value: "Macau International Airport" },
        ],
      },
      brand,
    );
    expect(staff.subject).toBe("[Staging test] New booking request IN-KY0042");
    expect(staff.html).toContain("background:#ffffff");
    expect(staff.html).toContain("#f3a600");
    expect(staff.html).not.toContain("#008c5e");
    expect(staff.html).toContain(logoUrl);
    expect(staff.html).toContain(`width="${EMAIL_LOGO_WIDTH}"`);
    expect(staff.html).toContain(`height="${EMAIL_LOGO_HEIGHT}"`);
    expect(staff.html).toContain('alt="Kai Yue Travel"');
    expect(staff.html).not.toContain("font-size:18px;font-weight:bold");
    expect(staff.html).toContain("&lt;script&gt;");
    expect(staff.html).not.toContain("<script>x</script>");
    expect(staff.html).not.toContain("Email");
    expect(staff.html).toContain("https://admin-staging.kaiyuemacau.com");
    expect(staff.html).toMatch(/width="38%"/);
    expect(staff.text).toMatch(/Pickup\s*: Macau International Airport/);
    expect(staff.text).not.toContain("Email");
    const headerCompany = staff.html.match(/background:#ffffff[\s\S]*?background:#f3a600/)?.[0];
    expect(headerCompany).toBeDefined();
    expect(headerCompany).not.toMatch(/Kai Yue Travel(?!")/);

    const customer = renderCustomerAck(
      "staging",
      {
        kind: "booking",
        reference: "IN-KY0042",
        locale: "zh-Hant",
        name: "Synthetic Guest",
        serviceType: "airport_transfer",
        pickupAt: "2026-12-01T02:30:00.000Z",
        timezone: "Asia/Macau",
        siteUrl,
        details: [{ label: "Destination", value: "Synthetic Hotel, Cotai" }],
      },
      brand,
    );
    expect(customer.subject).toContain("[Staging test]");
    expect(customer.html).toContain('lang="zh-Hant"');
    expect(customer.html).toContain("機場接送");
    expect(customer.html).toContain("Synthetic Hotel, Cotai");
    expect(customer.text).toContain("此郵件並非預約確認");
    expect(customer.text).not.toContain("SYNTHETIC PREVIEW");

    const quote = renderQuoteEmail(
      "staging",
      { reference: "KY-SYNTH001", currency: "MOP", total: "1280.00" },
      brand,
    );
    expect(quote.subject).toBe("[Staging test] Your Kai Yue Travel quotation | KY-SYNTH001");
    expect(quote.text).toContain("Quoted total: MOP 1280.00");
    expect(quote.html).toContain("MOP 1280.00");
    expect(quote.html).toContain(logoUrl);
    expect(quote.html).not.toContain("#008c5e");
    expect(quote.html).not.toContain("wechat-qr");
  });

  it("keeps Portuguese and English customer acknowledgements and omits empty optional fields", () => {
    const pt = renderCustomerAck("staging", {
      kind: "contact",
      reference: "INQ-SYNTH001",
      locale: "pt",
      name: null,
      timezone: "Asia/Macau",
      siteUrl,
    });
    expect(pt.subject).toContain("Recebemos o seu pedido");
    expect(pt.html).toContain('lang="pt-PT"');
    const en = renderCustomerAck("staging", {
      kind: "contact",
      reference: "INQ-SYNTH001",
      locale: "en",
      name: null,
      timezone: "Asia/Macau",
      siteUrl,
    });
    expect(en.text).toContain("We have received your inquiry.");
    expect(en.html).toContain("This is an automated message");
  });

  it("renders distinct confirmation and cancellation mail without policy invention", () => {
    const confirmed = renderCustomerConfirmed(
      "staging",
      {
        locale: "en",
        name: "Synthetic Preview Guest",
        enquiryReference: "IN-KY0042",
        confirmationNumber: "CF-KY00042",
        siteUrl,
        timezone: "Asia/Macau",
        details: [{ label: "Pickup", value: "Macau International Airport" }],
        syntheticPreview: true,
      },
      brand,
    );
    expect(confirmed.subject).toBe("[Staging test] Your chauffeur booking is confirmed CF-KY00042");
    expect(confirmed.text).toContain("CF-KY00042");
    expect(confirmed.text).toContain("IN-KY0042");
    expect(confirmed.text).toContain("SYNTHETIC PREVIEW");
    expect(confirmed.text).not.toContain("not a booking confirmation");
    expect(confirmed.text.toLowerCase()).not.toMatch(/refund|payment|cancellation policy/);
    expect(confirmed.html).toContain("https://staging.kaiyuemacau.com");

    const cancelled = renderCustomerCancelled(
      "staging",
      {
        locale: "pt",
        name: "Synthetic Preview Guest",
        enquiryReference: "IN-KY0042",
        confirmationNumber: "CF-KY00042",
        cancellationNumber: "CL-KY00042",
        siteUrl,
        timezone: "Asia/Macau",
        details: [{ label: "Email", value: "" }],
      },
      brand,
    );
    expect(cancelled.subject).toContain("[Staging test]");
    expect(cancelled.html).toContain('lang="pt-PT"');
    expect(cancelled.text).toContain("CL-KY00042");
    expect(cancelled.text).toContain("CF-KY00042");
    expect(cancelled.text).not.toMatch(/reembols|pagamento/i);
    expect(cancelled.html).not.toContain("Email");

    const zh = renderCustomerCancelled(
      "staging",
      {
        locale: "zh-Hant",
        name: null,
        enquiryReference: "IN-KY0042",
        cancellationNumber: "CL-KY00042",
        siteUrl,
        timezone: "Asia/Macau",
      },
      brand,
    );
    expect(zh.html).toContain('lang="zh-Hant"');
    expect(zh.text).toContain("CL-KY00042");
    expect(zh.text).not.toContain("CF-KY");
  });
});
