import Stripe from "stripe";
import { z } from "zod";
import type { Principal, StripePayment } from "./domain.js";

export function createStripePayments(secretKey: string, webhookSecret: string, priceId: string, webOrigin: string) {
  const stripe = new Stripe(secretKey);
  return {
    async checkout(user: Principal) {
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active || price.currency !== "usd" || price.type !== "one_time" || price.custom_unit_amount?.minimum !== 100) {
        throw new Error("Stripe price must allow customer-chosen amounts with a $1 USD minimum");
      }
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: user.userId,
        customer_email: user.email,
        metadata: { userId: user.userId, purpose: "aria_review" },
        success_url: `${webOrigin}/?payment=success`,
        cancel_url: `${webOrigin}/?payment=cancelled`,
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      return { url: session.url };
    },
    parseWebhook(body: Buffer, signature: string): StripePayment | null {
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return null;
      const session = event.data.object;
      if (!["aria_review", "draftwise_review"].includes(session.metadata?.purpose ?? "") || session.mode !== "payment" || session.payment_status !== "paid") return null;
      const userId = z.string().uuid().parse(session.metadata?.userId);
      if (session.client_reference_id !== userId || session.currency !== "usd" || !Number.isSafeInteger(session.amount_total) || session.amount_total! < 100) throw new Error("Invalid review payment");
      return {
        userId,
        providerPaymentId: session.id,
        email: z.string().email().parse(session.customer_details?.email ?? session.customer_email).toLowerCase(),
        amount: (session.amount_total! / 100).toFixed(2),
        currency: "USD",
        status: "paid",
      };
    },
  };
}
