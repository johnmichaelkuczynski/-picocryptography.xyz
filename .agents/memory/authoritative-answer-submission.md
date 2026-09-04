---
name: Authoritative answer submission
description: The invariant that prevents long assignment answers from being graded as empty or as an older prefix.
---

Assignment grading must treat the complete answer snapshot carried by the submit request as authoritative. Persist that exact snapshot before loading answers for grading. Autosave may improve navigation or recovery, but grading must never depend on autosave completion order.

**Why:** Fire-and-forget saves can finish out of order, and submit can reach the server before the final save. That race caused five-paragraph responses to be graded as empty or as a short earlier prefix even though the textarea visibly contained the full answer.

**How to apply:** Any future assignment client or API change must keep full final answers in the submit payload, validate that the snapshot covers the assignment, persist it first, and preserve paragraph formatting in results. Test by pasting a marked multi-paragraph response and submitting immediately.