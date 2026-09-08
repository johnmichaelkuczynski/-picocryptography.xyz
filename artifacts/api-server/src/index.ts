import app from "./app";
import { logger } from "./lib/logger";
import { seedIfEmpty, seedReasoningPrimersIfMissing } from "./lib/seed";
import { seedDiagnosticsIfEmpty } from "./lib/seedDiagnostics";
import { storage } from "./storage";
import { provisionAccessSchema } from "./lib/access";
import { provisionBillingSchema } from "./routes/billing";

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

async function start(): Promise<void> {
  try {
    await storage.ensureUniqueVisitorsTable();
    await provisionAccessSchema();
    await provisionBillingSchema();
    await seedIfEmpty();
    await seedReasoningPrimersIfMissing();
    await seedDiagnosticsIfEmpty();
  } catch (err) {
    logger.error({ err }, "Database readiness failed; server will not listen");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

void start();
