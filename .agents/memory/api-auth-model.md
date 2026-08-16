---
name: App auth model
description: Access policy for the course app — public browsing with a metered anonymous AI preview; Google login enforced server-side, never by a frontend gate.
---

# App auth model

- OWNER MANDATE (reversal of the earlier "nothing visible without login" rule): NO frontend login wall. Every page, including lectures, is browsable signed-out.
- Anonymous visitors get a small free AI preview (~two paragraphs of generated output); once exhausted, AI-generating endpoints return 401 `login_required` and the client shows a dismissible Google sign-in prompt. Reading remains free.
- **Why:** owner wants crawlers to index content and visitors to try the app; login is forced only after real AI cost is incurred.
- **How to apply:** never reintroduce a blanket frontend auth gate. Any NEW AI-generating endpoint must be covered by the anonymous metering middleware — watch for AI work hidden behind GET routes, which default-skip the meter unless explicitly listed.
- A public course PDF download (no auth, no AI) is part of the marketing surface; the PDF library must stay external in the server bundle or its font pipeline breaks at runtime.
