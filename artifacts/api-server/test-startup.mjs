import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

// Exercise the production bundle against an intentionally unreachable local
// database. Never connect to or modify a development/production database.
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));

const child = spawn(process.execPath, ["dist/index.mjs"], {
  cwd: fileURLToPath(new URL(".", import.meta.url)),
  env: {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(port),
    DATABASE_URL: "postgresql://startup_fixture:unused@127.0.0.1:1/unavailable",
    DATABASE_SSL: "false",
    GOOGLE_CLIENT_ID: "startup-fixture",
    GOOGLE_CLIENT_SECRET: "startup-fixture",
    SESSION_SECRET: "startup-fixture-session-secret",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });
const exit = new Promise((resolve) => child.once("exit", resolve));

try {
  const origin = `http://127.0.0.1:${port}`;
  let root;
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(child.exitCode, null, "Server exited before answering liveness");
    try {
      root = await fetch(`${origin}/api`, { signal: AbortSignal.timeout(500) });
      break;
    } catch {
      await delay(100);
    }
  }
  assert.ok(root, "Server did not open its HTTP port");
  assert.equal(root.status, 200);
  assert.deepEqual(await root.json(), { status: "ok" });

  const health = await fetch(`${origin}/api/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });
  assert.equal(health.headers.has("set-cookie"), false);

  const course = await fetch(`${origin}/api/course/overview`);
  assert.equal(course.status, 503);
  assert.equal((await course.json()).error, "DATABASE_NOT_READY");
  assert.equal(course.headers.get("retry-after"), "5");

  // Verify that the failed initialization and its next retry neither kill
  // liveness nor accidentally enable database-dependent requests.
  for (let attempt = 0; attempt < 100 && !output.includes("initialization will retry"); attempt++) {
    await delay(50);
  }
  assert.ok(output.includes("initialization will retry"), "Initialization failure was not reported");
  await delay(5_300);
  assert.equal(child.exitCode, null);
  assert.equal((await fetch(`${origin}/api`)).status, 200);
  assert.equal((await fetch(`${origin}/api/access`)).status, 503);
  assert.ok(
    output.split("initialization will retry").length >= 3,
    "Database initialization did not retry",
  );
  console.log("PASS: /api and /api/healthz stay HTTP 200 with an unreachable database; course APIs return 503; initialization retries.");
} finally {
  child.kill("SIGTERM");
  await exit;
}
