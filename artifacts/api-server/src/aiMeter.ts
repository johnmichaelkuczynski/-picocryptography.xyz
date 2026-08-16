import type { RequestHandler } from "express";
import { storage } from "./storage";

// Anonymous visitors may generate roughly two paragraphs of AI output
// before being required to sign in with Google. Tokens are estimated as
// response characters / 4.
const ANON_TOKEN_LIMIT = 300;
// Reserved up front per request, reconciled to the actual response size.
const RESERVE_TOKENS = 150;

function getVisitorId(cookieHeader: string): string | undefined {
  const m = /(?:^|;\s*)bam_vid=([A-Za-z0-9-]{10,64})/.exec(cookieHeader);
  return m?.[1];
}

const loginRequired = {
  error: "login_required",
  message:
    "You've used the free preview. Sign in with Google to keep using the course.",
};

/**
 * Meters AI usage for signed-out visitors. Signed-in users pass through
 * untouched. Anonymous users are identified by the bam_vid cookie; once
 * their estimated generated-token total exceeds the limit, all further
 * POST/PUT/PATCH/DELETE requests on metered routers return 401
 * login_required. GET reads (lecture text, course structure) stay free.
 */
// GET endpoints that trigger AI generation (everything else that generates
// AI output is a write method). Paths are relative to the /api mount.
const AI_GET_PATHS = [/^\/tutor\/suggestions\//, /^\/diagnostics\/system$/];

export const meterAnonymousAI: RequestHandler = async (req, res, next) => {
  // The middleware is attached to several routers on the same stack; make
  // sure a single request is only checked/charged once.
  const flagged = req as typeof req & { __aiMetered?: boolean };
  if (flagged.__aiMetered) return next();
  flagged.__aiMetered = true;

  if (
    (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") &&
    !AI_GET_PATHS.some((r) => r.test(req.path))
  ) {
    return next();
  }
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    return next();
  }

  const visitorId = getVisitorId(req.headers.cookie ?? "");
  if (!visitorId) {
    // No visitor cookie (blocked or brand-new): can't meter, so require login.
    res.status(401).json(loginRequired);
    return;
  }

  // Atomically reserve an allowance up front. This both enforces the limit
  // under concurrent requests (the reservation is a single conditional
  // UPDATE) and rejects unregistered/forged visitor ids (no row → no
  // reservation → login required).
  let reserved = false;
  try {
    reserved = await storage.reserveAnonAiTokens(
      visitorId,
      RESERVE_TOKENS,
      ANON_TOKEN_LIMIT,
    );
  } catch (err) {
    console.error("AI meter reserve error:", err);
    return next(); // fail open on transient DB errors
  }

  if (!reserved) {
    res.status(401).json(loginRequired);
    return;
  }

  // Reconcile the reservation with the actual response size.
  const origJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    try {
      let actual: number;
      if (res.statusCode < 400) {
        const text =
          typeof body === "string" ? body : JSON.stringify(body ?? "");
        actual = Math.max(1, Math.ceil(text.length / 4));
      } else {
        actual = 0; // refund fully when the request errored before/at AI
      }
      const delta = actual - RESERVE_TOKENS;
      if (delta !== 0) {
        void storage.adjustAnonAiTokens(visitorId, delta).catch(() => {});
      }
    } catch {
      // never let metering break the response
    }
    return origJson(body as never);
  }) as typeof res.json;

  next();
};
