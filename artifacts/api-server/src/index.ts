import app from "./app";
import { logger } from "./lib/logger";
import { seedIfEmpty, seedReasoningPrimersIfMissing } from "./lib/seed";
import { seedDiagnosticsIfEmpty } from "./lib/seedDiagnostics";
import { storage } from "./storage";
import { provisionAccessSchema } from "./lib/access";
import { provisionBillingSchema } from "./routes/billing";
import { setDatabaseReady } from "./lib/readiness";
import { setTimeout as delay } from "node:timers/promises";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initializeDatabase(): Promise<void> {
  let attempt = 0;
  for (;;) {
    try {
      await storage.ensureUniqueVisitorsTable();
      await provisionAccessSchema();
      await provisionBillingSchema();
      await seedIfEmpty();
      await seedReasoningPrimersIfMissing();
      await seedDiagnosticsIfEmpty();
      setDatabaseReady(true);
      logger.info("Database ready; course API requests are enabled");
      return;
    } catch (err) {
      setDatabaseReady(false);
      const retryDelayMs = Math.min(5_000 * 2 ** Math.min(attempt++, 4), 60_000);
      logger.error(
        { err, retryDelayMs },
        "Database initialization failed; health checks remain available and initialization will retry",
      );
      await delay(retryDelayMs);
    }
  }
}

// Open the HTTP listener first: Replit's startup probe must work even while
// the database is waking up or unavailable. Course requests remain gated.
app.listen(port, "0.0.0.0", (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  void initializeDatabase();
});
