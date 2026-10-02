/**
 * None of PayPal.me, Wise, or Payoneer offer a simple no-approval "create
 * a payment request" API for a solo/personal account — PayPal and Wise's
 * real payment-request APIs require a registered business integration,
 * and Payoneer's request-a-payment feature is generated from their
 * dashboard, not a public API. So rather than half-implement an
 * integration, this just composes a plain-text payment message from
 * whichever links/handles you've put in .env — you paste it into your
 * own invoice/email once a lead actually says yes.
 */

import { DEFAULT_CURRENCY } from "@/lib/config";

export interface PaymentOptions {
  amount?: number;
  currency?: string;
}

export function generatePaymentMessage(opts: PaymentOptions = {}): string {
  const lines: string[] = [];
  const amountLine =
    opts.amount != null ? `Total: ${opts.amount} ${opts.currency ?? DEFAULT_CURRENCY}` : undefined;
  if (amountLine) lines.push(amountLine, "");

  lines.push("You can pay via whichever is easiest for you:");

  const paypal = process.env.PAYPAL_ME_HANDLE;
  if (paypal) {
    const link = opts.amount != null ? `https://paypal.me/${paypal}/${opts.amount}` : `https://paypal.me/${paypal}`;
    lines.push(`• PayPal: ${link}`);
  }

  const wise = process.env.WISE_ACCOUNT_DETAILS;
  if (wise) lines.push(`• Wise: ${wise}`);

  const payoneer = process.env.PAYONEER_PAYMENT_LINK;
  if (payoneer) lines.push(`• Payoneer: ${payoneer}`);

  if (!paypal && !wise && !payoneer) {
    lines.push("(No payment links configured yet — add PAYPAL_ME_HANDLE / WISE_ACCOUNT_DETAILS / PAYONEER_PAYMENT_LINK to .env.)");
  }

  return lines.join("\n");
}
