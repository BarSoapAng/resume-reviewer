import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { KofiPayment } from "./domain.js";

const KofiPayload = z.object({
  verification_token: z.string().min(1),
  transaction_id: z.string().min(1),
  email: z.string().email(),
  amount: z.coerce.number().finite().positive(),
  currency: z.string().length(3),
  type: z.string().optional(),
});

function equalSecret(actual: string, expected: string) {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function parseKofiWebhook(body: unknown, expectedToken: string, minimumAmount = 1): KofiPayment {
  let candidate = body;
  if (typeof body === "object" && body !== null && "data" in body) {
    const data = (body as { data: unknown }).data;
    candidate = typeof data === "string" ? JSON.parse(data) : data;
  }
  const payload = KofiPayload.parse(candidate);
  if (!equalSecret(payload.verification_token, expectedToken)) throw new Error("Invalid verification token");
  if (payload.amount < minimumAmount) throw new Error("Payment is below the minimum amount");
  return {
    providerPaymentId: payload.transaction_id,
    email: payload.email.toLowerCase(),
    amount: payload.amount.toFixed(2),
    currency: payload.currency.toUpperCase(),
    status: "paid",
  };
}
