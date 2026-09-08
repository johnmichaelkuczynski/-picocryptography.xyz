---
name: App access model
description: Owner's staged Google-login/paywall policy and live-only Stripe constraint supersede the earlier public-only course.
---

# App access model

The course starts with limited anonymous use, then requires Google sign-in for additional free use, then requires payment. Payment remains available from the top-right at every stage. This replaces the previous public-only/no-login policy.

**Why:** On 2026-09-08, the owner explicitly requested staged access and supplied live Stripe credentials. They expressly prohibited Stripe sandbox/test setup and distinguished Google login from Replit login.

**How to apply:** Preserve the existing course UI and exact-answer recovery while enforcing usage and paid entitlement on the server. Use only live Stripe credentials and the supplied Price ID; never introduce sandbox fallback or perform real charges as tests. Do not reintroduce Replit sign-in. The existing Google identity/storage infrastructure is reused rather than activating the unused Clerk credentials.
