---
name: Startup liveness and database readiness
description: Startup health must stay available during database outages without presenting database-dependent course operations as ready.
---

Keep startup liveness independent of database initialization, sessions, and trial middleware. Database-dependent operations must fail explicitly until initialization succeeds, and failed initialization should retry without killing the HTTP listener.

**Why:** The user explicitly requires `/api` to answer HTTP 200 before the database is reachable. Waiting for database initialization before listening creates startup-probe failures, even when the database would recover moments later.

**How to apply:** Preserve the distinction between process liveness and course-data readiness. Verify cold-start behavior with an unreachable local fixture database, not by disconnecting or modifying production. Do not interpret normal pre-listener probe failures as proof of a SQL migration error.
