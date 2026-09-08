---
name: Stripe payment reconciliation
description: Why payment verification must recover completed purchases and serialize current Stripe reads rather than trust event arrival order.
---

Treat a failed payment lookup as an unknown payment state, not a failed charge. Reconcile an existing completed Checkout or block another purchase; never create a replacement just because the local entitlement is missing.

**Why:** Stripe accepted charges while the app's subscription lookup exceeded Stripe's four-level expansion limit. Verification and webhook processing both failed, and the missing local entitlement allowed a second subscription.

**How to apply:** Keep expansions shallow, retrieve nested objects separately, and validate the actual verification helper with read-only provider requests when live examples exist. Never make a charge to test a repair. Refunds and duplicate-subscription cancellations require separate user approval.

Current-state reconciliation must serialize the entire provider-read → entitlement-write operation per account, across verification, checkout, access recovery, and webhooks.

**Why:** Fresh Stripe reads make delayed event payloads harmless, but an older in-flight read can still overwrite a newer observation without a shared lock. Conversely, event timestamp guards can permanently reject on-demand recovery, which has no event timestamp.

**How to apply:** Reuse the same transaction and per-account lock across nested reconciliation calls; acquiring a second connection's lock while holding the first can deadlock. Retain strict live payment, ownership, price, refund, and dispute checks.