import { contactCreateSchema, INQUIRY_LABELS, type InquiryType } from "@kaiyue/contracts";
import { useState } from "react";

type Props = {
  sourcePage: string;
  defaultType?: InquiryType;
};

function friendlyError(field: string, message: string) {
  if (message.startsWith("Too small")) {
    if (field === "name") return "Please enter your name.";
    if (field === "phone") return "Please enter a phone number with country code.";
    if (field === "message") return "Please add a little more detail (at least 10 characters).";
  }
  if (field === "privacyAccepted") return "Please acknowledge this is an inquiry.";
  return message;
}

export function ContactForm({ sourcePage, defaultType = "general" }: Props) {
  const [inquiryType, setInquiryType] = useState<InquiryType>(defaultType);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [result, setResult] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  if (status === "success") {
    return (
      <p role="status">
        Inquiry received. Reference <strong>{result}</strong>. Our team will follow up using the
        details you provided.
      </p>
    );
  }

  return (
    <form
      className="form inquiry-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const payload = {
          inquiryType,
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          email: String(form.get("email") ?? ""),
          company: String(form.get("company") ?? ""),
          message: String(form.get("message") ?? ""),
          privacyAccepted: form.get("privacyAccepted") === "on",
          sourcePage,
          locale: "en",
          website: String(form.get("website") ?? ""),
        };
        const parsed = contactCreateSchema.safeParse(payload);
        if (!parsed.success) {
          const next: Record<string, string> = {};
          for (const issue of parsed.error.issues) {
            const field = issue.path.join(".") || "form";
            next[field] ??= friendlyError(field, issue.message);
          }
          setErrors(next);
          setStatus("error");
          return;
        }
        setStatus("submitting");
        void fetch("/api/v1/contacts", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": idempotencyKey,
          },
          body: JSON.stringify(parsed.data),
        })
          .then(async (response) => {
            const body = (await response.json()) as {
              reference?: string;
              error?: { fields?: Record<string, string> };
            };
            if (!response.ok || !body.reference) {
              setErrors(body.error?.fields ?? {});
              setStatus("error");
              return;
            }
            setResult(body.reference);
            setStatus("success");
          })
          .catch(() => setStatus("error"));
      }}
    >
      <div className="inquiry-form__row">
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" autoComplete="name" required />
          {errors.name ? <p className="field-error">{errors.name}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="company">Company {inquiryType === "corporate" ? "" : "(optional)"}</label>
          <input
            id="company"
            name="company"
            autoComplete="organization"
            required={inquiryType === "corporate"}
          />
          {errors.company ? <p className="field-error">{errors.company}</p> : null}
        </div>
      </div>
      <div className="inquiry-form__row">
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" autoComplete="tel" required />
          {errors.phone ? <p className="field-error">{errors.phone}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="email">Email (optional)</label>
          <input id="email" name="email" type="email" autoComplete="email" />
          {errors.email ? <p className="field-error">{errors.email}</p> : null}
        </div>
      </div>
      <div className="field">
        <label htmlFor="inquiryType">Inquiry type</label>
        <select
          id="inquiryType"
          value={inquiryType}
          onChange={(event) => setInquiryType(event.target.value as InquiryType)}
        >
          {Object.entries(INQUIRY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="message">How can we help?</label>
        <textarea id="message" name="message" rows={3} required />
        {errors.message ? <p className="field-error">{errors.message}</p> : null}
      </div>
      <label className="field">
        <span>
          <input type="checkbox" name="privacyAccepted" /> I understand this is an inquiry, not a
          confirmed booking.
        </span>
      </label>
      {errors.privacyAccepted ? <p className="field-error">{errors.privacyAccepted}</p> : null}
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" className="btn btn--primary" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
