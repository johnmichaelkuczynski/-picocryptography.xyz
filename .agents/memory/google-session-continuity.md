---
name: Google session continuity
description: Passport's implicit session rotation can lose anonymous work and return destinations before a Google-login callback reads them.
---

Capture anonymous ownership and the validated return destination before Passport completes login; let Passport rotate the session and restore only those safe values afterward. A switch between authenticated Google accounts must use a new anonymous ownership namespace, never transfer the previous account's work.

**Why:** Passport 0.7 regenerates the session during login. Reading ownership only in middleware after automatic authentication sees the new session rather than the guest session, losing the connection to saved drafts and checkout intent.

**How to apply:** Use a custom authentication callback and verify guest-to-account transfer, same-account reauthentication, and account switching separately. Session recovery must not weaken user-ID ownership predicates.