---
name: App auth model (none)
description: The course app has NO authentication at all — login was deliberately ripped out at user request
---

# The app is intentionally unauthenticated

On 2026-07-05 the user demanded "RIP OUT ALL EXISTING LOGIN" (they have a follow-up plan requiring no login). Clerk was removed entirely: no ClerkProvider, no sign-in/sign-up routes, no protected-route HOC, no server-side clerkMiddleware or FAPI proxy middleware, and `@clerk/*` + `http-proxy-middleware` deps were dropped from both artifacts.

**Why:** explicit user mandate. Even before removal the API had no per-route server authz (single-user app; Clerk gating was frontend-only), so nothing server-side lost protection.

**How to apply:**
- `/` renders the Landing page directly; its CTA links straight to `/dashboard`. Every route is public by design — do not "fix" this.
- "Admin mode" + `skipDetection` remain client-side `localStorage` flags, not a trust boundary — unchanged and intentional.
- Do NOT re-add any login/auth without an explicit user request; the user's plan requires login to be absent.
- The old clerk-wouter-auth memory was retired; don't resurrect its patterns unless auth returns.
