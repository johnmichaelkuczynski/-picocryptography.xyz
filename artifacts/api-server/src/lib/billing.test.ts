import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import { billingTestables } from "./billing";

test("returnTo accepts only local application paths", () => {
  assert.equal(billingTestables.safeReturnTo("/course?lesson=1"), "/course?lesson=1");
  assert.equal(billingTestables.safeReturnTo("https://evil.example/"), null);
  assert.equal(billingTestables.safeReturnTo("//evil.example/"), null);
  assert.equal(billingTestables.safeReturnTo("/\\evil.example"), null);
});

test("configuration rejects absent and test-mode keys", () => {
  assert.equal(billingTestables.validatedConfig({}), null);
  assert.equal(
    billingTestables.validatedConfig({
      STRIPE_SECRET_KEY: "sk_test_forbidden",
      STRIPE_PUBLISHABLE_KEY: "pk_test_forbidden",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      STRIPE_PRICE_ID: "price_example",
    }),
    null,
  );
});

test("invalid webhook signatures are rejected without a network request", () => {
  assert.equal(
    billingTestables.acceptsWebhookSignature(
      Buffer.from('{"id":"evt_forged"}'),
      "t=1,v1=not-a-valid-signature",
      "whsec_unit_test_not_real",
    ),
    false,
  );
});

test("recurring access expiration comes from the paid price line period", () => {
  const invoice = {
    lines: {
      data: [
        {
          pricing: { price_details: { price: "price_other" } },
          period: { end: 100 },
        },
        {
          pricing: { price_details: { price: "price_live_configured" } },
          period: { end: 1234567890 },
        },
      ],
    },
  } as unknown as Stripe.Invoice;
  assert.equal(
    billingTestables.periodEndForPrice(invoice, "price_live_configured"),
    1234567890,
  );
  assert.equal(billingTestables.periodEndForPrice(invoice, "price_missing"), null);
});

test("paid Checkout verification requires the exact server-side price and amount", () => {
  const expected = {
    price: { id: "price_live_configured" },
    amount: 4242,
    currency: "usd",
  } as Parameters<typeof billingTestables.sessionHasExpectedPayment>[1];
  const session = {
    payment_status: "paid",
    amount_total: 4242,
    currency: "usd",
    line_items: {
      data: [{ price: { id: "price_live_configured" }, quantity: 1 }],
    },
  } as unknown as Stripe.Checkout.Session;

  assert.equal(billingTestables.sessionHasExpectedPayment(session, expected), true);
  assert.equal(
    billingTestables.sessionHasExpectedPayment(
      { ...session, amount_total: 4241 },
      expected,
    ),
    false,
  );
  assert.equal(
    billingTestables.sessionHasExpectedPayment(
      {
        ...session,
        line_items: { data: [{ price: { id: "price_other" }, quantity: 1 }] },
      } as unknown as Stripe.Checkout.Session,
      expected,
    ),
    false,
  );
});