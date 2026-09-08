import { Router, type Request, type RequestHandler, type Response } from "express";
import Stripe from "stripe";
import { pool } from "@workspace/db";
import type { PoolClient } from "pg";
import { getAccessIdentity } from "./access";
import { logger } from "./logger";

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

function safeStripeError(error: unknown) {
  const value = error as { type?: unknown; code?: unknown; param?: unknown; message?: unknown };
  const clean = (input: unknown) =>
    typeof input === "string"
      ? input
          .replace(/\b(?:cs|sub|pi|ch|cus|in|evt)_[A-Za-z0-9_]+\b/g, "[redacted-id]")
          .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
          .slice(0, 500)
      : undefined;
  return {
    type: clean(value.type) ?? error?.constructor?.name ?? "UnknownError",
    code: clean(value.code),
    param: clean(value.param),
    message: clean(value.message) ?? "Unknown billing error",
  };
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

async function lockBillingUser(client: PoolClient, userId: number): Promise<void> {
  await client.query("select pg_advisory_xact_lock($1, $2)", [714221, userId]);
}

async function resolvePaidAccessLocked(
  userId: number,
  client: PoolClient,
): Promise<boolean> {
  const result = await client.query<{
    paid: boolean;
    billing_mode: string | null;
    stripe_checkout_session_id: string | null;
    stripe_payment_intent_id: string | null;
    stripe_subscription_id: string | null;
    valid_until: Date | null;
  }>(
    `select paid, billing_mode, stripe_checkout_session_id,
            stripe_payment_intent_id, stripe_subscription_id, valid_until
       from billing_entitlements
      where user_id = $1`,
    [userId],
  );
  const entitlement = result.rows[0];
  const config = configured();
  if (!config) return false;
  const stripe = stripeFor(config);
  const expected = await loadPrice(config);
  let paid = false;
  let validUntil: Date | null = null;
  if (
    entitlement?.billing_mode === "recurring" &&
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
    entitlement?.billing_mode === "one_time" &&
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
        charge?.livemode &&
          charge.paid &&
          !charge.refunded &&
          charge.amount_refunded === 0 &&
          !charge.disputed,
      );
  }
  if (entitlement && (entitlement.stripe_subscription_id || entitlement.stripe_payment_intent_id)) {
    await client.query(
      `update billing_entitlements
          set paid = $2, valid_until = $3, updated_at = now()
        where user_id = $1`,
      [userId, paid, validUntil],
    );
  }
  if (paidStateIsCurrent(paid, validUntil)) return true;

  // A paid redirect may arrive before its webhook. Also recover rows left in
  // pending state by a prior reconciliation failure without asking the user to
  // purchase again.
  const pending = await client.query<{ stripe_checkout_session_id: string }>(
    `select stripe_checkout_session_id from billing_checkout_sessions
      where user_id = $1 and stripe_price_id = $2`,
    [userId, config.priceId],
  );
  const recoverId =
    pending.rows[0]?.stripe_checkout_session_id ??
    entitlement?.stripe_checkout_session_id;
  if (!recoverId) return false;
  const session = await assertOwnedSession(stripe, recoverId, userId);
  if (session.status !== "complete" || session.payment_status !== "paid") return false;
  const granted = await persistSessionGrant(session, userId, expected, 0, client);
  return granted;
}

async function resolvePaidAccess(
  userId: number,
  transaction?: PoolClient,
): Promise<boolean> {
  if (transaction) return resolvePaidAccessLocked(userId, transaction);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await lockBillingUser(client, userId);
    const paid = await resolvePaidAccessLocked(userId, client);
    await client.query("commit");
    return paid;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function hasPaidAccess(userId: number): Promise<boolean> {
  try {
    return await resolvePaidAccess(userId);
  } catch (error) {
    logger.error(
      { operation: "paid_access_refresh", stripeError: safeStripeError(error) },
      "Live billing state could not be refreshed",
    );
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
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 10,
  });
  session.line_items = lineItems;
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

type PendingCheckoutState =
  | "none"
  | "reusable"
  | "paid_complete"
  | "unreconciled"
  | "expired"
  | "read_error";

function pendingCheckoutState(
  session: Stripe.Checkout.Session,
  expected: PriceInfo,
  userId: number,
): Exclude<PendingCheckoutState, "none" | "read_error"> {
  if (session.status === "expired") return "expired";
  const items = session.line_items?.data ?? [];
  const exact =
    session.livemode &&
    session.client_reference_id === String(userId) &&
    session.metadata?.user_id === String(userId) &&
    session.mode ===
      (expected.price.type === "recurring" ? "subscription" : "payment") &&
    items.length === 1 &&
    items[0]?.price?.id === expected.price.id &&
    items[0]?.quantity === 1 &&
    session.currency === expected.currency &&
    session.amount_total === expected.amount;
  if (session.status === "open" && exact && typeof session.url === "string") {
    return "reusable";
  }
  if (
    session.status === "complete" &&
    exact &&
    session.payment_status === "paid"
  ) {
    return "paid_complete";
  }
  return "unreconciled";
}

function checkoutGuardAction(
  alreadyPaid: boolean,
  pending: PendingCheckoutState,
): "already_paid" | "reuse" | "recover" | "block" | "create" {
  if (alreadyPaid) return "already_paid";
  if (pending === "reusable") return "reuse";
  if (pending === "paid_complete") return "recover";
  if (pending === "unreconciled" || pending === "read_error") return "block";
  return "create";
}

function paidStateIsCurrent(
  paid: boolean,
  validUntil: Date | null,
  now = new Date(),
): boolean {
  return paid && (validUntil == null || validUntil > now);
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
  checkoutGuardAction,
  lockBillingUser,
  paidSubscriptionState,
  paidStateIsCurrent,
  pendingCheckoutState,
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
  // Keep expansions shallow. Stripe rejects the formerly used nested
  // latest_invoice.lines.data.pricing.price_details.price expansion.
  const sub = await stripe.subscriptions.retrieve(id);
  if (!sub.livemode) return { paid: false, validUntil: null };
  const item = sub.items.data.find((entry) => entry.price.id === expected.price.id);
  const invoiceId =
    typeof sub.latest_invoice === "string"
      ? sub.latest_invoice
      : sub.latest_invoice?.id;
  const invoice = invoiceId ? await stripe.invoices.retrieve(invoiceId) : null;
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
      limit: 10,
    });
    for (const payment of payments.data) {
      const intent = payment.payment.payment_intent;
      const intentId = typeof intent === "string" ? intent : intent?.id;
      if (!intentId) continue;
      const currentIntent = await stripe.paymentIntents.retrieve(intentId, {
        expand: ["latest_charge"],
      });
      const charge =
        currentIntent.latest_charge &&
        typeof currentIntent.latest_charge !== "string"
          ? currentIntent.latest_charge
          : currentIntent.latest_charge
            ? await stripe.charges.retrieve(currentIntent.latest_charge)
            : null;
      if (
        payment.livemode &&
        currentIntent.livemode &&
        currentIntent.status === "succeeded" &&
        currentIntent.amount_received === expected.amount &&
        currentIntent.currency === expected.currency &&
        payment.amount_paid === expected.amount &&
        payment.currency === expected.currency &&
        charge?.livemode &&
        charge.paid &&
        !charge.refunded &&
        charge.amount_refunded === 0 &&
        !charge.disputed
      ) {
        paymentStillGood = true;
        break;
      }
    }
  }
  const statusAllowsAccess = sub.status === "active" || sub.status === "past_due";
  const paid =
    Boolean(item) &&
    item?.quantity === 1 &&
    Boolean(paidLine) &&
    paidLine?.quantity === 1 &&
    paymentStillGood &&
    invoice?.livemode === true &&
    invoice?.status === "paid" &&
    invoice.amount_paid === expected.amount &&
    invoice.currency === expected.currency &&
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
  if (transaction) {
    return persistSessionGrantLocked(
      session,
      userId,
      expected,
      eventCreated,
      transaction,
    );
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    await lockBillingUser(client, userId);
    const granted = await persistSessionGrantLocked(
      session,
      userId,
      expected,
      eventCreated,
      client,
    );
    await client.query("commit");
    return granted;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function persistSessionGrantLocked(
  session: Stripe.Checkout.Session,
  userId: number,
  expected: PriceInfo,
  eventCreated: number,
  client: PoolClient,
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
         updated_at = now()`,
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
  return true;
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
    await lockBillingUser(client, userId);
    const session = await assertOwnedSession(stripe, incoming.id, userId);
    const granted = await persistSessionGrant(
      session,
      userId,
      expected,
      event.created,
      client,
    );
    if (session.payment_status === "paid" && !granted) {
      throw new Error("Paid Checkout session could not be reconciled");
    }
    return;
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const incoming = object as Stripe.Checkout.Session;
    const eventUserId = await userIdForSession(incoming);
    const storedOwner = eventUserId == null
      ? await client.query<{ user_id: number }>(
          "select user_id from billing_entitlements where stripe_checkout_session_id = $1",
          [incoming.id],
        )
      : null;
    const userId = eventUserId ?? storedOwner?.rows[0]?.user_id;
    if (userId == null) return;
    await lockBillingUser(client, userId);
    const session = await assertOwnedSession(stripe, incoming.id, userId);
    if (session.payment_status === "paid") {
      const granted = await persistSessionGrant(
        session,
        userId,
        expected,
        event.created,
        client,
      );
      if (!granted) throw new Error("Paid Checkout session could not be reconciled");
      return;
    }
    await client.query(
      `update billing_entitlements set paid = false, updated_at = now(),
         source_event_created = greatest(source_event_created, $2)
       where stripe_checkout_session_id = $1`,
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
    const owner = await client.query<{ user_id: number }>(
      "select user_id from billing_entitlements where stripe_subscription_id = $1",
      [incomingId],
    );
    const ownerId = owner.rows[0]?.user_id;
    if (ownerId == null) return;
    await lockBillingUser(client, ownerId);
    const state = await paidSubscriptionState(stripe, incomingId, expected);
    await client.query(
      `update billing_entitlements
          set paid = $2, valid_until = $3, updated_at = now(),
              source_event_created = greatest(source_event_created, $4)
        where stripe_subscription_id = $1`,
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
    // Event payload fields are used only to locate the owning user. After the
    // user lock is held, the Charge is retrieved again for the state decision.
    const initialCharge =
      event.type === "charge.refunded"
        ? (object as Stripe.Charge)
        : await stripe.charges.retrieve(chargeId);
    const initialPi = paymentIntentId(initialCharge.payment_intent);
    const initialCustomer = customerId(initialCharge.customer);
    const owner = await client.query<{ user_id: number }>(
      `select user_id from billing_entitlements
        where stripe_payment_intent_id = $1
       union
       select user_id from billing_customers where stripe_customer_id = $2
       limit 1`,
      [initialPi, initialCustomer],
    );
    const ownerId = owner.rows[0]?.user_id;
    if (ownerId == null) return;
    await lockBillingUser(client, ownerId);
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
          and billing_mode = 'one_time'`,
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
          where stripe_subscription_id = $1`,
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
  const stripe = stripeFor(config);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.webhookSecret,
    );
  } catch (error) {
    logger.warn(
      { operation: "webhook_signature", stripeError: safeStripeError(error) },
      "Stripe webhook signature rejected",
    );
    sendError(res, 400, "INVALID_SIGNATURE", "Invalid Stripe signature");
    return;
  }
  if (!event.livemode) {
    sendError(res, 400, "NON_LIVE_EVENT", "Test-mode events are not accepted");
    return;
  }
  try {
    const expected = await loadPrice(config);
    await processWebhook(event, expected);
    res.json({ received: true });
  } catch (error) {
    logger.error(
      { operation: "webhook_processing", stripeError: safeStripeError(error) },
      "Stripe webhook processing failed and should be retried",
    );
    sendError(
      res,
      500,
      "WEBHOOK_PROCESSING_FAILED",
      "Webhook processing failed; retry is required",
    );
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
    await lockBillingUser(client, userId);
    // Unlike the public helper, checkout intentionally propagates Stripe
    // uncertainty so an upstream failure can never open another purchase.
    if (
      checkoutGuardAction(await resolvePaidAccess(userId, client), "none") ===
      "already_paid"
    ) {
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
      const existing = await assertOwnedSession(stripe, pendingId, userId);
      const pendingState = pendingCheckoutState(existing, expected, userId);
      const guard = checkoutGuardAction(false, pendingState);
      if (guard === "reuse") {
        await client.query("commit");
        res.json({ url: existing.url! });
        return;
      }
      if (guard === "recover") {
        const granted = await persistSessionGrant(
          existing,
          userId,
          expected,
          0,
          client,
        );
        await client.query("commit");
        if (granted) {
          res.status(409).json({
            error: "ALREADY_PAID",
            message: "Your completed payment was recovered; paid access is active",
            portal: "/api/billing/portal",
          });
        } else {
          res.status(409).json({
            error: "CHECKOUT_RECONCILIATION_REQUIRED",
            message: "A completed Checkout exists and must be reconciled before another purchase",
          });
        }
        return;
      }
      if (guard === "block") {
        await client.query("rollback");
        sendError(
          res,
          409,
          "PENDING_CHECKOUT_CONFLICT",
          "An existing Checkout must be resolved before another purchase",
        );
        return;
      }
      await client.query(
        "delete from billing_checkout_sessions where user_id = $1",
        [userId],
      );
    }
    if (checkoutGuardAction(false, "none") !== "create") {
      throw new Error("Checkout creation blocked by guard policy");
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
  } catch (error) {
    await client.query("rollback");
    logger.error(
      { operation: "checkout_start", stripeError: safeStripeError(error) },
      "Checkout creation or reconciliation failed",
    );
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
  const client = await pool.connect();
  try {
    await client.query("begin");
    await lockBillingUser(client, userId);
    const stripe = stripeFor(config);
    const expected = await loadPrice(config);
    const session = await assertOwnedSession(stripe, sessionId, userId);
    const granted = await persistSessionGrant(
      session,
      userId,
      expected,
      0,
      client,
    );
    if (!granted) {
      await client.query("commit");
      sendError(
        res,
        409,
        "PAYMENT_NOT_CONFIRMED",
        "Stripe does not currently confirm this payment as paid",
      );
      return;
    }
    await client.query("commit");
    res.json({ paid: true });
  } catch (error) {
    await client.query("rollback");
    logger.error(
      { operation: "checkout_verify", stripeError: safeStripeError(error) },
      "Checkout verification failed",
    );
    if (
      error instanceof Error &&
      (error.message === "INVALID_SESSION" ||
        error.message === "SESSION_NOT_OWNED")
    ) {
      sendError(res, 400, error.message, "Checkout session is invalid");
      return;
    }
    if (error instanceof Stripe.errors.StripeError) {
      sendError(
        res,
        502,
        "VERIFICATION_RETRYABLE",
        "Stripe verification is temporarily unavailable; retry without purchasing again",
      );
      return;
    }
    sendError(
      res,
      500,
      "VERIFICATION_RETRYABLE",
      "Payment verification could not complete; retry without purchasing again",
    );
  } finally {
    client.release();
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