---
name: connect-pg-simple in bundled servers
description: createTableIfMissing breaks under esbuild bundling; how the session store must be provisioned
---

Rule: when a server that uses `connect-pg-simple` with `createTableIfMissing: true` is bundled (esbuild), the store reads `table.sql` relative to `__dirname` — which becomes `dist/` — and every session save fails with ENOENT (surfacing as e.g. "Logout failed").

**Why:** hit this integrating the canonical Passport Google OAuth file; the table-existence check (`to_regclass`) runs first, so the bug only bites on a DB where the sessions table doesn't exist yet — easy to miss in dev, guaranteed on a fresh prod DB.

**How to apply:** the build script must copy `connect-pg-simple/table.sql` into the bundle output dir (done in the api-server build). If sessions ever fail again, check the table (`user_sessions`) exists and that `dist/table.sql` is present.
