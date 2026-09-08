import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { sql } from "drizzle-orm";
import type { SessionData } from "express-session";
import { db } from "@workspace/db";
import { hasPaidAccess } from "../routes/billing";
import { signedInLimitsAtFirstLogin } from "./trial-policy";

export const GUEST_SECONDS_LIMIT = 180;
export const GUEST_ACTIONS_LIMIT = 3;
// Authenticated users retain the guest preview and receive this additional
// allowance, so the exposed cumulative limits are 180+600 and 3+10.
export const USER_SECONDS_GRANT = 600;
export const USER_ACTIONS_GRANT = 10;

declare module "express-session" {
  interface SessionData {
    ownerId?: string;
    csrfToken?: string;
    authReturnTo?: string;
    accessUserId?: number;
  }
}

export type AccessIdentity = { userId: number | null; ownerId: string };
export type AccessStage =
  | "guest"
  | "free"
  | "login_required"
  | "payment_required"
  | "paid";

function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

const identitySessions = new WeakMap<AccessIdentity, SessionData>();

export function getAccessIdentity(req: Request): AccessIdentity {
  if (!req.session) throw new Error("Session middleware is required");
  const userId = req.user?.id ?? null;
  if (
    (userId == null && req.session.accessUserId != null) ||
    (userId != null &&
      req.session.accessUserId != null &&
      req.session.accessUserId !== userId)
  ) {
    req.session.ownerId = newToken(24);
  }
  req.session.ownerId ||= newToken(24);
  req.session.accessUserId = userId ?? undefined;
  const identity = {
    userId,
    ownerId: req.session.ownerId,
  };
  identitySessions.set(identity, req.session);
  return identity;
}

export function rotateAccessOwner(req: Request): AccessIdentity {
  req.session.ownerId = newToken(24);
  req.session.accessUserId = req.user?.id;
  return getAccessIdentity(req);
}

export function getCsrfToken(req: Request): string {
  req.session.csrfToken ||= newToken();
  return req.session.csrfToken;
}

type Usage = { activeSeconds: number; actionsUsed: number };

async function ensureUsage(identity: AccessIdentity): Promise<void> {
  await db.execute(sql`
    insert into trial_usage (owner_id, user_id)
    values (${identity.ownerId}, ${identity.userId})
    on conflict (owner_id) do nothing
  `);
  const existing = await db.execute(sql`
    select user_id from trial_usage where owner_id = ${identity.ownerId}
  `);
  const boundUser = (existing.rows[0] as { user_id: number | null }).user_id;
  const compatible =
    boundUser === identity.userId ||
    (boundUser == null && identity.userId != null);
  if (!compatible) {
    // A stale or switched-account session must never inherit the old owner's
    // records. Rotate both the in-flight identity and its persisted session.
    identity.ownerId = newToken(24);
    const sessionData = identitySessions.get(identity);
    if (sessionData) sessionData.ownerId = identity.ownerId;
    await db.execute(sql`
      insert into trial_usage (owner_id, user_id)
      values (${identity.ownerId}, ${identity.userId})
      on conflict (owner_id) do nothing
    `);
    return;
  }
  if (boundUser == null && identity.userId != null) {
    await db.execute(sql`
      update trial_usage set user_id = ${identity.userId}, updated_at = now()
      where owner_id = ${identity.ownerId} and user_id is null
    `);
  }
}

export async function getUsage(identity: AccessIdentity): Promise<Usage> {
  await ensureUsage(identity);
  const result = identity.userId == null
    ? await db.execute(sql`
        select active_seconds, actions_used from trial_usage
        where owner_id = ${identity.ownerId} and user_id is null
      `)
    : await db.execute(sql`
        select coalesce(sum(active_seconds), 0)::int as active_seconds,
               coalesce(sum(actions_used), 0)::int as actions_used
        from trial_usage where user_id = ${identity.userId}
      `);
  const row = result.rows[0] as
    | { active_seconds?: number | string; actions_used?: number | string }
    | undefined;
  return {
    activeSeconds: Number(row?.active_seconds ?? 0),
    actionsUsed: Number(row?.actions_used ?? 0),
  };
}

async function accountLimits(identity: AccessIdentity, usage: Usage) {
  if (identity.userId == null) {
    return {
      secondsLimit: GUEST_SECONDS_LIMIT,
      actionsLimit: GUEST_ACTIONS_LIMIT,
    };
  }
  const initialLimits = signedInLimitsAtFirstLogin(usage, {
    seconds: USER_SECONDS_GRANT,
    actions: USER_ACTIONS_GRANT,
  });
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${"trial-user:" + identity.userId}))`,
    );
    await tx.execute(sql`
      insert into trial_accounts (user_id, seconds_limit, actions_limit)
      values (
        ${identity.userId},
        ${initialLimits.secondsLimit},
        ${initialLimits.actionsLimit}
      )
      on conflict (user_id) do nothing
    `);
  });
  const result = await db.execute(sql`
    select seconds_limit, actions_limit from trial_accounts
    where user_id = ${identity.userId}
  `);
  const row = result.rows[0] as {
    seconds_limit: number | string;
    actions_limit: number | string;
  };
  return {
    secondsLimit: Number(row.seconds_limit),
    actionsLimit: Number(row.actions_limit),
  };
}

export async function getStage(
  identity: AccessIdentity,
): Promise<{ stage: AccessStage; usage: Usage; secondsLimit: number; actionsLimit: number }> {
  const usage = await getUsage(identity);
  const limits = await accountLimits(identity, usage);
  if (identity.userId != null && (await hasPaidAccess(identity.userId))) {
    return {
      stage: "paid",
      usage,
      ...limits,
    };
  }
  const loggedIn = identity.userId != null;
  const { secondsLimit, actionsLimit } = limits;
  const exhausted =
    usage.activeSeconds >= secondsLimit || usage.actionsUsed >= actionsLimit;
  return {
    stage: exhausted
      ? loggedIn
        ? "payment_required"
        : "login_required"
      : loggedIn
        ? "free"
        : "guest",
    usage,
    secondsLimit,
    actionsLimit,
  };
}

export async function mergeAnonymousIdentity(
  ownerId: string,
  userId: number,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${"trial-user:" + userId}))`,
    );
    const claimed = await tx.execute(sql`
      insert into trial_usage (owner_id, user_id)
      values (${ownerId}, ${userId})
      on conflict (owner_id) do update
        set user_id = ${userId}, updated_at = now()
        where trial_usage.user_id is null or trial_usage.user_id = ${userId}
      returning owner_id
    `);
    if (claimed.rows.length !== 1) return false;
    // Only records carrying this exact, server-issued owner id are transferred.
    await tx.execute(sql`update attempts set user_id = ${userId} where owner_id = ${ownerId} and user_id is null`);
    await tx.execute(sql`update practice_sessions set user_id = ${userId} where owner_id = ${ownerId} and user_id is null`);
    await tx.execute(sql`update diagnostic_attempts set user_id = ${userId} where owner_id = ${ownerId} and user_id is null`);
    const usage = await tx.execute(sql`
      select coalesce(sum(active_seconds), 0)::int as active_seconds,
             coalesce(sum(actions_used), 0)::int as actions_used
      from trial_usage where user_id = ${userId}
    `);
    const row = usage.rows[0] as {
      active_seconds: number | string;
      actions_used: number | string;
    };
    const limits = signedInLimitsAtFirstLogin(
      {
        activeSeconds: Number(row.active_seconds),
        actionsUsed: Number(row.actions_used),
      },
      { seconds: USER_SECONDS_GRANT, actions: USER_ACTIONS_GRANT },
    );
    // The signed-in stage always receives the full grant from the exact usage
    // inherited at first sign-in, including any heartbeat overage.
    await tx.execute(sql`
      insert into trial_accounts (user_id, seconds_limit, actions_limit)
      values (
        ${userId},
        ${limits.secondsLimit},
        ${limits.actionsLimit}
      )
      on conflict (user_id) do nothing
    `);
    return true;
  });
}

export async function chargeHeartbeat(identity: AccessIdentity): Promise<Usage> {
  await ensureUsage(identity);
  await db.execute(sql`
    update trial_usage
       set active_seconds = active_seconds +
             least(30, greatest(0, extract(epoch from (now() - coalesce(heartbeat_at, now())))::int)),
           heartbeat_at = now(),
           updated_at = now()
     where owner_id = ${identity.ownerId}
  `);
  return getUsage(identity);
}

function suppliedCsrf(req: Request): string {
  const value = req.get("X-CSRF-Token");
  return typeof value === "string" ? value : "";
}

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const expected = req.session?.csrfToken ?? "";
  const supplied = suppliedCsrf(req);
  const valid =
    expected.length > 0 &&
    supplied.length === expected.length &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!valid) {
    res.status(403).json({ error: "Invalid CSRF token", code: "CSRF_INVALID" });
    return;
  }
  next();
};

function isDraftSave(req: Request): boolean {
  return (
    req.method === "PUT" &&
    /^\/api\/assignments\/attempts\/\d+\/answer$/.test(req.path) &&
    req.body?.gradeNow !== true
  );
}

function isExempt(req: Request): boolean {
  return (
    req.path === "/api/healthz" ||
    req.path.startsWith("/api/auth/") ||
    req.path === "/api/access" ||
    req.path === "/api/access/heartbeat" ||
    req.path.startsWith("/api/billing") ||
    (req.method === "GET" &&
      /^\/api\/assignments\/attempts\/\d+$/.test(req.path)) ||
    isDraftSave(req)
  );
}

function isCostlyAction(req: Request): boolean {
  if (req.method === "GET") return /^\/api\/tutor\/suggestions\//.test(req.path);
  if (!["POST", "PUT", "DELETE"].includes(req.method)) return false;
  if (isDraftSave(req)) return false;
  return [
    /^\/api\/tutor\/ask$/,
    /^\/api\/detection\/scan$/,
    /^\/api\/practice\/sessions\/\d+\/(next|grade)$/,
    /^\/api\/assignments\/\d+\/practice$/,
    /^\/api\/practice\/assignment-sessions\/\d+\/grade$/,
    /^\/api\/assignments\/attempts\/\d+\/submit$/,
    /^\/api\/assignments\/attempts\/\d+\/answer$/,
    /^\/api\/reasoning\/assessments\/\d+\/(start|submit)$/,
    /^\/api\/course\/lectures\/\d+\/.+/,
    /^\/api\/analytics\/report$/,
    /^\/api\/diagnostics\/.+/,
    /^\/api\/admin\/.+/,
  ].some((pattern) => pattern.test(req.path));
}

async function reserveAction(identity: AccessIdentity, limit: number): Promise<boolean> {
  await ensureUsage(identity);
  return db.transaction(async (tx) => {
    const lockKey =
      identity.userId == null
        ? `trial-owner:${identity.ownerId}`
        : `trial-user:${identity.userId}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
    const result = await tx.execute(sql`
      update trial_usage
         set actions_used = actions_used + 1, updated_at = now()
       where owner_id = ${identity.ownerId}
         and (select coalesce(sum(actions_used), 0) from trial_usage
              where (${identity.userId}::int is not null and user_id = ${identity.userId})
                 or (${identity.userId}::int is null and user_id is null
                     and owner_id = ${identity.ownerId})) < ${limit}
      returning owner_id
    `);
    return result.rows.length === 1;
  });
}

async function refundAction(identity: AccessIdentity): Promise<void> {
  await db.execute(sql`
    update trial_usage set actions_used = greatest(0, actions_used - 1), updated_at = now()
    where owner_id = ${identity.ownerId}
  `);
}

function deny(res: Response, stage: AccessStage): void {
  const login = stage === "login_required";
  res.status(login ? 401 : 402).json({
    error: login ? "Google login required" : "Payment required",
    code: login ? "LOGIN_REQUIRED" : "PAYMENT_REQUIRED",
  });
}

export async function trialGate(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api/")) return next();
  if (isExempt(req)) return next();
  try {
    const identity = getAccessIdentity(req);
    const access = await getStage(identity);
    if (access.stage === "login_required" || access.stage === "payment_required") {
      deny(res, access.stage);
      return;
    }
    if (access.stage !== "paid" && isCostlyAction(req)) {
      const reserved = await reserveAction(identity, access.actionsLimit);
      if (!reserved) {
        deny(res, identity.userId == null ? "login_required" : "payment_required");
        return;
      }
      res.once("finish", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          void refundAction(identity);
        }
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function isAdminUser(req: Request): boolean {
  const allowlist = new Set(
    (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  const email = req.user?.email?.toLowerCase();
  return !!email && allowlist.has(email);
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (isAdminUser(req)) return next();
  res.status(403).json({ error: "Not authorized", code: "ADMIN_REQUIRED" });
};

export async function provisionAccessSchema(): Promise<void> {
  await db.execute(sql`
    create table if not exists trial_usage (
      owner_id text primary key,
      user_id integer references users(id) on delete cascade,
      active_seconds integer not null default 0 check (active_seconds >= 0),
      actions_used integer not null default 0 check (actions_used >= 0),
      heartbeat_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists trial_accounts (
      user_id integer primary key references users(id) on delete cascade,
      seconds_limit integer not null check (seconds_limit >= 0),
      actions_limit integer not null check (actions_limit >= 0),
      created_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`create index if not exists trial_usage_user_id_idx on trial_usage(user_id)`);
  await db.execute(sql`alter table attempts add column if not exists owner_id text`);
  await db.execute(sql`alter table attempts add column if not exists user_id integer references users(id) on delete cascade`);
  await db.execute(sql`alter table practice_sessions add column if not exists owner_id text`);
  await db.execute(sql`alter table practice_sessions add column if not exists user_id integer references users(id) on delete cascade`);
  await db.execute(sql`alter table diagnostic_attempts add column if not exists owner_id text`);
  await db.execute(sql`alter table diagnostic_attempts add column if not exists user_id integer references users(id) on delete cascade`);
  await db.execute(sql`create index if not exists attempts_identity_idx on attempts(owner_id, user_id)`);
  await db.execute(sql`create index if not exists practice_sessions_identity_idx on practice_sessions(owner_id, user_id)`);
  await db.execute(sql`create index if not exists diagnostic_attempts_identity_idx on diagnostic_attempts(owner_id, user_id)`);
}