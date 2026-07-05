---
name: App auth model (Google OAuth, frontend-gated)
description: Course app uses the user's canonical Google OAuth server file; the whole course is gated behind sign-in on the FRONTEND only
---

# Auth model: Google OAuth, frontend gating

History: Clerk was ripped out on user demand (2026-07-05), then replaced the same day with the user's own canonical `server/auth.ts` (Google OAuth + passport + connect-pg-simple sessions), integrated verbatim into the API server. Later the same day the user demanded the course itself be login-gated: "THEY SIGN IN; THEN THEY SEE THE COURSE".

**Why:** explicit user mandates at each step. The canonical auth file must not be modified beyond the agreed adaptations (callback path, domains, logout return).

**How to apply:**
- Landing `/` is the ONLY public page. An `AuthGate` in the qr-course `App.tsx` blocks every other route behind Google sign-in; Landing CTAs point to login when signed out.
- Gating is FRONTEND-ONLY by established project model — course API routes have no per-route server authz. Only `/api/admin/visits` is server-guarded (isAdmin, ADMIN_EMAIL johnmichaelkuczynski@gmail.com). Do not add server-side gating without user request.
- "Admin mode" + `skipDetection` remain client-side localStorage flags, not a trust boundary — intentional.
- To test authenticated flows end-to-end without a browser login: insert a session row into `user_sessions` (sess JSON `{cookie:…, passport:{user:<id>}}`), sign the sid with HMAC-SHA256(SESSION_SECRET) as `connect.sid=s%3A<sid>.<sig>`, curl through `localhost:80`; clean up test rows after (real visits data must be preserved).
