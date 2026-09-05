---
name: Authoritative answer submission
description: The invariant that prevents long assignment answers from being graded as empty or as an older prefix.
---

Assignment grading must treat the complete answer snapshot carried by the submit request as authoritative. Persist that exact snapshot before loading answers for grading. Autosave may improve navigation or recovery, but grading must never depend on autosave completion order.

Draft autosave and explicit grading are separate operations. Autosave persists and verifies the full snapshot without grading; the student's submit/continue action persists the same authoritative snapshot and requests immediate numeric grading. The client also keeps a local recovery copy and never replaces longer current text with a stale server response.

**Why:** Fire-and-forget saves can finish out of order, and submit can reach the server before the final save. That race caused five-paragraph responses to be graded as empty or as a short earlier prefix even though the textarea visibly contained the full answer.

**How to apply:** Any future assignment client or API change must keep full final answers in the submit payload, validate that the snapshot covers the assignment, persist it first, and preserve paragraph formatting in results. Test by saving a marked multi-paragraph response, reloading, comparing exact length/hash/text, and then requesting a numeric grade. Live diagnostics must be response-format-aware: generated prose cannot be submitted to an exact-choice item.