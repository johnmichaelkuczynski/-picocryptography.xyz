import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express, Request, RequestHandler } from "express";
import { pool } from "@workspace/db";
import { storage } from "../storage";
import {
  getAccessIdentity,
  getCsrfToken,
  mergeAnonymousIdentity,
  rotateAccessOwner,
} from "./access";
import { safeReturnTo } from "./auth-policy";
import { shouldReuseLoginOwner } from "./access-state";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      googleId: string | null;
      email: string | null;
      displayName: string | null;
    }
  }
}

const CALLBACK_PATH = "/api/auth/google/callback";
const PRODUCTION_ORIGIN = "https://picocryptography.xyz";

function clean(value: string | undefined): string {
  return (value ?? "").replace(/[\u00a0\u200b-\u200d\ufeff]/g, "").trim();
}

function callbackUrl(req?: Request): string {
  if (process.env.NODE_ENV === "production") {
    return `${clean(process.env.PUBLIC_APP_URL) || PRODUCTION_ORIGIN}${CALLBACK_PATH}`;
  }
  const trustedDevHost = clean(process.env.REPLIT_DEV_DOMAIN).toLowerCase();
  const host = clean(
    String(req?.headers["x-forwarded-host"] ?? req?.headers.host ?? "")
      .split(",")[0],
  ).toLowerCase();
  if (trustedDevHost && host === trustedDevHost) {
    return `https://${trustedDevHost}${CALLBACK_PATH}`;
  }
  return `http://localhost:${process.env.PORT || "5000"}${CALLBACK_PATH}`;
}

export function setupAuth(app: Express): void {
  if (
    process.env.NODE_ENV === "production" &&
    clean(process.env.PUBLIC_APP_URL) &&
    clean(process.env.PUBLIC_APP_URL) !== PRODUCTION_ORIGIN
  ) {
    throw new Error(`PUBLIC_APP_URL must be ${PRODUCTION_ORIGIN} in production`);
  }
  process.env.PUBLIC_APP_URL ||= PRODUCTION_ORIGIN;
  const clientID = clean(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = clean(process.env.GOOGLE_CLIENT_SECRET);
  if (!clientID || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  }
  const sessionSecret = clean(process.env.SESSION_SECRET);
  if (!sessionSecret) throw new Error("SESSION_SECRET is required");

  app.set("trust proxy", 1);
  const PgStore = connectPgSimple(session);
  app.use(
    session({
      name: "pico.sid",
      store: new PgStore({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production" || !!process.env.REPLIT_DEV_DOMAIN,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      done(null, await storage.getUserById(id));
    } catch (error) {
      done(error);
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: callbackUrl(),
        state: true,
        passReqToCallback: false,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value?.toLowerCase() ?? null;
          const emailVerified =
            (profile._json as { email_verified?: boolean } | undefined)
              ?.email_verified === true;
          const displayName = profile.displayName || null;
          let user = await storage.getUserByGoogleId(googleId);
          if (!user && email && emailVerified) {
            const emailUser = await storage.getUserByEmail(email);
            // A verified Google address may attach only to a legacy account
            // which has never been bound to a different Google subject.
            if (emailUser && emailUser.googleId == null) user = emailUser;
          }
          if (!user) {
            user = await storage.createUserWithGoogle({
              username: email?.split("@")[0] || `user_${googleId.slice(0, 8)}`,
              googleId,
              email,
              displayName,
            });
          } else {
            user = await storage.updateUserGoogle(user.id, { googleId, displayName });
          }
          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      },
    ),
  );

  app.get("/api/auth/google", (req, res, next) => {
    getAccessIdentity(req);
    getCsrfToken(req);
    req.session.authReturnTo = safeReturnTo(req.query.returnTo);
    passport.authenticate("google", {
      scope: ["email", "profile"],
      prompt: "select_account",
      callbackURL: callbackUrl(req),
    } as any)(req, res, next);
  });

  app.get(CALLBACK_PATH, (req, res, next) => {
    // Capture these from the state-bearing pre-login session. Supplying a
    // custom callback prevents Passport's authenticate middleware from logging
    // in (and rotating the session) before we have retained them.
    const oldOwner = getAccessIdentity(req).ownerId;
    const priorUserId = req.user?.id ?? null;
    const returnTo = safeReturnTo(req.session.authReturnTo);
    passport.authenticate(
      "google",
      {
        callbackURL: callbackUrl(req),
      } as any,
      (authError: unknown, user: Express.User | false | null) => {
        if (authError) {
          res.redirect("/?error=auth_failed");
          return;
        }
        if (!user) {
          res.redirect("/?error=auth_failed");
          return;
        }
        // Passport 0.7's req.login performs the security-mandated single
        // session regeneration. Restore only the retained safe values after it.
        req.login(user, async (loginError) => {
          if (loginError) return next(loginError);
          try {
            if (!shouldReuseLoginOwner(priorUserId, user.id)) {
              // Direct account switching is not an anonymous-data transfer.
              // Give the new account an unrelated owner namespace.
              rotateAccessOwner(req);
            } else {
              req.session.ownerId = oldOwner;
              req.session.accessUserId = user.id;
            }
            getCsrfToken(req);
            if (priorUserId == null) {
              const merged = await mergeAnonymousIdentity(oldOwner, user.id);
              if (!merged) rotateAccessOwner(req);
            }
            await storage.recordVisit(user.id, user.email);
            req.session.save((saveError) => {
              if (saveError) return next(saveError);
              res.redirect(returnTo);
            });
          } catch (mergeError) {
            next(mergeError);
          }
        });
      },
    )(req, res, next);
  });
}

export const logoutHandler: RequestHandler = (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    // Passport rotates the session during logout. Persist a fresh anonymous
    // owner in that new session; account counters remain attached to user_id.
    req.session.ownerId = undefined;
    req.session.csrfToken = undefined;
    getAccessIdentity(req);
    const csrfToken = getCsrfToken(req);
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      res.json({ success: true, csrfToken });
    });
  });
};