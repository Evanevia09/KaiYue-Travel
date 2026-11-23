import { z } from "zod";
import { QUOTE_CURRENCIES, QUOTE_TOTAL_PATTERN, renderQuote } from "../contracts/src/quote.ts";
import { StagingError } from "./error.mjs";

const amount = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/)
  .refine((value) => Number(value) > 0);
const currency = z.enum(QUOTE_CURRENCIES);

export const pricingInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fixed"), amount }),
  z.object({
    type: z.literal("hourly"),
    rate: amount,
    minutes: z.number().int().min(1).max(10_080),
  }),
]);

export const quoteCurrency = currency;
export const quoteOutput = z.object({
  reference: z.string(),
  currency,
  total: z.string(),
  subject: z.string(),
  body: z.string(),
});

function toCents(amount) {
  const [whole, fraction = ""] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function draftQuote({ reference, currency, pricing }) {
  const cents =
    pricing.type === "fixed"
      ? toCents(pricing.amount)
      : Math.floor((toCents(pricing.rate) * pricing.minutes + 30) / 60);
  const total = (cents / 100).toFixed(2);
  if (cents < 1 || !QUOTE_TOTAL_PATTERN.test(total)) {
    throw new StagingError("The quote total must be between 0.01 and 999999999.99.");
  }
  return {
    reference,
    currency,
    total,
    ...renderQuote(reference, currency, total),
  };
}
