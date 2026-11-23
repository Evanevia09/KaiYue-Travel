export const QUOTE_CURRENCIES = ["MOP", "HKD", "CNY"] as const;
export const QUOTE_TOTAL_PATTERN = /^(?:0|[1-9]\d{0,8})\.\d{2}$/;

export function renderQuote(reference: string, currency: string, total: string) {
  return {
    subject: `Your Kai Yue Travel quotation | ${reference}`,
    body: `Hello,\n\nThank you for your enquiry with Kai Yue Travel.\n\nReference: ${reference}\nQuoted total: ${currency} ${total}\n\nPlease reply if you would like to proceed. Our team will confirm the booking separately.\n\nKai Yue Travel`,
  };
}
