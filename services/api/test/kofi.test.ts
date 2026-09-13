import { describe, expect, it } from "vitest";
import { parseKofiWebhook } from "../src/kofi.js";

const payload = {
  verification_token: "secret",
  transaction_id: "txn-123",
  email: "Student@Example.com",
  amount: "2.50",
  currency: "usd",
  type: "Donation",
};

describe("parseKofiWebhook", () => {
  it("parses Ko-fi's form data envelope", () => {
    expect(parseKofiWebhook({ data: JSON.stringify(payload) }, "secret")).toEqual({
      providerPaymentId: "txn-123",
      email: "student@example.com",
      amount: "2.50",
      currency: "USD",
      status: "paid",
    });
  });

  it("rejects an invalid verification token", () => {
    expect(() => parseKofiWebhook(payload, "different")).toThrow("Invalid verification token");
  });

  it("does not grant sub-minimum payments", () => {
    expect(() => parseKofiWebhook({ ...payload, amount: "0.99" }, "secret")).toThrow("minimum");
  });
});
