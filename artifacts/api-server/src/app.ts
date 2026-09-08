import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { setupAuth } from "./lib/auth";
import { csrfProtection, requireAdmin, trialGate } from "./lib/access";
import accessRouter from "./routes/access";
import {
  billingRouter,
  stripeWebhookHandler,
} from "./routes/billing";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = new Set([
  "https://picocryptography.xyz",
  "https://www.picocryptography.xyz",
  process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "",
  "http://localhost:5173",
  "http://localhost:5000",
].filter(Boolean));
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
  }),
);

// Stripe signature verification requires the untouched bytes and must precede
// JSON parsing, sessions, CSRF, and trial middleware.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

setupAuth(app);
app.use(csrfProtection);
app.use("/api", accessRouter);
app.use("/api/billing", billingRouter);
app.use("/api/admin", requireAdmin);
app.use("/api/diagnostics/reset", requireAdmin);
app.use("/api/diagnostics/system", requireAdmin);
app.use("/api/diagnostics/synthetic-run", requireAdmin);
app.use("/api/diagnostics/quality-control", requireAdmin);
app.use("/api/diagnostics/expand-lectures", requireAdmin);
app.use(trialGate);
app.use("/api", router);

// In production, serve the built qr-course frontend from the same process.
// On Replit the deploy sidecar handles this; on Render (single web service)
// the API server serves both /api and the static SPA.
if (process.env.NODE_ENV === "production") {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/qr-course/dist/public"),
    path.resolve(process.cwd(), "../qr-course/dist/public"),
    path.resolve(process.cwd(), "../../artifacts/qr-course/dist/public"),
  ];
  const staticDir = candidates.find((p) => fs.existsSync(p));

  if (staticDir) {
    const indexHtml = path.join(staticDir, "index.html");
    logger.info({ staticDir }, "Serving qr-course static bundle");
    app.use(express.static(staticDir, { index: false }));
    app.get(/^\/(?!api\/).*/, (_req, res, next) => {
      if (!fs.existsSync(indexHtml)) return next();
      res.sendFile(indexHtml);
    });
  } else {
    logger.warn(
      { tried: candidates },
      "qr-course static bundle not found; only /api will be served",
    );
  }
}

export default app;
