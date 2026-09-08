import { Router, type Request, type RequestHandler, type Response } from "express";
import Stripe from "stripe";
import { pool } from "@workspace/db";
import type { PoolClient } from "pg";
import { getAccessIdentity } from "./access";

const APP_URL = "https://picocryptography.xyz";

type BillingConfig = {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  priceId: string;
};

type PriceInfo = {
  price: Stripe.Price;
  amount: number;
  currency: string;
  interval: string | null;
  intervalCount: number | null;
};

function validatedConfig(env: NodeJS.ProcessEnv): BillingConfig | null {
  const secretKey = env.STRIPE_SECRET_KEY ?? "";
  const publishableKey = env.STRIPE_PUBLISHABLE_KEY ?? "";
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET ?? "";
  const priceId = env.STRIPE_PRICE_ID ?? "";
  if (
    !secretKey.startsWith("sk_live_") ||
    !publishableKey.startsWith("pk_live_") ||
    !webhookSecret.startsWith("whsec_") ||
    !priceId
  ) {
    return null;
  }
  return { secretKey, publishableKey, webhookSecret, priceId };
}

function configured(): BillingConfig | null {
  return validatedConfig(process.env);
}

function stripeFor(config: BillingConfig): Stripe {
  return new Stripe(config.secretKey);
}

async function loadPrice(config: BillingConfig): Promise<PriceInfo> {
  const stripe = stripeFor(config);
  const price = await stripe.prices.retrieve(config.priceId, {
    expand: ["product"],
  });
  const product = price.product;
  if (
    !price.livemode ||
    !price.active ||
    price.unit_amount == null ||
    price.currency.length === 0 ||
    (typeof product !== "string" && "active" in product && !product.active)
  ) {
    throw new Error("The configured live price is not active and purchasable");
  }
  return {
    price,
    amount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval ?? null,
    intervalCount: price.recurring?.interval_count ?? null,
  };
}

function safeReturnTo(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  try {
    const parsed = new URL(value, APP_URL);
    return parsed.origin === APP_URL ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
  } catch {
    return null;
  }
}

function sendError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ error: code, message });
}

export async function provisionBillingSchema(): Promise<void> {
  await pool.query(`
    create table if not exists billing_customers (
      user_id integer primary key references users(id) on delete cascade,
      stripe_customer_id text not null unique,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists billing_entitlements (
      user_id integer primary key references users(id) on delete cascade,
      paid boolean not null default false,
      billing_mode text,
      stripe_checkout_session_id text,
      stripe_payment_intent_id text,
      stripe_subscription_id text,
      valid_until timestamptz,
      source_event_created bigint not null default 0,
      updated_at timestamptz not null default now()
    );
    create unique index if not exists billing_entitlement_session_idx
      on billing_entitlements(stripe_checkout_session_id)
      where stripe_checkout_session_id is not null;
    create unique index if not exists billing_entitlement_subscription_idx
      on billing_entitlements(stripe_subscription_id)
      where stripe_subscription_id is not null;
    create table if not exists billing_webhook_events (
      event_id text primary key,
      event_type text not null,
      event_created bigint not null,
      processed_at timestamptz not null default now()
    );
    create table if not exists billing_checkout_sessions (
      user_id integer primary key references users(id) on delete cascade,
      stripe_checkout_session_id text not null unique,
      stripe_price_id text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
}

export async function hasPaidAccess(userId: number): Promise<boolean> {
  const result = await pool.query<{
    paid: boolean;
    billing_mode: string | null;
    stripe_payment_intent_id: string | null;
    stripe_subscription_id: string | null;
  }>(
    `select paid, billing_mode, stripe_payment_intent_id, stripe_subscription_id
       from billing_entitlements
      where user_id = $1
        and paid = true
        and (valid_until is null or valid_until > now())`,
    [userId],
  );
  const entitlement = result.rows[0];
  if (!entitlement?.paid) return false;
  const config = configured();
  if (!config) return false;
  try {
    const stripe = stripeFor(config);
    const expected = await loadPrice(config);
    let paid = false;
    let validUntil: Date | null = null;
    if (
      entitlement.billing_mode === "recurring" &&
      entitlement.stripe_subscription_id
    ) {
      const state = await paidSubscriptionState(
        stripe,
        entitlement.stripe_subscription_id,
        expected,
      );
      paid = state.paid;
      validUntil = state.validUntil;
    } else if (
      entitlement.billing_mode === "one_time" &&
      entitlement.stripe_payment_intent_id
    ) {
      const intent = await stripe.paymentIntents.retrieve(
        entitlement.stripe_payment_intent_id,
        { expand: ["latest_charge"] },
      );
      const charge =
        intent.latest_charge && typeof intent.latest_charge !== "string"
          ? intent.latest_charge
          : intent.latest_charge
            ? await stripe.charges.retrieve(intent.latest_charge)
            : null;
      paid =
        intent.livemode &&
        intent.status === "succeeded" &&
        intent.amount_received === expected.amount &&
        intent.currency === expected.currency &&
        Boolean(
          charge?.paid &&
            !charge.refunded &&
            charge.amount_refunded === 0 &&
            !charge.disputed,
        );
    }
    await pool.query(
      `update billing_entitlements
          set paid = $2, valid_until = $3, updated_at = now()
        where user_id = $1`,
      [userId, paid, validUntil],
    );
    return paid && (validUntil == null || validUntil > new Date());
  } catch {
    // Stripe is the source of truth. A stale database grant must not bypass the
    // gate when its live state cannot be verified.
    return false;
  }
}

async function linkedCustomer(userId: number): Promise<string | null> {
  const result = await pool.query<{ stripe_customer_id: string }>(
    "select stripe_customer_id from billing_customers where user_id = $1",
    [userId],
  );
  return result.rows[0]?.stripe_customer_id ?? null;
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

function subscriptionId(
  value: string | Stripe.Subscription | null,
): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

function paymentIntentId(
  value: string | Stripe.PaymentIntent | null,
): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function assertOwnedSession(
  stripe: Stripe,
  sessionId: string,
  userId: number,
): Promise<Stripe.Checkout.Session> {
  if (!sessionId.startsWith("cs_live_")) throw new Error("INVALID_SESSION");
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price", "subscription", "payment_intent"],
  });
  if (
    !session.livemode ||
    session.client_reference_id !== String(userId) ||
    session.metadata?.user_id !== String(userId)
  ) {
    throw new Error("SESSION_NOT_OWNED");
  }
  return session;
}

function sessionHasExpectedPayment(
  session: Stripe.Checkout.Session,
  expected: PriceInfo,
): boolean {
  const items = session.line_items?.data ?? [];
  const onlyItem = items.length === 1 ? items[0] : null;
  return (
    onlyItem?.price?.id === expected.price.id &&
    onlyItem.quantity === 1 &&
    session.currency === expected.currency &&
    session.amount_total === expected.amount &&
    session.payment_status === "paid"
  );
}

function periodEndForPrice(
  invoice: Stripe.Invoice,
  priceId: string,
): number | null {
  const line = invoice.lines.data.find((entry) => {
    const invoicePrice = entry.pricing?.price_details?.price;
    return (typeof invoicePrice === "string" ? invoicePrice : invoicePrice?.id) === priceId;
  });
  return line?.period.end ?? null;
}

function acceptsWebhookSignature(
  payload: Buffer,
  signature: string,
  secret: string,
): boolean {
  try {
    new Stripe("sk_live_signature_validation_only").webhooks.constructEvent(
      payload,
      signature,
      secret,
    );
    return true;
  } catch {
    return false;
  }
}

export const billingTestables = {
  acceptsWebhookSignature,
  periodEndForPrice,
  safeReturnTo,
  sessionHasExpectedPayment,
  validatedConfig,
};

async function paidSubscriptionState(
  stripe: Stripe,
  id: string,
  expected: PriceInfo,
): Promise<{ paid: boolean; validUntil: Date | null }> {
  const sub = await stripe.subscriptions.retrieve(id, {
    expand: ["latest_invoice.lines.data.pricing.price_details.price"],
  });
  if (!sub.livemode) return { paid: false, validUntil: null };
  const item = sub.items.data.find((entry) => entry.price.id === expected.price.id);
  const invoice =
    sub.latest_invoice && typeof sub.latest_invoice !== "string"
      ? sub.latest_invoice
      : null;
  const paidLine = invoice?.lines.data.find((line) => {
    const invoicePrice = line.pricing?.price_details?.price;
    return (
      (typeof invoicePrice === "string" ? invoicePrice : invoicePrice?.id) ===
      expected.price.id
    );
  });
  let paymentStillGood = false;
  if (invoice) {
    const payments = await stripe.invoicePayments.list({
      invoice: invoice.id,
      status: "paid",
      expand: ["data.payment.payment_intent.latest_charge"],
      limit: 10,
    });
    paymentStillGood = payments.data.some((payment) => {
      const intent = payment.payment.payment_intent;
      const charge =
        intent && typeof intent !== "string" ? intent.latest_charge : null;
      return (
        payment.livemode &&
        payment.amount_paid === expected.amount &&
        charge != null &&
        typeof charge !== "string" &&
        charge.paid &&
        !charge.refunded &&
        charge.amount_refunded === 0 &&
        !charge.disputed
      );
    });
  }
  const statusAllowsAccess = sub.status === "active" || sub.status === "past_due";
  const paid =
    Boolean(item) &&
    Boolean(paidLine) &&
    paymentStillGood &&
    invoice?.status === "paid" &&
    invoice.amount_paid === expected.amount &&
    statusAllowsAccess;
  const periodEnd = invoice
    ? periodEndForPrice(invoice, expected.price.id)
    : null;
  return {
    paid,
    validUntil: paid && periodEnd ? new Date(periodEnd * 1000) : null,
  };
}

async function persistSessionGrant(
  session: Stripe.Checkout.Session,
  userId: number,
  expected: PriceInfo,
  eventCreated: number,
  transaction?: PoolClient,
): Promise<boolean> {
  const config = configured();
  if (!config || !sessionHasExpectedPayment(session, expected)) return false;
  const stripe = stripeFor(config);
  const subId = subscriptionId(session.subscription);
  let validUntil: Date | null = null;
  if (expected.price.type === "recurring") {
    if (!subId) return false;
    const state = await paidSubscriptionState(stripe, subId, expected);
    if (!state.paid) return false;
    validUntil = state.validUntil;
  } else {
    const id = paymentIntentId(session.payment_intent);
    if (!id) return false;
    const intent = await stripe.paymentIntents.retrieve(id, {
      expand: ["latest_charge"],
    });
    const charge =
      intent.latest_charge && typeof intent.latest_charge !== "string"
        ? intent.latest_charge
        : intent.latest_charge
          ? await stripe.charges.retrieve(intent.latest_charge)
          : null;
    if (
      !intent.livemode ||
      intent.status !== "succeeded" ||
      intent.amount_received !== expected.amount ||
      intent.currency !== expected.currency ||
      !charge?.paid ||
      charge.refunded ||
      charge.amount_refunded !== 0 ||
      charge.disputed
    ) {
      return false;
    }
  }
  const custId = customerId(session.customer);
  const piId = paymentIntentId(session.payment_intent);
  const client = transaction ?? (await pool.connect());
  try {
    if (!transaction) await client.query("begin");
    if (custId) {
      await client.query(
        `insert into billing_customers(user_id, stripe_customer_id)
         values ($1, $2)
         on conflict (user_id) do update
           set stripe_customer_id = excluded.stripe_customer_id, updated_at = now()`,
        [userId, custId],
      );
    }
    await client.query(
      `insert into billing_entitlements(
         user_id, paid, billing_mode, stripe_checkout_session_id,
         stripe_payment_intent_id, stripe_subscription_id, valid_until,
         source_event_created, updated_at
       ) values ($1, true, $2, $3, $4, $5, $6, $7, now())
       on conflict (user_id) do update set
         paid = excluded.paid,
         billing_mode = excluded.billing_mode,
         stripe_checkout_session_id = excluded.stripe_checkout_session_id,
         stripe_payment_intent_id = excluded.stripe_payment_intent_id,
         stripe_subscription_id = excluded.stripe_subscription_id,
         valid_until = excluded.valid_until,
         source_event_created = greatest(
           billing_entitlements.source_event_created,
           excluded.source_event_created
         ),
         updated_at = now()
       where billing_entitlements.source_event_created <= excluded.source_event_created`,
      [
        userId,
        expected.price.type,
        session.id,
        piId,
        subId,
        validUntil,
        eventCreated,
      ],
    );
    await client.query(
      `delete from billing_checkout_sessions
        where user_id = $1 and stripe_checkout_session_id = $2`,
      [userId, session.id],
    );
    if (!transaction) await client.query("commit");
    return true;
  } catch (error) {
    if (!transaction) await client.query("rollback");
    throw error;
  } finally {
    if (!transaction) client.release();
  }
}

async function userIdForSession(session: Stripe.Checkout.Session): Promise<number | null> {
  const raw = session.metadata?.user_id ?? session.client_reference_id;
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  return Number(raw);
}

async function reconcileWebhook(
  event: Stripe.Event,
  expected: PriceInfo,
  client: PoolClient,
): Promise<void> {
  const config = configured();
  if (!config) throw new Error("Billing is not configured");
  const stripe = stripeFor(config);
  const object = event.data.object;

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const incoming = object as Stripe.Checkout.Session;
    const userId = await userIdForSession(incoming);
    if (!userId) return;
    const session = await assertOwnedSession(stripe, incoming.id, userId);
    await persistSessionGrant(session, userId, expected, event.created, client);
    return;
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = await stripe.checkout.sessions.retrieve(
      (object as Stripe.Checkout.Session).id,
    );
    await client.query(
      `update billing_entitlements set paid = false, updated_at = now(),
         source_event_created = greatest(source_event_created, $2)
       where stripe_checkout_session_id = $1 and source_event_created <= $2`,
      [session.id, event.created],
    );
    return;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted" ||
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_failed"
  ) {
    const invoiceParent = (object as Stripe.Invoice).parent;
    const incomingId = event.type.startsWith("invoice.")
      ? subscriptionId(invoiceParent?.subscription_details?.subscription ?? null)
      : (object as Stripe.Subscription).id;
    if (!incomingId) return;
    const state = await paidSubscriptionState(stripe, incomingId, expected);
    await client.query(
      `update billing_entitlements
          set paid = $2, valid_until = $3, updated_at = now(),
              source_event_created = greatest(source_event_created, $4)
        where stripe_subscription_id = $1 and source_event_created <= $4`,
      [incomingId, state.paid, state.validUntil, event.created],
    );
    return;
  }

  if (
    event.type === "charge.refunded" ||
    event.type === "charge.dispute.created" ||
    event.type === "charge.dispute.closed"
  ) {
    const disputeCharge =
      event.type === "charge.refunded" ? null : (object as Stripe.Dispute).charge;
    const chargeId =
      event.type === "charge.refunded"
        ? (object as Stripe.Charge).id
        : typeof disputeCharge === "string"
          ? disputeCharge
          : disputeCharge?.id ?? null;
    if (!chargeId) return;
    const charge = await stripe.charges.retrieve(chargeId);
    if (!charge.livemode) throw new Error("Non-live charge");
    const piId = paymentIntentId(charge.payment_intent);
    if (!piId) return;
    const disputed =
      typeof charge.disputed === "boolean" ? charge.disputed : false;
    const paid = charge.paid && !charge.refunded && charge.amount_refunded === 0 && !disputed;
    await client.query(
      `update billing_entitlements
          set paid = $2, updated_at = now(),
              source_event_created = greatest(source_event_created, $3)
        where stripe_payment_intent_id = $1
          and billing_mode = 'one_time'
          and source_event_created <= $3`,
      [piId, paid, event.created],
    );
    const invoicePayments = await stripe.invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: piId },
      limit: 10,
    });
    for (const payment of invoicePayments.data) {
      const invoiceId =
        typeof payment.invoice === "string" ? payment.invoice : payment.invoice.id;
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const recurringId = subscriptionId(
        invoice.parent?.subscription_details?.subscription ?? null,
      );
      if (!recurringId) continue;
      const state = await paidSubscriptionState(stripe, recurringId, expected);
      await client.query(
        `update billing_entitlements
            set paid = $2, valid_until = $3, updated_at = now(),
                source_event_created = greatest(source_event_created, $4)
          where stripe_subscription_id = $1 and source_event_created <= $4`,
        [recurringId, state.paid, state.validUntil, event.created],
      );
    }
  }
}

async function processWebhook(event: Stripe.Event, expected: PriceInfo): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // Serializes concurrent deliveries of the same event without recording a
    // receipt until all entitlement changes are ready to commit atomically.
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      [event.id],
    );
    const duplicate = await client.query(
      "select 1 from billing_webhook_events where event_id = $1",
      [event.id],
    );
    if (duplicate.rowCount !== 0) {
      await client.query("rollback");
      return;
    }
    await reconcileWebhook(event, expected, client);
    await client.query(
      `insert into billing_webhook_events(event_id, event_type, event_created)
       values ($1, $2, $3)`,
      [event.id, event.type, event.created],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export const stripeWebhookHandler: RequestHandler = async (req, res) => {
  const config = configured();
  if (!config) {
    sendError(res, 503, "BILLING_UNAVAILABLE", "Live billing is not configured");
    return;
  }
  if (!Buffer.isBuffer(req.body)) {
    sendError(res, 400, "RAW_BODY_REQUIRED", "Webhook body must be raw");
    return;
  }
  const signature = req.header("stripe-signature");
  if (!signature) {
    sendError(res, 400, "INVALID_SIGNATURE", "Missing Stripe signature");
    return;
  }
  try {
    const stripe = stripeFor(config);
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.webhookSecret,
    );
    if (!event.livemode) {
      sendError(res, 400, "NON_LIVE_EVENT", "Test-mode events are not accepted");
      return;
    }
    const expected = await loadPrice(config);
    await processWebhook(event, expected);
    res.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Stripe.errors.StripeSignatureVerificationError
        ? "Invalid Stripe signature"
        : "Webhook processing failed";
    sendError(res, 400, "WEBHOOK_REJECTED", message);
  }
};

export const billingRouter = Router();

billingRouter.get("/config", async (_req, res) => {
  const config = configured();
  if (!config) {
    res.json({
      available: false,
      liveMode: false,
      price: null,
      error: "Live billing is not configured",
    });
    return;
  }
  try {
    const info = await loadPrice(config);
    res.json({
      available: true,
      liveMode: true,
      price: {
        amount: info.amount,
        currency: info.currency,
        interval: info.interval,
        intervalCount: info.intervalCount,
      },
    });
  } catch {
    res.json({
      available: false,
      liveMode: true,
      price: null,
      error: "The configured live price could not be validated",
    });
  }
});

billingRouter.get("/status", async (req, res) => {
  const { userId } = getAccessIdentity(req);
  res.json({ paid: userId == null ? false : await hasPaidAccess(userId) });
});

billingRouter.post("/checkout", async (req: Request, res: Response) => {
  const { userId } = getAccessIdentity(req);
  if (userId == null) {
    sendError(res, 401, "LOGIN_REQUIRED", "Google login is required");
    return;
  }
  const config = configured();
  if (!config) {
    sendError(res, 503, "BILLING_UNAVAILABLE", "Live billing is not configured");
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    // The transaction-scoped lock and persisted open session make concurrent
    // double-clicks for one user converge on the same Stripe Checkout URL.
    await client.query("select pg_advisory_xact_lock($1, $2)", [714221, userId]);
    if (await hasPaidAccess(userId)) {
      await client.query("rollback");
      res.status(409).json({
        error: "ALREADY_PAID",
        message: "Paid access is already active; use the billing portal to manage it",
        portal: "/api/billing/portal",
      });
      return;
    }
    const expected = await loadPrice(config);
    const stripe = stripeFor(config);
    const pending = await client.query<{ stripe_checkout_session_id: string }>(
      `select stripe_checkout_session_id
         from billing_checkout_sessions
        where user_id = $1 and stripe_price_id = $2`,
      [userId, config.priceId],
    );
    const pendingId = pending.rows[0]?.stripe_checkout_session_id;
    if (pendingId) {
      const existing = await stripe.checkout.sessions.retrieve(pendingId, {
        expand: ["line_items.data.price"],
      });
      const line = existing.line_items?.data;
      const exactPendingSession =
        existing.livemode &&
        existing.status === "open" &&
        existing.client_reference_id === String(userId) &&
        existing.metadata?.user_id === String(userId) &&
        existing.mode ===
          (expected.price.type === "recurring" ? "subscription" : "payment") &&
        line?.length === 1 &&
        line[0]?.price?.id === config.priceId &&
        line[0]?.quantity === 1 &&
        existing.currency === expected.currency &&
        existing.amount_total === expected.amount &&
        typeof existing.url === "string";
      if (exactPendingSession) {
        await client.query("commit");
        res.json({ url: existing.url });
        return;
      }
    }
    const existingCustomer = await linkedCustomer(userId);
    const returnTo = safeReturnTo(req.body?.returnTo);
    const session = await stripe.checkout.sessions.create({
      mode: expected.price.type === "recurring" ? "subscription" : "payment",
      line_items: [{ price: config.priceId, quantity: 1 }],
      client_reference_id: String(userId),
      metadata: {
        user_id: String(userId),
        ...(returnTo ? { return_to: returnTo } : {}),
      },
      ...(existingCustomer
        ? { customer: existingCustomer }
        : expected.price.type === "one_time"
          ? { customer_creation: "always" as const }
          : {}),
      success_url: `${APP_URL}/billing/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/billing/return?canceled=1`,
      allow_promotion_codes: false,
    });
    if (!session.url) throw new Error("No Checkout URL returned");
    await client.query(
      `insert into billing_checkout_sessions(
         user_id, stripe_checkout_session_id, stripe_price_id
       ) values ($1, $2, $3)
       on conflict (user_id) do update set
         stripe_checkout_session_id = excluded.stripe_checkout_session_id,
         stripe_price_id = excluded.stripe_price_id,
         updated_at = now()`,
      [userId, session.id, config.priceId],
    );
    await client.query("commit");
    res.json({ url: session.url });
  } catch {
    await client.query("rollback");
    sendError(res, 502, "CHECKOUT_FAILED", "Unable to start secure checkout");
  } finally {
    client.release();
  }
});

billingRouter.post("/verify", async (req, res) => {
  const { userId } = getAccessIdentity(req);
  if (userId == null) {
    sendError(res, 401, "LOGIN_REQUIRED", "Google login is required");
    return;
  }
  const sessionId = req.body?.sessionId;
  if (typeof sessionId !== "string") {
    sendError(res, 400, "INVALID_SESSION", "A Checkout session ID is required");
    return;
  }
  const config = configured();
  if (!config) {
    sendError(res, 503, "BILLING_UNAVAILABLE", "Live billing is not configured");
    return;
  }
  try {
    const stripe = stripeFor(config);
    const expected = await loadPrice(config);
    const session = await assertOwnedSession(stripe, sessionId, userId);
    await persistSessionGrant(
      session,
      userId,
      expected,
      0,
    );
    res.json({ paid: await hasPaidAccess(userId) });
  } catch {
    sendError(res, 400, "VERIFICATION_FAILED", "Payment could not be verified");
  }
});

billingRouter.post("/portal", async (req, res) => {
  const { userId } = getAccessIdentity(req);
  if (userId == null) {
    sendError(res, 401, "LOGIN_REQUIRED", "Google login is required");
    return;
  }
  const config = configured();
  if (!config) {
    sendError(res, 503, "BILLING_UNAVAILABLE", "Live billing is not configured");
    return;
  }
  const customer = await linkedCustomer(userId);
  if (!customer) {
    sendError(res, 404, "CUSTOMER_NOT_LINKED", "No billing account is linked");
    return;
  }
  try {
    const session = await stripeFor(config).billingPortal.sessions.create({
      customer,
      return_url: APP_URL,
    });
    res.json({ url: session.url });
  } catch {
    sendError(res, 502, "PORTAL_FAILED", "Unable to open the billing portal");
  }
});

export default billingRouter;