import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import type { PoolClient } from "pg";
import { billingTestables } from "./billing";

function recurringStripe(options: {
  price?: string;
  currency?: string;
  refunded?: boolean;
  disputed?: boolean;
  periodEnd?: number;
} = {}): Stripe {
  const price = options.price ?? "price_live_configured";
  const currency = options.currency ?? "usd";
  return {
    subscriptions: {
      retrieve: async () => ({
        livemode: true,
        status: "active",
        latest_invoice: "in_mock",
        items: { data: [{ quantity: 1, price: { id: price } }] },
      }),
    },
    invoices: {
      retrieve: async () => ({
        id: "in_mock",
        livemode: true,
        status: "paid",
        amount_paid: 4242,
        currency,
        lines: {
          data: [{
            quantity: 1,
            pricing: { price_details: { price } },
            period: { end: options.periodEnd ?? 2_000_000_000 },
          }],
        },
      }),
    },
    invoicePayments: {
      list: async () => ({
        data: [{
          livemode: true,
          amount_paid: 4242,
          currency,
          payment: { payment_intent: "pi_mock" },
        }],
      }),
    },
    paymentIntents: {
      retrieve: async () => ({
        livemode: true,
        status: "succeeded",
        amount_received: 4242,
        currency,
        latest_charge: {
          livemode: true,
          paid: true,
          refunded: options.refunded ?? false,
          amount_refunded: options.refunded ? 4242 : 0,
          disputed: options.disputed ?? false,
        },
      }),
    },
  } as unknown as Stripe;
}

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

test("recurring verification uses separate shallow Stripe reads", async () => {
  const calls: Array<{ method: string; options?: unknown }> = [];
  const stripe = {
    subscriptions: {
      retrieve: async (_id: string, options?: unknown) => {
        calls.push({ method: "subscription", options });
        return {
          livemode: true,
          status: "active",
          latest_invoice: "in_mock",
          items: {
            data: [
              {
                quantity: 1,
                price: { id: "price_live_configured" },
              },
            ],
          },
        };
      },
    },
    invoices: {
      retrieve: async () => {
        calls.push({ method: "invoice" });
        return {
          id: "in_mock",
          livemode: true,
          status: "paid",
          amount_paid: 4242,
          currency: "usd",
          lines: {
            data: [
              {
                quantity: 1,
                pricing: {
                  price_details: { price: "price_live_configured" },
                },
                period: { end: 2_000_000_000 },
              },
            ],
          },
        };
      },
    },
    invoicePayments: {
      list: async (options: unknown) => {
        calls.push({ method: "invoicePayments", options });
        return {
          data: [
            {
              livemode: true,
              amount_paid: 4242,
              currency: "usd",
              payment: { payment_intent: "pi_mock" },
            },
          ],
        };
      },
    },
    paymentIntents: {
      retrieve: async (_id: string, options: unknown) => {
        calls.push({ method: "paymentIntent", options });
        return {
          livemode: true,
          status: "succeeded",
          amount_received: 4242,
          currency: "usd",
          latest_charge: {
            livemode: true,
            paid: true,
            refunded: false,
            amount_refunded: 0,
            disputed: false,
          },
        };
      },
    },
  } as unknown as Stripe;
  const expected = {
    price: { id: "price_live_configured" },
    amount: 4242,
    currency: "usd",
  } as Parameters<typeof billingTestables.paidSubscriptionState>[2];

  const state = await billingTestables.paidSubscriptionState(
    stripe,
    "sub_mock",
    expected,
  );
  assert.equal(state.paid, true);
  assert.equal(state.validUntil?.getTime(), 2_000_000_000_000);
  assert.equal(calls.find((call) => call.method === "subscription")?.options, undefined);
  assert.deepEqual(
    calls.find((call) => call.method === "invoicePayments")?.options,
    { invoice: "in_mock", status: "paid", limit: 10 },
  );
  assert.deepEqual(
    calls.find((call) => call.method === "paymentIntent")?.options,
    { expand: ["latest_charge"] },
  );
});

test("checkout guard never creates after paid, complete, conflict, or read uncertainty", () => {
  assert.equal(
    billingTestables.checkoutGuardAction(true, "none"),
    "already_paid",
  );
  assert.equal(
    billingTestables.checkoutGuardAction(false, "paid_complete"),
    "recover",
  );
  assert.equal(
    billingTestables.checkoutGuardAction(false, "unreconciled"),
    "block",
  );
  assert.equal(
    billingTestables.checkoutGuardAction(false, "read_error"),
    "block",
  );
  assert.equal(
    billingTestables.checkoutGuardAction(false, "reusable"),
    "reuse",
  );
  assert.equal(
    billingTestables.checkoutGuardAction(false, "expired"),
    "create",
  );
});

test("billing user advisory lock completes before provider reads", async () => {
  const order: string[] = [];
  const client = {
    query: async (sql: string, values: unknown[]) => {
      order.push("lock");
      assert.match(sql, /pg_advisory_xact_lock/);
      assert.deepEqual(values, [714221, 7]);
      return { rows: [], rowCount: 1 };
    },
  } as unknown as PoolClient;
  await billingTestables.lockBillingUser(client, 7);
  order.push("provider-read");
  assert.deepEqual(order, ["lock", "provider-read"]);
});

test("pending checkout classification recovers complete paid and reuses only owned open", () => {
  const expected = {
    price: { id: "price_live_configured", type: "recurring" },
    amount: 4242,
    currency: "usd",
  } as Parameters<typeof billingTestables.pendingCheckoutState>[1];
  const base = {
    livemode: true,
    client_reference_id: "7",
    metadata: { user_id: "7" },
    mode: "subscription",
    currency: "usd",
    amount_total: 4242,
    payment_status: "paid",
    line_items: {
      data: [{ quantity: 1, price: { id: "price_live_configured" } }],
    },
  } as unknown as Stripe.Checkout.Session;
  assert.equal(
    billingTestables.pendingCheckoutState(
      { ...base, status: "complete", url: null },
      expected,
      7,
    ),
    "paid_complete",
  );
  assert.equal(
    billingTestables.pendingCheckoutState(
      { ...base, status: "open", url: "https://checkout.stripe.com/mock" },
      expected,
      7,
    ),
    "reusable",
  );
  assert.equal(
    billingTestables.pendingCheckoutState(
      { ...base, status: "open", url: "https://checkout.stripe.com/mock" },
      expected,
      8,
    ),
    "unreconciled",
  );
  assert.equal(
    billingTestables.pendingCheckoutState(
      { ...base, status: "expired" },
      expected,
      7,
    ),
    "expired",
  );
});

test("recurring access rejects refund, dispute, wrong currency, wrong price, and expiry", async () => {
  const expected = {
    price: { id: "price_live_configured" },
    amount: 4242,
    currency: "usd",
  } as Parameters<typeof billingTestables.paidSubscriptionState>[2];
  for (const stripe of [
    recurringStripe({ refunded: true }),
    recurringStripe({ disputed: true }),
    recurringStripe({ currency: "eur" }),
    recurringStripe({ price: "price_wrong" }),
  ]) {
    const state = await billingTestables.paidSubscriptionState(
      stripe,
      "sub_mock",
      expected,
    );
    assert.equal(state.paid, false);
  }
  const expired = await billingTestables.paidSubscriptionState(
    recurringStripe({ periodEnd: 100 }),
    "sub_mock",
    expected,
  );
  assert.equal(expired.paid, true);
  assert.equal(
    billingTestables.paidStateIsCurrent(
      expired.paid,
      expired.validUntil,
      new Date(101_000),
    ),
    false,
  );
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