import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStripePayments } from "../src/stripe.js";

const { retrieve, create } = vi.hoisted(() => ({ retrieve: vi.fn(), create: vi.fn() }));
vi.mock("stripe", async (original) => {
  const { default: Actual } = await original<typeof import("stripe")>();
  return { default: class extends Actual {
    constructor(key: string) {
      super(key);
      this.prices.retrieve = retrieve;
      this.checkout.sessions.create = create;
    }
  } };
});

const user = { userId: "00000000-0000-4000-8000-000000000001", email: "student@example.com" };
const payments = createStripePayments("sk_test_example", "whsec_test", "price_review", "http://localhost:5173");
const sdk = new Stripe("sk_test_example");
const session = {
  id: "cs_review", mode: "payment", payment_status: "paid", amount_total: 100, currency: "usd",
  client_reference_id: user.userId, metadata: { userId: user.userId, purpose: "aria_review" },
  customer_details: { email: "different@example.com" },
};

function webhook(object = session, type = "checkout.session.completed") {
  const body = JSON.stringify({ type, data: { object } });
  const signature = sdk.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_test" });
  return () => payments.parseWebhook(Buffer.from(body), signature);
}

beforeEach(() => {
  retrieve.mockResolvedValue({ active: true, currency: "usd", type: "one_time", custom_unit_amount: { minimum: 100 } });
  create.mockResolvedValue({ url: "https://checkout.stripe.com/test" });
  vi.clearAllMocks();
});

describe("Stripe review payments", () => {
  it("uses a customer-chosen price and binds checkout to the authenticated account", async () => {
    await expect(payments.checkout(user)).resolves.toEqual({ url: "https://checkout.stripe.com/test" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [{ price: "price_review", quantity: 1 }], client_reference_id: user.userId,
      metadata: { userId: user.userId, purpose: "aria_review" },
    }));
  });

  it("rejects prices that do not enforce the $1 minimum", async () => {
    retrieve.mockResolvedValue({ active: true, currency: "usd", type: "one_time", custom_unit_amount: { minimum: 99 } });
    await expect(payments.checkout(user)).rejects.toThrow("minimum");
    expect(create).not.toHaveBeenCalled();
  });

  it("verifies signatures and uses the account ID even when payment email differs", () => {
    expect(webhook()()).toEqual({ userId: user.userId, providerPaymentId: "cs_review", email: "different@example.com", amount: "1.00", currency: "USD", status: "paid" });
    expect(() => payments.parseWebhook(Buffer.from("{}"), "invalid")).toThrow();
  });

  it("accepts higher amounts and delayed successful payments", () => {
    expect(webhook({ ...session, amount_total: 1250 }, "checkout.session.async_payment_succeeded")()).toMatchObject({ amount: "12.50" });
    expect(webhook({ ...session, metadata: { ...session.metadata, purpose: "draftwise_review" } })()).toMatchObject({ userId: user.userId });
  });

  it("ignores unpaid sessions and unrelated events or checkouts", () => {
    expect(webhook({ ...session, payment_status: "unpaid" })()).toBeNull();
    expect(webhook(session, "payment_intent.succeeded")()).toBeNull();
    expect(webhook({ ...session, metadata: { ...session.metadata, purpose: "other" } })()).toBeNull();
  });

  it("rejects sub-minimum amounts, wrong currencies, and mismatched account IDs", () => {
    expect(webhook({ ...session, amount_total: 99 })).toThrow();
    expect(webhook({ ...session, currency: "eur" })).toThrow();
    expect(webhook({ ...session, client_reference_id: "other" })).toThrow();
  });
});
