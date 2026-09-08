import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const directory = await mkdtemp(path.join(tmpdir(), "pico-billing-test-"));
const output = path.join(directory, "billing.test.cjs");

try {
  await build({
    entryPoints: [path.resolve("src/lib/billing.test.ts")],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "cjs",
    logLevel: "silent",
  });
  const result = spawnSync(process.execPath, ["--test", output], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}