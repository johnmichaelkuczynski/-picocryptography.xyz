---
name: App access model
description: Owner mandate that the course has no login system, account controls, auth prompts, or AI usage gate.
---

# App access model

The course must have no login system at all. Every page and every AI-powered feature is public. Do not add sign-in/sign-out controls, account UI, authentication routes, login prompts, token allowances, or usage-based login gates.

**Why:** On 2026-08-22, the owner explicitly reversed the earlier metered Google-login policy and required all login to be removed.

**How to apply:** New pages and AI endpoints must work anonymously without authentication middleware. Keep public PDF/TXT downloads available. The PDF library must stay external in the server bundle or its font pipeline breaks at runtime.
